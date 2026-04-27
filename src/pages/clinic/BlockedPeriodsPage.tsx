import { useState } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useClinicRooms } from '@/hooks/useClinicRooms';
import { useBlockedPeriods, type BlockedPeriod } from '@/hooks/useBlockedPeriods';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Lock, Coffee, Clock, AlertTriangle } from 'lucide-react';
import { useConfirm } from '@/components/ConfirmProvider';
import { PageMotion } from '@/components/PageMotion';
import { ClinicPageHeader } from '@/components/clinic/ClinicPageHeader';
import { toast } from 'sonner';

const DOW_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DOW_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface ConflictAppointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  room_id: string | null;
  student_name: string;
  instructor_name: string | null;
}

async function findConflicts(
  clinicId: string,
  rules: { day_of_week: number; start_time: string; end_time: string; room_id: string | null }[],
) {
  const horizonStart = new Date();
  const horizonEnd = new Date();
  horizonEnd.setDate(horizonEnd.getDate() + 90);

  const { data: apptRaw } = await (supabase as any)
    .from('class_appointments')
    .select('id, scheduled_at, duration_minutes, room_id, student_id, instructor_id, status, bookable_slot_id')
    .eq('clinic_id', clinicId)
    .neq('status', 'cancelled')
    .gte('scheduled_at', horizonStart.toISOString())
    .lte('scheduled_at', horizonEnd.toISOString());

  const { data: slotsRaw } = await (supabase as any)
    .from('bookable_slots')
    .select('id, scheduled_at, duration_minutes, room_id, instructor_id, active, blocked')
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .gte('scheduled_at', horizonStart.toISOString())
    .lte('scheduled_at', horizonEnd.toISOString());

  const matchesRule = (
    scheduledAt: string,
    durationMin: number,
    roomId: string | null,
  ) => {
    const start = new Date(scheduledAt);
    const dow = start.getDay();
    const startMin = start.getHours() * 60 + start.getMinutes();
    const endMin = startMin + (durationMin || 50);
    for (const r of rules) {
      if (r.day_of_week !== dow) continue;
      if (r.room_id && roomId && r.room_id !== roomId) continue;
      const [rsH, rsM] = r.start_time.split(':').map(Number);
      const [reH, reM] = r.end_time.split(':').map(Number);
      const ruleStart = rsH * 60 + rsM;
      const ruleEnd = reH * 60 + reM;
      if (startMin < ruleEnd && endMin > ruleStart) return true;
    }
    return false;
  };

  const conflictAppts = (apptRaw || []).filter((a: any) =>
    matchesRule(a.scheduled_at, a.duration_minutes, a.room_id),
  );

  const apptSlotIds = new Set((apptRaw || []).map((a: any) => a.bookable_slot_id).filter(Boolean));
  const freeSlots = (slotsRaw || []).filter((s: any) => {
    if (apptSlotIds.has(s.id)) return false;
    return matchesRule(s.scheduled_at, s.duration_minutes, s.room_id);
  });

  const studentIds = Array.from(new Set(conflictAppts.map((a: any) => a.student_id).filter(Boolean)));
  const instructorIds = Array.from(new Set(conflictAppts.map((a: any) => a.instructor_id).filter(Boolean)));
  const [stRes, prRes] = await Promise.all([
    studentIds.length
      ? (supabase as any).from('clinic_students').select('id, full_name').in('id', studentIds)
      : Promise.resolve({ data: [] }),
    instructorIds.length
      ? (supabase as any).from('profiles').select('user_id, name').in('user_id', instructorIds)
      : Promise.resolve({ data: [] }),
  ]);
  const stMap = new Map((stRes.data || []).map((s: any) => [s.id, s.full_name]));
  const prMap = new Map((prRes.data || []).map((p: any) => [p.user_id, p.name]));

  const appointments: ConflictAppointment[] = conflictAppts.map((a: any) => ({
    id: a.id,
    scheduled_at: a.scheduled_at,
    duration_minutes: a.duration_minutes,
    room_id: a.room_id,
    student_name: stMap.get(a.student_id) || 'Aluno',
    instructor_name: a.instructor_id ? prMap.get(a.instructor_id) || null : null,
  }));

  return { appointments, freeSlotIds: freeSlots.map((s: any) => s.id as string) };
}

export default function BlockedPeriodsPage() {
  const { activeClinicId } = useUserRoles();
  const { data: rooms = [] } = useClinicRooms(activeClinicId);
  const { periods, create, update, remove } = useBlockedPeriods(activeClinicId);
  const { confirm } = useConfirm();
  const [editing, setEditing] = useState<BlockedPeriod | null>(null);
  const [open, setOpen] = useState(false);
  const [conflictDialog, setConflictDialog] = useState<{
    appointments: ConflictAppointment[];
    freeSlotIds: string[];
    onConfirm: () => void;
  } | null>(null);
  const [instructorDialog, setInstructorDialog] = useState<{
    freeSlotIds: number;
    onClear: () => void;
    onSkip: () => void;
  } | null>(null);

  const persistRules = async (form: BlockedFormState) => {
    const base = {
      clinic_id: activeClinicId!,
      name: form.name.trim() || 'Bloqueio',
      start_time: form.start_time + ':00',
      end_time: form.end_time + ':00',
      room_id: form.room_id || null,
      color: form.color || null,
      active: form.active,
    };
    if (editing) {
      await update.mutateAsync({
        id: editing.id,
        ...base,
        day_of_week: form.days_of_week[0] ?? editing.day_of_week,
      });
    } else {
      const days = form.days_of_week.length > 0 ? form.days_of_week : [1];
      for (const dow of days) {
        await create.mutateAsync({ ...base, day_of_week: dow } as any);
      }
    }
    setEditing(null);
    setOpen(false);
  };

  const clearFreeSlots = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { error } = await (supabase as any)
      .from('bookable_slots')
      .update({ active: false })
      .in('id', ids);
    if (error) {
      toast.error('Falha ao limpar horários de professor: ' + error.message);
    } else {
      toast.success(`${ids.length} horário(s) de professor liberado(s) automaticamente`);
    }
  };

  const handleSave = async (form: BlockedFormState) => {
    if (!activeClinicId) return;
    const days = editing
      ? [form.days_of_week[0] ?? editing.day_of_week]
      : form.days_of_week.length > 0
        ? form.days_of_week
        : [1];
    const rules = days.map((d) => ({
      day_of_week: d,
      start_time: form.start_time + ':00',
      end_time: form.end_time + ':00',
      room_id: form.room_id || null,
    }));

    const { appointments, freeSlotIds } = await findConflicts(activeClinicId, rules);

    const proceed = async (clearSlots: boolean) => {
      if (clearSlots) await clearFreeSlots(freeSlotIds);
      await persistRules(form);
    };

    if (appointments.length === 0) {
      if (freeSlotIds.length === 0) {
        await proceed(false);
        return;
      }
      // Apenas horários de professor conflitam — perguntar o que fazer
      setInstructorDialog({
        freeSlotIds: freeSlotIds.length,
        onClear: async () => {
          setInstructorDialog(null);
          await proceed(true);
        },
        onSkip: () => {
          setInstructorDialog(null);
          // Cancela a criação do bloqueio
          toast.info('Bloqueio não criado. Horários do professor preservados.');
        },
      });
      return;
    }

    setConflictDialog({
      appointments,
      freeSlotIds,
      onConfirm: async () => {
        setConflictDialog(null);
        await proceed(true);
      },
    });
  };

  const handleDelete = async (p: BlockedPeriod) => {
    const ok = await confirm({
      title: 'Remover bloqueio',
      description: `Remover "${p.name}"? Os horários voltarão a aparecer livres na grade.`,
      destructive: true,
      confirmText: 'Remover',
    });
    if (ok) remove.mutate(p.id);
  };

  // Agrupar por dia
  const grouped = DOW_LABELS.map((label, dow) => ({
    label,
    dow,
    items: periods.filter((p) => p.day_of_week === dow),
  }));

  return (
    <PageMotion>
      <ClinicPageHeader
        icon={Lock}
        title="Bloqueios padrão"
        subtitle="Horários sempre bloqueados na grade (ex: almoço, intervalos)"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold">Regras recorrentes</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Esses períodos ficam bloqueados toda semana na Grade Master. Você pode liberar pontualmente
                um dia específico clicando no horário direto na grade.
              </p>
            </div>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Novo bloqueio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>{editing ? 'Editar bloqueio' : 'Novo bloqueio'}</DialogTitle>
                </DialogHeader>
                <BlockedForm
                  initial={editing}
                  rooms={rooms as any[]}
                  onCancel={() => { setOpen(false); setEditing(null); }}
                  onSave={handleSave}
                />
              </DialogContent>
            </Dialog>
          </div>

          {periods.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed rounded-md">
              <Coffee className="h-6 w-6 mx-auto mb-2 opacity-60" />
              Nenhum bloqueio cadastrado. Crie um para o almoço, por exemplo.
            </div>
          ) : (
            <div className="space-y-3">
              {grouped.filter((g) => g.items.length > 0).map((g) => (
                <div key={g.dow}>
                  <div className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground mb-1.5">
                    {g.label === 'Seg' || g.label === 'Ter' || g.label === 'Qua' || g.label === 'Qui' || g.label === 'Sex'
                      ? `${g.label}-feira` : g.label === 'Sáb' ? 'Sábado' : 'Domingo'}
                  </div>
                  <div className="space-y-1.5">
                    {g.items.map((p) => {
                      const room = (rooms as any[]).find((r) => r.id === p.room_id);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 p-2.5 rounded-md border bg-card hover:border-foreground/30 transition"
                        >
                          <div
                            className="h-9 w-1 rounded-sm shrink-0"
                            style={{ background: p.color || 'hsl(var(--destructive))' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{p.name}</span>
                              {!p.active && <Badge variant="outline" className="text-[10px]">inativo</Badge>}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {p.start_time.slice(0, 5)} – {p.end_time.slice(0, 5)}
                              </span>
                              <span>{room ? `Sala: ${room.name}` : 'Todas as salas'}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setEditing(p); setOpen(true); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(p)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={!!conflictDialog} onOpenChange={(v) => { if (!v) setConflictDialog(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Conflitos encontrados
            </DialogTitle>
          </DialogHeader>
          {conflictDialog && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Existem <strong>{conflictDialog.appointments.length} aula(s)</strong> agendada(s) dentro desse horário.
                Elas <strong>não serão canceladas</strong> automaticamente — você precisa remarcá-las manualmente.
                {conflictDialog.freeSlotIds.length > 0 && (
                  <> Além disso, <strong>{conflictDialog.freeSlotIds.length} horário(s) livre(s) de professor</strong> serão liberados automaticamente.</>
                )}
              </p>
              <div className="border rounded-md max-h-72 overflow-auto divide-y">
                {conflictDialog.appointments.map((a) => {
                  const d = new Date(a.scheduled_at);
                  const room = (rooms as any[]).find((r) => r.id === a.room_id);
                  return (
                    <div key={a.id} className="p-2.5 text-sm flex items-start gap-2">
                      <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{a.student_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {DOW_FULL[d.getDay()]}, {d.toLocaleDateString('pt-BR')} às {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {a.instructor_name && <> · Prof. {a.instructor_name}</>}
                          {room && <> · {room.name}</>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConflictDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => conflictDialog?.onConfirm()}>
              Criar bloqueio mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageMotion>
  );
}

interface BlockedFormState {
  name: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  room_id: string;
  color: string;
  active: boolean;
}

function BlockedForm({
  initial,
  rooms,
  onSave,
  onCancel,
}: {
  initial: BlockedPeriod | null;
  rooms: any[];
  onSave: (s: BlockedFormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<BlockedFormState>({
    name: initial?.name ?? '',
    days_of_week: initial ? [initial.day_of_week] : [1],
    start_time: initial?.start_time?.slice(0, 5) ?? '12:00',
    end_time: initial?.end_time?.slice(0, 5) ?? '13:00',
    room_id: initial?.room_id ?? '',
    color: initial?.color ?? '',
    active: initial?.active ?? true,
  });

  const set = <K extends keyof BlockedFormState>(k: K, v: BlockedFormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Nome</Label>
        <Input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Ex: Almoço, Reunião semanal..."
          autoFocus={false}
        />
      </div>

      <div>
        <Label className="text-xs">
          {initial ? 'Dia da semana' : 'Dias da semana'}
          {!initial && <span className="text-muted-foreground ml-1">(selecione um ou mais)</span>}
        </Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {DOW_LABELS.map((l, i) => {
            const selected = form.days_of_week.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (initial) {
                    set('days_of_week', [i]);
                  } else {
                    set(
                      'days_of_week',
                      selected ? form.days_of_week.filter((d) => d !== i) : [...form.days_of_week, i].sort(),
                    );
                  }
                }}
                className={`h-9 min-w-[44px] px-2 rounded-md border text-xs font-medium transition ${
                  selected
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card hover:border-foreground/40 text-foreground border-border'
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label className="text-xs">Sala</Label>
        <Select value={form.room_id || 'all'} onValueChange={(v) => set('room_id', v === 'all' ? '' : v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as salas</SelectItem>
            {rooms.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Início</Label>
          <Input
            type="time"
            value={form.start_time}
            onChange={(e) => set('start_time', e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Fim</Label>
          <Input
            type="time"
            value={form.end_time}
            onChange={(e) => set('end_time', e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Label htmlFor="active" className="text-xs cursor-pointer">Ativo</Label>
        <Switch id="active" checked={form.active} onCheckedChange={(v) => set('active', v)} />
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button className="flex-1" onClick={() => onSave(form)} disabled={form.start_time >= form.end_time || form.days_of_week.length === 0}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
