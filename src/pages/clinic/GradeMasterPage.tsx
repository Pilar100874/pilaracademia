import { useState, useMemo } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { useAppointments, type AppointmentStatus, type Appointment } from '@/hooks/useAppointments';
import { useStudents, useEquipment, useSequences, usePrescriptions } from '@/hooks/useClinicData';
import { useRecurringSchedules, type RecurringSchedule } from '@/hooks/useRecurringSchedules';
import { useClinicRooms } from '@/hooks/useClinicRooms';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, LogIn, Trash2,
  Repeat, ListChecks, Sparkles, AlertTriangle, RefreshCw, Filter, DoorOpen,
} from 'lucide-react';
import { format, addDays, addMonths, isSameDay, parseISO, startOfWeek, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SlotGradeDialog } from '@/components/clinic/SlotGradeDialog';

const STATUS_LABEL: Record<AppointmentStatus, { label: string; cls: string }> = {
  scheduled:   { label: 'Agendado',  cls: 'bg-secondary text-secondary-foreground' },
  checked_in:  { label: 'Check-in',  cls: 'bg-primary text-primary-foreground' },
  in_progress: { label: 'Em aula',   cls: 'bg-primary text-primary-foreground' },
  completed:   { label: 'Concluído', cls: 'bg-muted text-muted-foreground' },
  no_show:     { label: 'Faltou',    cls: 'bg-destructive text-destructive-foreground' },
  cancelled:   { label: 'Cancelado', cls: 'bg-muted text-muted-foreground line-through' },
};

interface MergedSlot {
  key: string;
  scheduled_at: string;
  duration_minutes: number;
  student_id: string;
  equipment_id: string | null;
  instructor_id: string | null;
  notes: string | null;
  appointment?: Appointment & { sequence_id?: string | null; prescription_id?: string | null };
  recurring_id?: string;
  /** virtual baseado em recorrente DENTRO do contrato */
  isVirtual?: boolean;
  /** virtual projetado APÓS o fim do contrato (renovação simulada) */
  isProjected?: boolean;
}

/** Expande recorrentes em um dia com opção de ignorar o fim do contrato (projeção). */
function expandRecurringForDayExt(
  recurring: RecurringSchedule[],
  day: Date,
  opts: { simulateRenewal: boolean; horizonDate: Date },
) {
  const dow = day.getDay();
  const dayDate = day.toISOString().slice(0, 10);
  return recurring
    .filter((r) => r.active && r.day_of_week === dow)
    .filter((r) => r.start_date <= dayDate)
    .map((r) => {
      const within = !r.end_date || r.end_date >= dayDate;
      if (within) return { rec: r, projected: false as const };
      // Após fim → só se simulação ativa e dentro do horizonte
      if (opts.simulateRenewal && day <= opts.horizonDate) {
        return { rec: r, projected: true as const };
      }
      return null;
    })
    .filter((x): x is { rec: RecurringSchedule; projected: boolean } => x !== null)
    .map(({ rec, projected }) => {
      const [h, m] = rec.start_time.split(':').map(Number);
      const sched = new Date(day);
      sched.setHours(h, m, 0, 0);
      return {
        recurring_id: rec.id,
        student_id: rec.student_id,
        equipment_id: rec.equipment_id,
        instructor_id: rec.instructor_id,
        scheduled_at: sched.toISOString(),
        duration_minutes: rec.duration_minutes,
        notes: rec.notes,
        projected,
      };
    });
}

export default function GradeMasterPage() {
  const { activeClinicId } = useUserRoles();
  const { user } = useAuth();
  const [view, setView] = useState<'day' | 'week'>('week');
  const [day, setDay] = useState(() => new Date());
  const [simulateRenewal, setSimulateRenewal] = useState(true);
  const [renewalMonths, setRenewalMonths] = useState(3);
  const [filterInstructor, setFilterInstructor] = useState<string>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');

  const horizonDate = useMemo(() => addMonths(new Date(), renewalMonths), [renewalMonths]);

  // Para a vista semanal, buscamos appointments cobrindo a semana inteira
  const weekStart = useMemo(() => startOfWeek(day, { weekStartsOn: 1 }), [day]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const fetchDayISO = view === 'day' ? day.toISOString() : undefined;

  // Quando view=week, buscamos sem filtro de dia e filtramos no cliente.
  const { data: appointments = [], updateStatus, remove } = useAppointments(activeClinicId, fetchDayISO);
  const { data: students = [] } = useStudents(activeClinicId);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const { data: sequences = [] } = useSequences(activeClinicId);
  const { data: rooms = [] } = useClinicRooms(activeClinicId);
  const { data: recurring = [] } = useRecurringSchedules(activeClinicId);
  const { create: createPresc } = usePrescriptions({ clinicId: activeClinicId });

  const studentName = (id: string) => students.find((s) => s.id === id)?.full_name || '—';
  const studentAvatar = (id: string) => (students.find((s) => s.id === id) as any)?.avatar_url;
  const equipmentName = (id: string | null) => equipment.find((e) => e.id === id)?.name || '—';

  /** Slots por dia (real + virtuais + projetados), com filtros */
  const slotsForDay = (d: Date): MergedSlot[] => {
    const dayApps = appointments.filter((a) => isSameDay(parseISO(a.scheduled_at), d));
    const merged: MergedSlot[] = dayApps.map((a) => ({
      key: `real-${a.id}`,
      scheduled_at: a.scheduled_at,
      duration_minutes: a.duration_minutes,
      student_id: a.student_id,
      equipment_id: a.equipment_id,
      instructor_id: a.instructor_id,
      notes: a.notes,
      appointment: a as any,
    }));
    const realKeys = new Set(
      dayApps.map((a) => `${a.student_id}-${parseISO(a.scheduled_at).getHours()}:${parseISO(a.scheduled_at).getMinutes()}`)
    );
    const virtuals = expandRecurringForDayExt(recurring, d, { simulateRenewal, horizonDate });
    virtuals.forEach((v) => {
      const t = new Date(v.scheduled_at);
      const k = `${v.student_id}-${t.getHours()}:${t.getMinutes()}`;
      if (realKeys.has(k)) return;
      merged.push({
        key: `virt-${v.recurring_id}-${v.scheduled_at}`,
        scheduled_at: v.scheduled_at,
        duration_minutes: v.duration_minutes,
        student_id: v.student_id,
        equipment_id: v.equipment_id,
        instructor_id: v.instructor_id,
        notes: v.notes,
        recurring_id: v.recurring_id,
        isVirtual: !v.projected,
        isProjected: v.projected,
      });
    });

    // filtros
    return merged
      .filter((m) => filterInstructor === 'all' || m.instructor_id === filterInstructor)
      .filter((m) => {
        if (filterRoom === 'all') return true;
        // sala vem do bookable_slot; aproximamos via equipment para visualização
        return true;
      })
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  };

  const daySlots = view === 'day' ? slotsForDay(day) : [];

  // Lista de professores presentes nos schedules (deduplicados via clinic_users via recurring/instructor)
  const instructorOptions = useMemo(() => {
    const ids = new Set<string>();
    recurring.forEach((r) => r.instructor_id && ids.add(r.instructor_id));
    appointments.forEach((a) => a.instructor_id && ids.add(a.instructor_id));
    return Array.from(ids);
  }, [recurring, appointments]);

  // ===== Materializar virtual =====
  const materialize = async (slot: MergedSlot): Promise<string | null> => {
    if (slot.appointment) return slot.appointment.id;
    if (!user || !activeClinicId) return null;
    const { data, error } = await supabase.from('class_appointments').insert({
      clinic_id: activeClinicId,
      student_id: slot.student_id,
      equipment_id: slot.equipment_id,
      instructor_id: slot.instructor_id || user.id,
      scheduled_at: slot.scheduled_at,
      duration_minutes: slot.duration_minutes,
      notes: slot.notes,
      created_by: user.id,
      recurring_schedule_id: slot.recurring_id || null,
    }).select('id').single();
    if (error) { toast.error(error.message); return null; }
    return data.id;
  };

  // ===== Definir grade (sequência) — novo dialog multi-aluno =====
  const [slotDialog, setSlotDialog] = useState<{
    slot: { scheduled_at: string; duration_minutes: number };
    focusedStudentId: string;
  } | null>(null);

  const openSlotDialog = (slot: MergedSlot) => {
    setSlotDialog({
      slot: { scheduled_at: slot.scheduled_at, duration_minutes: slot.duration_minutes },
      focusedStudentId: slot.student_id,
    });
  };

  const handleCheckIn = async (slot: MergedSlot) => {
    const apptId = await materialize(slot);
    if (apptId) updateStatus.mutate({ id: apptId, status: 'checked_in' });
  };

  // ===== Aluno avulso =====
  const [avulsoOpen, setAvulsoOpen] = useState(false);
  const [avulso, setAvulso] = useState({ student_id: '', time: '08:00', duration_minutes: 50, equipment_id: '', notes: '' });
  const handleAvulso = async () => {
    if (!user || !activeClinicId || !avulso.student_id) return;
    const [h, m] = avulso.time.split(':').map(Number);
    const sched = new Date(day);
    sched.setHours(h, m, 0, 0);
    const { error } = await supabase.from('class_appointments').insert({
      clinic_id: activeClinicId,
      student_id: avulso.student_id,
      equipment_id: avulso.equipment_id || null,
      instructor_id: user.id,
      scheduled_at: sched.toISOString(),
      duration_minutes: avulso.duration_minutes,
      notes: avulso.notes || null,
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Aula avulsa adicionada');
    setAvulso({ student_id: '', time: '08:00', duration_minutes: 50, equipment_id: '', notes: '' });
    setAvulsoOpen(false);
  };

  // ===== Renovar contrato (1-clique) =====
  const renewContract = async (studentId: string) => {
    const stu = students.find((s) => s.id === studentId) as any;
    if (!stu) return;
    const newEnd = addMonths(stu.contract_end_date ? new Date(stu.contract_end_date) : new Date(), renewalMonths);
    const { error } = await supabase.from('clinic_students').update({
      contract_end_date: newEnd.toISOString().slice(0, 10),
      contract_type: stu.contract_type || 'period',
    }).eq('id', studentId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Contrato renovado por ${renewalMonths} meses`);
  };

  // ===== Stats topo =====
  const stats = useMemo(() => {
    const all = view === 'day' ? daySlots : weekDays.flatMap(slotsForDay);
    return {
      total: all.length,
      withGrade: all.filter((s) => s.appointment?.sequence_id).length,
      pending: all.filter((s) => !s.appointment?.sequence_id).length,
      projected: all.filter((s) => s.isProjected).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, daySlots, weekDays, appointments, recurring, simulateRenewal, horizonDate, filterInstructor]);

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <div className="hero-yellow border-b-4 border-primary">
        <div className="max-w-7xl mx-auto px-6 py-8 sm:py-10">
          <p className="text-primary/70 text-xs font-bold uppercase tracking-widest mb-2">Painel da clínica</p>
          <h1 className="display-xl text-primary flex items-center gap-3">
            <CalendarDays className="h-9 w-9" /> Grade Master
          </h1>
          <p className="mt-2 text-primary/80 font-medium max-w-2xl">
            Toda a operação em uma tela: alunos fixos, contratos, renovações e prescrição da grade.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* TOP BAR: stats + view + filters */}
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Aulas" value={stats.total} icon={CalendarDays} />
            <Stat label="Com grade" value={stats.withGrade} icon={CheckCircle2} tone="success" />
            <Stat label="Sem grade" value={stats.pending} icon={AlertTriangle} tone="warn" />
            <Stat label="Projeções" value={stats.projected} icon={RefreshCw} tone="muted" />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
            <Tabs value={view} onValueChange={(v) => setView(v as 'day' | 'week')}>
              <TabsList>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="day">Dia</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setDay((d) => addDays(d, view === 'day' ? -1 : -7))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDay(new Date())}>Hoje</Button>
              <Button variant="ghost" size="icon" onClick={() => setDay((d) => addDays(d, view === 'day' ? 1 : 7))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="ml-2 text-sm font-medium">
                {view === 'day'
                  ? format(day, "dd 'de' MMMM yyyy", { locale: ptBR })
                  : `${format(weekStart, 'dd/MM')} - ${format(addDays(weekStart, 6), 'dd/MM')}`}
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                <Switch checked={simulateRenewal} onCheckedChange={setSimulateRenewal} id="sim" />
                <label htmlFor="sim" className="text-xs font-medium cursor-pointer flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Simular renovação
                </label>
                {simulateRenewal && (
                  <Select value={String(renewalMonths)} onValueChange={(v) => setRenewalMonths(parseInt(v))}>
                    <SelectTrigger className="h-7 w-[90px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 6, 12].map((m) => <SelectItem key={m} value={String(m)}>{m} {m === 1 ? 'mês' : 'meses'}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Dialog open={avulsoOpen} onOpenChange={setAvulsoOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Aula avulsa</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Aula avulsa em {format(day, "dd/MM/yyyy", { locale: ptBR })}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm">Aluno</label>
                      <Select value={avulso.student_id} onValueChange={(v) => setAvulso({ ...avulso, student_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-sm">Hora</label><Input type="time" value={avulso.time} onChange={(e) => setAvulso({ ...avulso, time: e.target.value })} /></div>
                      <div><label className="text-sm">Duração (min)</label><Input type="number" value={avulso.duration_minutes} onChange={(e) => setAvulso({ ...avulso, duration_minutes: parseInt(e.target.value) || 50 })} /></div>
                    </div>
                    <div>
                      <label className="text-sm">Equipamento</label>
                      <Select value={avulso.equipment_id} onValueChange={(v) => setAvulso({ ...avulso, equipment_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                        <SelectContent>{equipment.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><label className="text-sm">Observações</label><Textarea value={avulso.notes} onChange={(e) => setAvulso({ ...avulso, notes: e.target.value })} /></div>
                    <Button onClick={handleAvulso} disabled={!avulso.student_id} className="w-full">Adicionar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {(instructorOptions.length > 0 || rooms.length > 0) && (
            <div className="flex flex-wrap gap-2 items-center text-xs">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <Select value={filterInstructor} onValueChange={setFilterInstructor}>
                <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Professor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os professores</SelectItem>
                  {instructorOptions.map((id) => <SelectItem key={id} value={id}>Prof. {id.slice(0, 6)}</SelectItem>)}
                </SelectContent>
              </Select>
              {rooms.length > 0 && (
                <Select value={filterRoom} onValueChange={setFilterRoom}>
                  <SelectTrigger className="h-8 w-[160px]"><SelectValue placeholder="Sala" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as salas</SelectItem>
                    {rooms.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </Card>

        {/* CONTEÚDO */}
        {view === 'week' ? (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {weekDays.map((d) => {
              const slots = slotsForDay(d);
              const isToday = isSameDay(d, new Date());
              return (
                <Card key={d.toISOString()} className={cn('p-3 min-h-[200px]', isToday && 'border-primary border-2')}>
                  <button
                    onClick={() => { setDay(d); setView('day'); }}
                    className="w-full text-left mb-2 group"
                  >
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">
                      {format(d, 'EEE', { locale: ptBR })}
                    </div>
                    <div className={cn('text-lg font-bold group-hover:text-primary transition', isToday && 'text-primary')}>
                      {format(d, 'd/MM')}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{slots.length} aula{slots.length !== 1 ? 's' : ''}</div>
                  </button>
                  <div className="space-y-1.5">
                    {slots.length === 0 && (
                      <div className="text-[10px] text-muted-foreground text-center py-4">—</div>
                    )}
                    {slots.map((s) => (
                      <SlotMini
                        key={s.key}
                        slot={s}
                        studentName={studentName(s.student_id)}
                        sequenceName={s.appointment?.sequence_id ? sequences.find((x) => x.id === s.appointment!.sequence_id)?.name : null}
                        onClick={() => { setGradeOpen(s); setGradeSeq(s.appointment?.sequence_id || ''); }}
                      />
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-4">
            <h2 className="font-semibold mb-3">
              {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })} · {daySlots.length} aula{daySlots.length !== 1 ? 's' : ''}
            </h2>
            {daySlots.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma aula nesse dia.</p>
            ) : (
              <div className="space-y-2">
                {daySlots.map((s) => {
                  const sl = s.appointment ? STATUS_LABEL[s.appointment.status] : (
                    s.isProjected
                      ? { label: 'Projetado', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30' }
                      : { label: 'Fixo', cls: 'bg-secondary text-secondary-foreground' }
                  );
                  const seqId = s.appointment?.sequence_id;
                  const seqName = seqId ? sequences.find((x) => x.id === seqId)?.name : null;
                  const av = studentAvatar(s.student_id);
                  const stu = students.find((x) => x.id === s.student_id) as any;
                  const expired = stu?.contract_end_date && new Date(stu.contract_end_date) < new Date();
                  return (
                    <div
                      key={s.key}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border bg-card flex-wrap',
                        s.isVirtual && 'border-dashed',
                        s.isProjected && 'border-dashed border-amber-500/50 bg-amber-500/5',
                      )}
                    >
                      <div className="text-center min-w-[60px]">
                        <div className="font-bold text-lg">{format(parseISO(s.scheduled_at), 'HH:mm')}</div>
                        <div className="text-[10px] text-muted-foreground">{s.duration_minutes}min</div>
                      </div>
                      {av ? (
                        <img src={av} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {studentName(s.student_id).charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-[180px]">
                        <div className="font-medium truncate flex items-center gap-1.5">
                          {studentName(s.student_id)}
                          {s.isVirtual && <span title="Horário fixo"><Repeat className="h-3 w-3 text-muted-foreground" /></span>}
                          {s.isProjected && <span title="Projeção pós-contrato"><RefreshCw className="h-3 w-3 text-amber-600" /></span>}
                          {expired && !s.appointment && (
                            <Badge variant="outline" className="text-[9px] py-0 h-4 border-amber-500 text-amber-700">contrato vencido</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {equipmentName(s.equipment_id)}
                          {seqName && <span className="ml-2 text-primary"><Sparkles className="h-3 w-3 inline mr-0.5" />{seqName}</span>}
                          {!seqName && !s.isProjected && (
                            <span className="ml-2 text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3 inline mr-0.5" />sem grade
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge className={sl.cls}>{sl.label}</Badge>

                      {s.isProjected && (
                        <Button size="sm" variant="outline" onClick={() => renewContract(s.student_id)}>
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />Renovar
                        </Button>
                      )}

                      <Button size="sm" variant={seqName ? 'outline' : 'default'} onClick={() => { setGradeOpen(s); setGradeSeq(seqId || ''); }}>
                        <ListChecks className="h-3.5 w-3.5 mr-1" />{seqName ? 'Trocar grade' : 'Definir grade'}
                      </Button>

                      {(!s.appointment || s.appointment.status === 'scheduled') && !s.isProjected && (
                        <Button size="sm" variant="outline" onClick={() => handleCheckIn(s)}>
                          <LogIn className="h-3.5 w-3.5 mr-1" />Check-in
                        </Button>
                      )}
                      {s.appointment && (s.appointment.status === 'checked_in' || s.appointment.status === 'in_progress') && (
                        <Button size="sm" onClick={() => updateStatus.mutate({ id: s.appointment!.id, status: 'completed' })}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Concluir
                        </Button>
                      )}
                      {s.appointment && (
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm('Excluir esta aula?')) remove.mutate(s.appointment!.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* Legenda */}
        <Card className="p-3 text-xs text-muted-foreground flex flex-wrap gap-4">
          <span className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border bg-card" />Aula real</span>
          <span className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-dashed" />Horário fixo (virtual)</span>
          <span className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-dashed border-amber-500 bg-amber-500/10" />Projeção pós-contrato</span>
          <span className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-amber-600" />Sem grade definida</span>
          <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-primary" />Grade pronta</span>
        </Card>
      </div>

      {/* Dialog: definir grade */}
      <Dialog open={!!gradeOpen} onOpenChange={(o) => !o && setGradeOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Grade · {gradeOpen ? studentName(gradeOpen.student_id) : ''} · {gradeOpen && format(parseISO(gradeOpen.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {gradeOpen?.isProjected && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <div>
                  Esta aula é uma <strong>projeção pós-contrato</strong>. Ao salvar a grade, ela será materializada como aula real.
                  Lembre-se de <strong>renovar o contrato</strong> do aluno.
                </div>
              </div>
            )}
            <div>
              <label className="text-sm">Sequência de exercícios</label>
              <Select value={gradeSeq} onValueChange={setGradeSeq}>
                <SelectTrigger><SelectValue placeholder="Escolha uma sequência" /></SelectTrigger>
                <SelectContent>
                  {sequences.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">A grade fica vinculada à aula. O aluno verá em "Meu Pilates" e a estação carrega automaticamente.</p>
            <Button onClick={assignGrade} disabled={!gradeSeq} className="w-full">Salvar grade</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ subcomponents ============
function Stat({ label, value, icon: Icon, tone = 'default' }: { label: string; value: number; icon: any; tone?: 'default' | 'success' | 'warn' | 'muted' }) {
  const toneCls = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warn: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    muted: 'bg-muted text-muted-foreground',
  }[tone];
  return (
    <div className="flex items-center gap-3 p-2">
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', toneCls)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mt-1">{label}</div>
      </div>
    </div>
  );
}

function SlotMini({ slot, studentName, sequenceName, onClick }: { slot: MergedSlot; studentName: string; sequenceName: string | null | undefined; onClick: () => void }) {
  const time = format(parseISO(slot.scheduled_at), 'HH:mm');
  const status = slot.appointment?.status;
  const hasGrade = !!sequenceName;
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-1.5 rounded border text-[11px] hover:bg-muted/50 transition group block',
        slot.isVirtual && 'border-dashed',
        slot.isProjected && 'border-dashed border-amber-500/50 bg-amber-500/5',
        status === 'completed' && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold">{time}</span>
        {slot.isProjected && <RefreshCw className="h-2.5 w-2.5 text-amber-600" />}
        {slot.isVirtual && !slot.isProjected && <Repeat className="h-2.5 w-2.5 text-muted-foreground" />}
        {hasGrade ? (
          <Sparkles className="h-2.5 w-2.5 text-primary" />
        ) : (
          <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
        )}
      </div>
      <div className="truncate font-medium">{studentName}</div>
      {sequenceName && <div className="truncate text-primary text-[10px]">{sequenceName}</div>}
    </button>
  );
}
