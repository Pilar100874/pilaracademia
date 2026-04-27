import { useEffect, useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  Lock,
  Sparkles,
  Repeat,
  Shuffle,
  X,
  Save,
  Search,
  Users as UsersIcon,
  UserPlus,
  DoorOpen,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Equipment, ExerciseSequence, Student } from '@/hooks/useClinicData';
import type { Appointment } from '@/hooks/useAppointments';
import type { RecurringSchedule } from '@/hooks/useRecurringSchedules';

export interface SlotIdentity {
  scheduled_at: string;
  duration_minutes: number;
}

interface Room { id: string; name: string; capacity?: number | null }
interface BookableSlotLite { id: string; scheduled_at: string; duration_minutes: number; room_id?: string | null; capacity?: number | null; active?: boolean }

interface Props {
  open: boolean;
  onClose: () => void;
  /** Horário da aula (ex.: 08:00 do dia X). Todos os alunos com appointment/recurring nesse mesmo HH:mm aparecem. */
  slot: SlotIdentity | null;
  clinicId: string;
  userId: string;
  /** Aluno destacado (clicado pelo usuário) — entra como pré-selecionado */
  focusedStudentId?: string | null;
  /** Quando true, abre o popover de adicionar aluno automaticamente. */
  autoOpenAdd?: boolean;

  appointments: Appointment[];
  recurring: RecurringSchedule[];
  students: Student[];
  equipment: Equipment[];
  sequences: ExerciseSequence[];
  /** Salas da clínica para inferir capacidade do slot. */
  rooms?: Room[];
  /** Slots da grade para descobrir capacidade quando não há appointment ainda. */
  bookableSlots?: BookableSlotLite[];

  onSaved: () => void;
}

interface RowState {
  student_id: string;
  appointment_id: string | null;
  recurring_id: string | null;
  equipment_id: string;
  sequence_id: string;
  /** marca este aluno como "fixo no equipamento": bloqueia equipamento para os outros */
  lock_equipment: boolean;
  isProjected?: boolean;
}

export function SlotGradeDialog({
  open,
  onClose,
  slot,
  clinicId,
  userId,
  focusedStudentId,
  autoOpenAdd,
  appointments,
  recurring,
  students,
  equipment,
  sequences,
  rooms = [],
  bookableSlots = [],
  onSaved,
}: Props) {
  // Reúne os alunos do mesmo HH:mm do slot
  const slotDate = slot ? parseISO(slot.scheduled_at) : null;
  const hh = slotDate?.getHours() ?? 0;
  const mm = slotDate?.getMinutes() ?? 0;
  const dayISO = slotDate ? slotDate.toISOString().slice(0, 10) : '';

  const rowsInit = useMemo<RowState[]>(() => {
    if (!slot || !slotDate) return [];

    // 1. appointments do mesmo dia/hora
    const dayApps = appointments.filter((a) => {
      const d = parseISO(a.scheduled_at);
      return (
        d.toISOString().slice(0, 10) === dayISO &&
        d.getHours() === hh &&
        d.getMinutes() === mm
      );
    });
    const byStudent = new Map<string, RowState>();
    dayApps.forEach((a) => {
      byStudent.set(a.student_id, {
        student_id: a.student_id,
        appointment_id: a.id,
        recurring_id: null,
        equipment_id: a.equipment_id ?? '',
        sequence_id: (a as any).sequence_id ?? '',
        lock_equipment: !!a.equipment_id,
      });
    });

    // 2. recorrentes do mesmo dia da semana e hora
    const dow = slotDate.getDay();
    recurring
      .filter((r) => r.active && r.day_of_week === dow)
      .filter((r) => r.start_date <= dayISO)
      .filter((r) => {
        const [rh, rm] = r.start_time.split(':').map(Number);
        return rh === hh && rm === mm;
      })
      .forEach((r) => {
        if (byStudent.has(r.student_id)) return;
        const projected = !!(r.end_date && r.end_date < dayISO);
        byStudent.set(r.student_id, {
          student_id: r.student_id,
          appointment_id: null,
          recurring_id: r.id,
          equipment_id: r.equipment_id ?? '',
          sequence_id: '',
          lock_equipment: !!r.equipment_id,
          isProjected: projected,
        });
      });

    return Array.from(byStudent.values()).sort((a, b) => {
      const an = students.find((s) => s.id === a.student_id)?.full_name ?? '';
      const bn = students.find((s) => s.id === b.student_id)?.full_name ?? '';
      return an.localeCompare(bn);
    });
  }, [slot, slotDate, dayISO, hh, mm, appointments, recurring, students]);

  const [rows, setRows] = useState<RowState[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPropagate, setShowPropagate] = useState<{ row: RowState } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    if (open) {
      setRows(rowsInit);
      if (autoOpenAdd) setAddOpen(true);
      setStudentSearch('');
    }
  }, [open, rowsInit, autoOpenAdd]);

  // Descobre sala/capacidade do horário a partir de appointments existentes ou bookable_slot.
  const slotRoomInfo = useMemo(() => {
    if (!slot || !slotDate) return { roomId: null as string | null, capacity: null as number | null, roomName: null as string | null };
    // 1) appointment do mesmo dia/hora
    const appt = appointments.find((a) => {
      const d = parseISO(a.scheduled_at);
      return d.toISOString().slice(0, 10) === dayISO && d.getHours() === hh && d.getMinutes() === mm;
    }) as any;
    let roomId: string | null = appt?.room_id ?? null;
    let capacity: number | null = null;

    // 2) bookable_slot do mesmo horário
    const bs = (bookableSlots || []).find((b) => {
      if (b.active === false) return false;
      const d = parseISO(b.scheduled_at);
      return d.toISOString().slice(0, 10) === dayISO && d.getHours() === hh && d.getMinutes() === mm;
    });
    if (!roomId && bs?.room_id) roomId = bs.room_id;

    // 3) capacidade efetiva = MAIOR entre slot e sala (sala manda no limite real)
    const room = roomId ? rooms.find((r) => r.id === roomId) : null;
    const slotCap = bs?.capacity ?? null;
    const roomCap = room?.capacity ?? null;
    if (roomCap != null && slotCap != null) capacity = Math.max(roomCap, slotCap);
    else capacity = roomCap ?? slotCap;

    return { roomId, capacity, roomName: room?.name ?? null };
  }, [slot, slotDate, dayISO, hh, mm, appointments, bookableSlots, rooms]);

  if (!slot || !slotDate) return null;

  // Equipamentos travados por outros alunos do mesmo horário (lock_equipment + equipment_id setado)
  const lockedEquipmentIds = new Set(
    rows.filter((r) => r.lock_equipment && r.equipment_id).map((r) => r.equipment_id)
  );

  const updateRow = (idx: number, patch: Partial<RowState>) =>
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  // Sequências compatíveis: matching equipment_id ou equipment_type, ou sem equipamento (genéricas)
  const compatibleSequences = (equipmentId: string): ExerciseSequence[] => {
    if (!equipmentId) return sequences;
    const eq = equipment.find((e) => e.id === equipmentId);
    return sequences.filter((s) => {
      if (s.equipment_id && s.equipment_id === equipmentId) return true;
      if (!s.equipment_id && !s.equipment_type) return true; // genérica
      if (eq && s.equipment_type && s.equipment_type.toLowerCase() === eq.equipment_type.toLowerCase()) return true;
      return false;
    });
  };

  const studentName = (id: string) => students.find((s) => s.id === id)?.full_name || '—';

  // ===== Adicionar aluno =====
  const isFull = slotRoomInfo.capacity != null && rows.length >= slotRoomInfo.capacity;
  const presentIds = new Set(rows.map((r) => r.student_id));
  const availableStudents = students
    .filter((s) => (s as any).active !== false)
    .filter((s) => !presentIds.has(s.id))
    .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  const filteredStudents = availableStudents.filter((s) =>
    (s.full_name || '').toLowerCase().includes(studentSearch.trim().toLowerCase())
  );

  const addStudent = (studentId: string) => {
    if (isFull) {
      toast.error(`Sala lotada (${rows.length}/${slotRoomInfo.capacity}). Não é possível adicionar mais alunos.`);
      return;
    }
    if (presentIds.has(studentId)) {
      toast.info('Aluno já está nesta aula.');
      return;
    }
    setRows((rs) => [
      ...rs,
      {
        student_id: studentId,
        appointment_id: null,
        recurring_id: null,
        equipment_id: '',
        sequence_id: '',
        lock_equipment: false,
      },
    ]);
    setAddOpen(false);
    toast.success(`${studentName(studentId)} adicionado(a). Salve para confirmar.`);
  };

  const removeRow = (idx: number) => {
    const r = rows[idx];
    // Se é appointment já gravado, não remove aqui (precisa cancelamento próprio).
    if (r.appointment_id) {
      toast.info('Para remover um aluno já agendado, cancele a aula pelo card do horário.');
      return;
    }
    setRows((rs) => rs.filter((_, i) => i !== idx));
  };


  const materializeRow = async (r: RowState): Promise<string | null> => {
    if (r.appointment_id) return r.appointment_id;
    const { data, error } = await supabase
      .from('class_appointments')
      .insert({
        clinic_id: clinicId,
        student_id: r.student_id,
        equipment_id: r.equipment_id || null,
        instructor_id: userId,
        scheduled_at: slot.scheduled_at,
        duration_minutes: slot.duration_minutes,
        created_by: userId,
        recurring_schedule_id: r.recurring_id,
        room_id: slotRoomInfo.roomId ?? null,
      } as any)
      .select('id')
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    return data.id;
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Valida capacidade da sala
      if (slotRoomInfo.capacity != null && rows.length > slotRoomInfo.capacity) {
        toast.error(`Sala lotada: ${rows.length} alunos para capacidade de ${slotRoomInfo.capacity}. Remova alguém antes de salvar.`);
        setSaving(false);
        return;
      }
      // valida conflito de bloqueio: dois alunos com lock no mesmo equipamento → bloqueia
      const lockMap = new Map<string, string>();
      for (const r of rows) {
        if (r.lock_equipment && r.equipment_id) {
          if (lockMap.has(r.equipment_id)) {
            toast.error(
              `Conflito: ${studentName(lockMap.get(r.equipment_id)!)} e ${studentName(r.student_id)} querem o mesmo equipamento como fixo.`
            );
            setSaving(false);
            return;
          }
          lockMap.set(r.equipment_id, r.student_id);
        }
      }

      // salva cada linha
      let lastSavedRow: RowState | null = null;
      for (const r of rows) {
        // Materializa o appointment se ainda não existe (mesmo sem equip/seq, pra reservar a vaga)
        const apptId = await materializeRow(r);
        if (!apptId) continue;

        // cria prescrição se houver sequência
        let prescId: string | null = null;
        if (r.sequence_id) {
          const { data: presc, error: pErr } = await supabase
            .from('prescriptions')
            .insert({
              clinic_id: clinicId,
              student_id: r.student_id,
              sequence_id: r.sequence_id,
              context: 'in_class',
              scheduled_for: dayISO,
              created_by: userId,
            })
            .select('id')
            .single();
          if (!pErr) prescId = presc.id;
        }

        const patch: any = {
          equipment_id: r.equipment_id || null,
          sequence_id: r.sequence_id || null,
        };
        if (prescId) patch.prescription_id = prescId;
        await supabase.from('class_appointments').update(patch).eq('id', apptId);

        // notifica aluno se aplicável
        const stu = students.find((s) => s.id === r.student_id);
        if (stu?.user_id && r.sequence_id) {
          await supabase.from('notifications').insert({
            user_id: stu.user_id,
            clinic_id: clinicId,
            type: 'general',
            title: 'Grade da próxima aula está pronta',
            body: format(slotDate, "dd/MM 'às' HH:mm", { locale: ptBR }),
            link: '/meu-pilates',
          });
        }

        lastSavedRow = r;
      }

      toast.success('Grades salvas');
      onSaved();

      // se algum aluno foi salvo com equipamento + sequência, oferece propagação
      const candidate =
        rows.find((r) => r.student_id === focusedStudentId && r.equipment_id && r.sequence_id) ||
        lastSavedRow;
      if (candidate && candidate.equipment_id && candidate.sequence_id) {
        setShowPropagate({ row: candidate });
      } else {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <UsersIcon className="h-5 w-5 text-primary" />
              Alunos da aula · {format(slotDate, "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 -mt-1 flex-wrap">
            <div className="text-xs text-muted-foreground">
              Defina equipamento e sequência por aluno. Marque <strong>fixo</strong> para reservar o equipamento neste horário.
            </div>
            <div className="flex items-center gap-2">
              {slotRoomInfo.roomName && (
                <Badge variant="outline" className="gap-1 text-[11px]">
                  <DoorOpen className="h-3 w-3" />
                  {slotRoomInfo.roomName}
                </Badge>
              )}
              <Badge
                variant={isFull ? 'destructive' : 'secondary'}
                className="gap-1 text-[11px] tabular-nums"
                title={slotRoomInfo.capacity != null ? 'Alunos / capacidade da sala' : 'Sem capacidade definida'}
              >
                <UsersIcon className="h-3 w-3" />
                {rows.length}
                {slotRoomInfo.capacity != null ? ` / ${slotRoomInfo.capacity}` : ''}
              </Badge>
              <Popover open={addOpen} onOpenChange={setAddOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isFull || availableStudents.length === 0}
                    title={isFull ? 'Sala lotada' : 'Adicionar aluno a esta aula'}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Adicionar aluno
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="end" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <Command>
                    <CommandInput placeholder="Buscar aluno…" />
                    <CommandList>
                      <CommandEmpty>Nenhum aluno disponível.</CommandEmpty>
                      <CommandGroup>
                        {availableStudents.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={s.full_name || s.id}
                            onPointerDown={(e) => {
                              e.preventDefault();
                              addStudent(s.id);
                            }}
                            onSelect={() => addStudent(s.id)}
                          >
                            {s.full_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {isFull && (
            <div className="text-[11px] text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Sala lotada — para adicionar mais alunos aumente a capacidade da sala.
            </div>
          )}

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum aluno neste horário. Use <strong>Adicionar aluno</strong> acima.
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map((r, idx) => {
                const compat = compatibleSequences(r.equipment_id);
                const focused = r.student_id === focusedStudentId;
                return (
                  <div
                    key={r.student_id}
                    className={cn(
                      'rounded-xl border p-3 space-y-2',
                      focused && 'border-primary/60 bg-primary/5',
                      r.isProjected && 'border-dashed border-amber-500/50 bg-amber-500/5'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-medium flex items-center gap-2">
                        {studentName(r.student_id)}
                        {r.isProjected && (
                          <Badge variant="outline" className="text-[10px] py-0 h-5 border-amber-500 text-amber-700">
                            projetado
                          </Badge>
                        )}
                        {r.appointment_id && (
                          <Badge variant="secondary" className="text-[10px] py-0 h-5">
                            agendado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={r.lock_equipment}
                            onCheckedChange={(v) => updateRow(idx, { lock_equipment: !!v })}
                          />
                          <Lock className="h-3 w-3" />
                          Equipamento fixo
                        </label>
                        {!r.appointment_id && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-muted-foreground hover:text-destructive"
                            onClick={() => removeRow(idx)}
                            title="Remover aluno desta aula"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                          Equipamento
                        </label>
                        <Select
                          value={r.equipment_id}
                          onValueChange={(v) => updateRow(idx, { equipment_id: v, sequence_id: '' })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {equipment
                              .filter((e) => (e as any).status !== 'inactive' && (e as any).status !== 'maintenance')
                              .map((e) => {
                                const lockedByOther =
                                  lockedEquipmentIds.has(e.id) &&
                                  rows.findIndex(
                                    (rr) => rr.lock_equipment && rr.equipment_id === e.id
                                  ) !== idx;
                                return (
                                  <SelectItem
                                    key={e.id}
                                    value={e.id}
                                    disabled={lockedByOther}
                                  >
                                    <span className="inline-flex items-center gap-1.5">
                                      {e.name}
                                      {lockedByOther && (
                                        <span className="text-[10px] text-amber-600 inline-flex items-center gap-0.5">
                                          <Lock className="h-2.5 w-2.5" />
                                          em uso
                                        </span>
                                      )}
                                    </span>
                                  </SelectItem>
                                );
                              })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                          Sequência {r.equipment_id && <span className="text-primary">(filtrada)</span>}
                        </label>
                        <Select value={r.sequence_id} onValueChange={(v) => updateRow(idx, { sequence_id: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder={compat.length === 0 ? 'Sem opção compatível' : 'Selecione'} />
                          </SelectTrigger>
                          <SelectContent>
                            {compat.length === 0 ? (
                              <SelectItem value="__none__" disabled>
                                Nenhuma sequência compatível
                              </SelectItem>
                            ) : (
                              compat.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {r.equipment_id && compat.length === 0 && (
                      <div className="text-[11px] text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Nenhuma sequência cadastrada para este equipamento.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4 mr-1" />
              Fechar
            </Button>
            <Button onClick={saveAll} disabled={saving || rows.length === 0}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Salvando…' : 'Salvar todos'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Propagação */}
      {showPropagate && (
        <PropagateDialog
          open={!!showPropagate}
          onClose={() => {
            setShowPropagate(null);
            onClose();
          }}
          row={showPropagate.row}
          clinicId={clinicId}
          userId={userId}
          slot={slot}
          equipment={equipment}
          sequences={sequences}
          recurring={recurring}
          appointments={appointments}
          students={students}
        />
      )}
    </>
  );
}

// ============================================================
// Propagação: mantém equipamento ou faz rodízio nos próximos N
// ============================================================

interface PropagateProps {
  open: boolean;
  onClose: () => void;
  row: RowState;
  clinicId: string;
  userId: string;
  slot: SlotIdentity;
  equipment: Equipment[];
  sequences: ExerciseSequence[];
  recurring: RecurringSchedule[];
  appointments: Appointment[];
  students: Student[];
}

type Mode = 'keep' | 'rotate';

function PropagateDialog({
  open,
  onClose,
  row,
  clinicId,
  userId,
  slot,
  equipment,
  sequences,
  recurring,
  appointments,
}: PropagateProps) {
  const [mode, setMode] = useState<Mode>('keep');
  const [count, setCount] = useState(4);
  const [busy, setBusy] = useState(false);

  // Próximas N datas em que o aluno tem aula (real ou recorrente), começando após o slot atual.
  const upcomingDates = useMemo(() => {
    const base = parseISO(slot.scheduled_at);
    const dates: { date: Date; appointment_id: string | null; recurring_id: string | null }[] = [];

    // appointments futuros do aluno
    appointments
      .filter((a) => a.student_id === row.student_id)
      .filter((a) => parseISO(a.scheduled_at) > base)
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
      .forEach((a) => dates.push({ date: parseISO(a.scheduled_at), appointment_id: a.id, recurring_id: null }));

    // expande recorrentes do aluno por até 8 semanas para preencher count
    const recs = recurring.filter((r) => r.active && r.student_id === row.student_id);
    for (let i = 1; i <= 60 && dates.length < count + 5; i++) {
      const d = addDays(base, i);
      const dow = d.getDay();
      recs
        .filter((r) => r.day_of_week === dow)
        .filter((r) => {
          const ds = d.toISOString().slice(0, 10);
          if (r.start_date > ds) return false;
          if (r.end_date && r.end_date < ds) return false;
          return true;
        })
        .forEach((r) => {
          const [h, m] = r.start_time.split(':').map(Number);
          const sched = new Date(d);
          sched.setHours(h, m, 0, 0);
          // evita duplicar se já existe appointment nessa data/hora
          const exists = dates.some(
            (x) => Math.abs(x.date.getTime() - sched.getTime()) < 60_000
          );
          if (!exists) dates.push({ date: sched, appointment_id: null, recurring_id: r.id });
        });
    }

    return dates
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, count);
  }, [appointments, recurring, row.student_id, slot.scheduled_at, count]);

  const apply = async () => {
    setBusy(true);
    try {
      // Pool de equipamentos disponíveis (ativos), incluindo o atual
      const pool = equipment.filter(
        (e) => (e as any).status !== 'inactive' && (e as any).status !== 'maintenance'
      );
      if (mode === 'rotate' && pool.length === 0) {
        toast.error('Sem equipamentos disponíveis para rodízio');
        return;
      }

      for (let i = 0; i < upcomingDates.length; i++) {
        const item = upcomingDates[i];
        const equipmentId = mode === 'keep' ? row.equipment_id : pool[i % pool.length].id;
        // escolhe sequência compatível
        const eq = equipment.find((e) => e.id === equipmentId);
        const compat = sequences.filter((s) => {
          if (s.equipment_id && s.equipment_id === equipmentId) return true;
          if (!s.equipment_id && !s.equipment_type) return true;
          if (eq && s.equipment_type && s.equipment_type.toLowerCase() === eq.equipment_type.toLowerCase())
            return true;
          return false;
        });
        // se modo "keep", reaproveita a mesma sequência; senão, rotaciona entre as compatíveis
        const seq =
          mode === 'keep'
            ? row.sequence_id
            : compat.length > 0
            ? compat[i % compat.length].id
            : null;

        // materializa appointment se necessário
        let apptId = item.appointment_id;
        if (!apptId) {
          const { data, error } = await supabase
            .from('class_appointments')
            .insert({
              clinic_id: clinicId,
              student_id: row.student_id,
              equipment_id: equipmentId,
              instructor_id: userId,
              scheduled_at: item.date.toISOString(),
              duration_minutes: slot.duration_minutes,
              created_by: userId,
              recurring_schedule_id: item.recurring_id,
            })
            .select('id')
            .single();
          if (error) {
            console.warn('skip propagate', error.message);
            continue;
          }
          apptId = data.id;
        }

        // cria prescrição em rascunho
        let prescId: string | null = null;
        if (seq) {
          const { data: presc, error: pErr } = await supabase
            .from('prescriptions')
            .insert({
              clinic_id: clinicId,
              student_id: row.student_id,
              sequence_id: seq,
              context: 'in_class',
              scheduled_for: item.date.toISOString().slice(0, 10),
              created_by: userId,
              notes: mode === 'rotate' ? 'Sugestão automática (rodízio)' : 'Sugestão automática',
            })
            .select('id')
            .single();
          if (!pErr) prescId = presc.id;
        }

        await supabase
          .from('class_appointments')
          .update({
            equipment_id: equipmentId,
            sequence_id: seq,
            ...(prescId ? { prescription_id: prescId } : {}),
          })
          .eq('id', apptId!);
      }

      toast.success(`Sugestões criadas para as próximas ${upcomingDates.length} aulas`);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Aplicar nas próximas aulas?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Quer manter o mesmo equipamento e sequência ou fazer rodízio automático?
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('keep')}
              className={cn(
                'p-3 rounded-xl border text-left transition',
                mode === 'keep' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
              )}
            >
              <div className="flex items-center gap-1.5 font-medium text-sm">
                <Repeat className="h-4 w-4" />
                Manter mesmo
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Mesmo equipamento e sequência em todas as próximas aulas.
              </div>
            </button>
            <button
              onClick={() => setMode('rotate')}
              className={cn(
                'p-3 rounded-xl border text-left transition',
                mode === 'rotate' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
              )}
            >
              <div className="flex items-center gap-1.5 font-medium text-sm">
                <Shuffle className="h-4 w-4" />
                Rodízio
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Alterna entre os equipamentos disponíveis para variar.
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm">Próximas</label>
            <Select value={String(count)} onValueChange={(v) => setCount(parseInt(v))}>
              <SelectTrigger className="h-8 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 4, 6, 8, 12].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} aulas
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-md p-2">
            Serão geradas <strong>{upcomingDates.length}</strong> sugestões em rascunho. Você pode revisar/ajustar quando abrir cada dia na grade.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Não, obrigado
            </Button>
            <Button onClick={apply} disabled={busy || upcomingDates.length === 0}>
              {busy ? 'Aplicando…' : 'Aplicar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
