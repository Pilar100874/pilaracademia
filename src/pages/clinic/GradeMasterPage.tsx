import { useState, useMemo } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { useAppointments, type AppointmentStatus, type Appointment } from '@/hooks/useAppointments';
import { useStudents, useEquipment, useSequences, usePrescriptions } from '@/hooks/useClinicData';
import { useRecurringSchedules, type RecurringSchedule } from '@/hooks/useRecurringSchedules';
import { useClinicRooms } from '@/hooks/useClinicRooms';
import { useClinicStaff } from '@/hooks/useStaff';
import { useBookableSlots } from '@/hooks/useBookableSlots';
import { useInstructorAvailability, useInstructorColors, colorForInstructor } from '@/hooks/useInstructorAvailability';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  Repeat, ListChecks, Sparkles, AlertTriangle, RefreshCw, Filter, DoorOpen, Users, UserCog,
} from 'lucide-react';
import { format, addDays, addMonths, isSameDay, parseISO, startOfWeek, startOfMonth, endOfMonth, endOfWeek, isSameMonth, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SlotGradeDialog } from '@/components/clinic/SlotGradeDialog';
import { NewClassDialog } from '@/components/clinic/NewClassDialog';
import { InstructorAvailabilityDialog } from '@/components/clinic/InstructorAvailabilityDialog';
import { PageMotion } from '@/components/PageMotion';

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
  student_id: string | null;
  equipment_id: string | null;
  instructor_id: string | null;
  room_id: string | null;
  notes: string | null;
  appointment?: Appointment & { sequence_id?: string | null; prescription_id?: string | null; recurring_schedule_id?: string | null };
  recurring_id?: string;
  /** virtual baseado em recorrente DENTRO do contrato */
  isVirtual?: boolean;
  /** virtual projetado APÓS o fim do contrato (renovação simulada) */
  isProjected?: boolean;
  /** Slot livre da Grade Master (bookable_slot) sem aluno marcado */
  isOpen?: boolean;
  bookable_slot_id?: string;
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
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [day, setDay] = useState(() => new Date());
  const [simulateRenewal, setSimulateRenewal] = useState(true);
  const [renewalMonths, setRenewalMonths] = useState(3);
  const [filterInstructor, setFilterInstructor] = useState<string>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');

  const horizonDate = useMemo(() => addMonths(new Date(), renewalMonths), [renewalMonths]);

  // Para a vista semanal/mensal, buscamos appointments cobrindo o range inteiro
  const weekStart = useMemo(() => startOfWeek(day, { weekStartsOn: 1 }), [day]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const monthStart = useMemo(() => startOfMonth(day), [day]);
  const monthEnd = useMemo(() => endOfMonth(day), [day]);
  const monthGridStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const monthGridEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);
  const monthDays = useMemo(() => {
    const days: Date[] = [];
    const total = differenceInCalendarDays(monthGridEnd, monthGridStart) + 1;
    for (let i = 0; i < total; i++) days.push(addDays(monthGridStart, i));
    return days;
  }, [monthGridStart, monthGridEnd]);
  const fetchDayISO = view === 'day' ? day.toISOString() : undefined;

  // Range para buscar bookable_slots conforme a vista
  const rangeFromISO = useMemo(() => {
    if (view === 'day') { const d = new Date(day); d.setHours(0,0,0,0); return d.toISOString(); }
    if (view === 'week') return weekStart.toISOString();
    return monthGridStart.toISOString();
  }, [view, day, weekStart, monthGridStart]);
  const rangeToISO = useMemo(() => {
    if (view === 'day') { const d = new Date(day); d.setHours(23,59,59,999); return d.toISOString(); }
    if (view === 'week') { const d = addDays(weekStart, 7); return d.toISOString(); }
    return monthGridEnd.toISOString();
  }, [view, day, weekStart, monthGridEnd]);

  // Quando view=week/month, buscamos sem filtro de dia e filtramos no cliente.
  const { data: appointments = [], updateStatus, remove } = useAppointments(activeClinicId, fetchDayISO);
  const { data: students = [] } = useStudents(activeClinicId);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const { data: sequences = [] } = useSequences(activeClinicId);
  const { data: rooms = [] } = useClinicRooms(activeClinicId);
  const { data: staff = [] } = useClinicStaff(activeClinicId);
  const { data: bookableSlots = [] } = useBookableSlots(activeClinicId, rangeFromISO, rangeToISO);
  const instructors = useMemo(
    () => staff.filter((s) => s.role === 'instructor' || s.role === 'clinic_admin').map((s) => ({ user_id: s.user_id, name: s.name })),
    [staff],
  );
  const { data: recurring = [] } = useRecurringSchedules(activeClinicId);
  const { create: createPresc } = usePrescriptions({ clinicId: activeClinicId });
  const { data: availability = [] } = useInstructorAvailability(activeClinicId);
  const { data: instructorColors = [] } = useInstructorColors(activeClinicId);
  const [availOpen, setAvailOpen] = useState(false);

  const colorOf = (instructorId: string | null | undefined) => colorForInstructor(instructorId, instructorColors);

  const studentName = (id: string | null) => id ? (students.find((s) => s.id === id)?.full_name || '—') : '—';
  const studentAvatar = (id: string | null) => id ? (students.find((s) => s.id === id) as any)?.avatar_url : undefined;
  const equipmentName = (id: string | null) => equipment.find((e) => e.id === id)?.name || '—';
  const roomName = (id: string | null | undefined) => id ? (rooms as any[]).find((r) => r.id === id)?.name : null;
  const instructorName = (id: string | null | undefined) => id ? (instructors.find((i) => i.user_id === id)?.name || `Prof. ${id.slice(0, 4)}`) : null;

  /** Slots por dia (real + virtuais + projetados), com filtros */
  const slotsForDay = (d: Date): MergedSlot[] => {
    const dayApps = appointments.filter((a) => isSameDay(parseISO(a.scheduled_at), d));
    const recById = new Map(recurring.map((r) => [r.id, r]));
    const merged: MergedSlot[] = dayApps.map((a) => {
      const fromRec = (a as any).recurring_schedule_id ? recById.get((a as any).recurring_schedule_id) : null;
      return {
        key: `real-${a.id}`,
        scheduled_at: a.scheduled_at,
        duration_minutes: a.duration_minutes,
        student_id: a.student_id,
        equipment_id: a.equipment_id,
        instructor_id: a.instructor_id,
        room_id: (fromRec as any)?.room_id ?? null,
        notes: a.notes,
        appointment: a as any,
      };
    });
    const realKeys = new Set(
      dayApps.map((a) => `${a.student_id}-${parseISO(a.scheduled_at).getHours()}:${parseISO(a.scheduled_at).getMinutes()}`)
    );
    const virtuals = expandRecurringForDayExt(recurring, d, { simulateRenewal, horizonDate });
    virtuals.forEach((v) => {
      const t = new Date(v.scheduled_at);
      const k = `${v.student_id}-${t.getHours()}:${t.getMinutes()}`;
      if (realKeys.has(k)) return;
      const rec = recById.get(v.recurring_id);
      merged.push({
        key: `virt-${v.recurring_id}-${v.scheduled_at}`,
        scheduled_at: v.scheduled_at,
        duration_minutes: v.duration_minutes,
        student_id: v.student_id,
        equipment_id: v.equipment_id,
        instructor_id: v.instructor_id,
        room_id: (rec as any)?.room_id ?? null,
        notes: v.notes,
        recurring_id: v.recurring_id,
        isVirtual: !v.projected,
        isProjected: v.projected,
      });
    });

    // ===== Bookable slots (Grade Master / horários disponíveis da clínica) =====
    // Aparecem como "Livre" quando não houver aula real/virtual ocupando o mesmo
    // horário + sala (ou equipamento).
    const occupiedKeys = new Set(
      merged.map((m) => {
        const t = parseISO(m.scheduled_at);
        return `${t.getHours()}:${t.getMinutes()}|${m.room_id ?? ''}|${m.equipment_id ?? ''}`;
      }),
    );
    const dayBookable = (bookableSlots as any[]).filter((b) => b.active !== false && isSameDay(parseISO(b.scheduled_at), d));
    dayBookable.forEach((b) => {
      const t = parseISO(b.scheduled_at);
      const k = `${t.getHours()}:${t.getMinutes()}|${b.room_id ?? ''}|${b.equipment_id ?? ''}`;
      // também considera ocupado se já existe aula no mesmo horário+sala (mesmo sem equipamento)
      const sameTimeRoom = merged.some((m) => {
        const mt = parseISO(m.scheduled_at);
        return mt.getHours() === t.getHours() && mt.getMinutes() === t.getMinutes() && (m.room_id ?? '') === (b.room_id ?? '');
      });
      if (occupiedKeys.has(k) || sameTimeRoom) return;
      merged.push({
        key: `open-${b.id}`,
        scheduled_at: b.scheduled_at,
        duration_minutes: b.duration_minutes,
        student_id: null,
        equipment_id: b.equipment_id,
        instructor_id: b.instructor_id,
        room_id: b.room_id,
        notes: b.notes,
        isOpen: true,
        bookable_slot_id: b.id,
      });
    });

    // filtros
    return merged
      .filter((m) => filterInstructor === 'all' || m.instructor_id === filterInstructor)
      .filter((m) => filterRoom === 'all' || m.room_id === filterRoom)
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  };

  const daySlots = view === 'day' ? slotsForDay(day) : [];

  /** Agrupa slots por (HH:mm + sala) e calcula ocupação vs capacidade da sala. */
  const occupancyFor = (slots: MergedSlot[], target: MergedSlot) => {
    if (!target.room_id) return null;
    const room = (rooms as any[]).find((r) => r.id === target.room_id);
    const cap = room?.capacity as number | null | undefined;
    if (!cap) return null;
    const t = parseISO(target.scheduled_at);
    const key = `${t.getHours()}:${t.getMinutes()}|${target.room_id}`;
    const same = slots.filter((s) => {
      if (s.isOpen) return false;
      const st = parseISO(s.scheduled_at);
      return `${st.getHours()}:${st.getMinutes()}|${s.room_id ?? ''}` === key;
    });
    return { used: same.length, cap, students: same.map((s) => s.student_id).filter(Boolean) as string[] };
  };

  /** Disponibilidade (turnos) que cobre o instante dado. */
  const shiftsCovering = (d: Date) => {
    const dow = d.getDay();
    const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
    return (availability as any[]).filter((s) => s.day_of_week === dow && s.start_time <= hhmm && s.end_time > hhmm);
  };

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
    if (!slot.student_id) return null;
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

  // ===== Nova aula (avulsa ou fixa) =====
  const [newClassOpen, setNewClassOpen] = useState(false);
  const [newClassTime, setNewClassTime] = useState<string | undefined>(undefined);
  const openNewClassAt = (d: Date, time?: string) => {
    setDay(d);
    setNewClassTime(time);
    setNewClassOpen(true);
  };

  const openSlotDialog = (slot: MergedSlot) => {
    // Slot livre da grade → abre Nova aula com horário pré-preenchido
    if (slot.isOpen || !slot.student_id) {
      const t = parseISO(slot.scheduled_at);
      const hh = String(t.getHours()).padStart(2, '0');
      const mm = String(t.getMinutes()).padStart(2, '0');
      openNewClassAt(t, `${hh}:${mm}`);
      return;
    }
    setSlotDialog({
      slot: { scheduled_at: slot.scheduled_at, duration_minutes: slot.duration_minutes },
      focusedStudentId: slot.student_id!,
    });
  };

  const handleCheckIn = async (slot: MergedSlot) => {
    const apptId = await materialize(slot);
    if (apptId) updateStatus.mutate({ id: apptId, status: 'checked_in' });
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
    const all =
      view === 'day'
        ? daySlots
        : view === 'week'
          ? weekDays.flatMap(slotsForDay)
          : monthDays.filter((d) => isSameMonth(d, day)).flatMap(slotsForDay);
    return {
      total: all.length,
      classes: all.filter((s) => !s.isOpen).length,
      open: all.filter((s) => s.isOpen).length,
      projected: all.filter((s) => s.isProjected).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, daySlots, weekDays, monthDays, day, appointments, recurring, bookableSlots, simulateRenewal, horizonDate, filterInstructor, filterRoom]);

  return (
    <PageMotion className="min-h-screen">
      {/* Cabeçalho compacto */}
      <div className="border-b bg-card/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Grade Master</h1>
          <span className="text-xs text-muted-foreground hidden sm:inline">· agenda da clínica</span>
        </div>
      </div>


      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* TOP BAR: stats + view + filters */}
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Total" value={stats.total} icon={CalendarDays} />
            <Stat label="Aulas marcadas" value={stats.classes} icon={CheckCircle2} tone="success" />
            <Stat label="Horários livres" value={stats.open} icon={Plus} tone="warn" />
            <Stat label="Projeções" value={stats.projected} icon={RefreshCw} tone="muted" />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
            <Tabs value={view} onValueChange={(v) => setView(v as 'day' | 'week' | 'month')}>
              <TabsList>
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mês</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setDay((d) => view === 'month' ? addMonths(d, -1) : addDays(d, view === 'day' ? -1 : -7))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDay(new Date())}>Hoje</Button>
              <Button variant="ghost" size="icon" onClick={() => setDay((d) => view === 'month' ? addMonths(d, 1) : addDays(d, view === 'day' ? 1 : 7))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="ml-2 text-sm font-medium">
                {view === 'day'
                  ? format(day, "dd 'de' MMMM yyyy", { locale: ptBR })
                  : view === 'week'
                    ? `${format(weekStart, 'dd/MM')} - ${format(addDays(weekStart, 6), 'dd/MM')}`
                    : format(day, "MMMM 'de' yyyy", { locale: ptBR })}
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

              <Button size="sm" onClick={() => openNewClassAt(day)}>
                <Plus className="h-4 w-4 mr-1" />Nova aula
              </Button>

            </div>
          </div>

          {(instructorOptions.length > 0 || rooms.length > 0) && (
            <div className="flex flex-wrap gap-2 items-center text-xs">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <Select value={filterInstructor} onValueChange={setFilterInstructor}>
                <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Professor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os professores</SelectItem>
                  {instructorOptions.map((id) => <SelectItem key={id} value={id}>{instructorName(id) || `Prof. ${id.slice(0, 6)}`}</SelectItem>)}
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
                      <div className="text-[10px] text-muted-foreground text-center py-2">—</div>
                    )}
                    {slots.map((s) => (
                      <SlotMini
                        key={s.key}
                        slot={s}
                        studentName={studentName(s.student_id)}
                        sequenceName={s.appointment?.sequence_id ? sequences.find((x) => x.id === s.appointment!.sequence_id)?.name : null}
                        roomName={roomName(s.room_id)}
                        instructorName={instructorName(s.instructor_id)}
                        instructorColor={colorOf(s.instructor_id)}
                        occupancy={occupancyFor(slots, s)}
                        onClick={() => openSlotDialog(s)}
                      />
                    ))}
                    <button
                      onClick={(e) => { e.stopPropagation(); openNewClassAt(d); }}
                      className="w-full text-[10px] py-1.5 mt-1 rounded border border-dashed text-muted-foreground hover:border-primary hover:text-primary transition flex items-center justify-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Nova aula
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : view === 'month' ? (
          <Card className="p-3">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((wd) => (
                <div key={wd} className="text-[10px] uppercase font-bold text-muted-foreground text-center py-1">
                  {wd}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((d) => {
                const slots = slotsForDay(d);
                const isToday = isSameDay(d, new Date());
                const inMonth = isSameMonth(d, day);
                const visible = slots.slice(0, 3);
                const extra = slots.length - visible.length;
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => { setDay(d); setView('day'); }}
                    className={cn(
                      'min-h-[90px] p-1.5 rounded border text-left flex flex-col gap-1 hover:border-primary transition',
                      !inMonth && 'opacity-40 bg-muted/30',
                      isToday && 'border-primary border-2',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('text-xs font-bold', isToday && 'text-primary')}>{format(d, 'd')}</span>
                      {slots.length > 0 && (
                        <span className="text-[9px] text-muted-foreground">{slots.length}</span>
                      )}
                    </div>
                    <div className="space-y-0.5 flex-1">
                      {visible.map((s) => {
                        const hasGrade = !!s.appointment?.sequence_id;
                        return (
                          <div
                            key={s.key}
                            className={cn(
                              'text-[9px] px-1 py-0.5 rounded truncate border',
                              s.isVirtual && 'border-dashed',
                              s.isProjected && 'border-dashed border-amber-500/50 bg-amber-500/5',
                              s.isOpen && 'border-dashed border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
                              !s.isOpen && (hasGrade ? 'bg-primary/10 text-primary' : 'bg-muted'),
                            )}
                          >
                            {format(parseISO(s.scheduled_at), 'HH:mm')} {s.isOpen ? (roomName(s.room_id) || 'livre') : studentName(s.student_id).split(' ')[0]}
                          </div>
                        );
                      })}
                      {extra > 0 && (
                        <div className="text-[9px] text-muted-foreground px-1">+{extra} mais</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <h2 className="font-semibold">
                {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })} · {daySlots.length} aula{daySlots.length !== 1 ? 's' : ''}
              </h2>
              <div className="text-[11px] text-muted-foreground">
                Clique em um horário abaixo para adicionar uma aula (avulsa ou fixa)
              </div>
            </div>

            {/* Faixa de horários clicáveis para criar aula */}
            <div className="mb-4 p-2 rounded-lg border bg-muted/30">
              <div className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground mb-1.5 px-1">
                + Nova aula às:
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 15 }, (_, i) => 7 + i).map((h) => {
                  const t = `${String(h).padStart(2, '0')}:00`;
                  return (
                    <button
                      key={t}
                      onClick={() => openNewClassAt(day, t)}
                      className="px-2 py-1 text-xs rounded border bg-card hover:border-primary hover:text-primary transition flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />{t}
                    </button>
                  );
                })}
              </div>
            </div>

            {daySlots.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma aula nesse dia.</p>
            ) : (

              <div className="space-y-2">
                {daySlots.map((s) => {
                  const sl = s.appointment ? STATUS_LABEL[s.appointment.status] : (
                    s.isProjected
                      ? { label: 'Projetado', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30' }
                      : s.isOpen
                        ? { label: 'Livre', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' }
                        : { label: 'Fixo', cls: 'bg-secondary text-secondary-foreground' }
                  );
                  const seqId = s.appointment?.sequence_id;
                  const seqName = seqId ? sequences.find((x) => x.id === seqId)?.name : null;
                  const av = studentAvatar(s.student_id);
                  const stu = s.student_id ? students.find((x) => x.id === s.student_id) as any : null;
                  const expired = stu?.contract_end_date && new Date(stu.contract_end_date) < new Date();
                  return (
                    <div
                      key={s.key}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border bg-card flex-wrap',
                        s.isVirtual && 'border-dashed',
                        s.isProjected && 'border-dashed border-amber-500/50 bg-amber-500/5',
                        s.isOpen && 'border-dashed border-emerald-500/40 bg-emerald-500/5',
                      )}
                    >
                      <div className="text-center min-w-[60px]">
                        <div className="font-bold text-lg">{format(parseISO(s.scheduled_at), 'HH:mm')}</div>
                        <div className="text-[10px] text-muted-foreground">{s.duration_minutes}min</div>
                      </div>
                      {s.isOpen ? (
                        <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Plus className="h-4 w-4" />
                        </div>
                      ) : av ? (
                        <img src={av} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {studentName(s.student_id).charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-[180px]">
                        <div className="font-medium truncate flex items-center gap-1.5">
                          {s.isOpen ? <span className="text-muted-foreground italic">Horário disponível</span> : studentName(s.student_id)}
                          {s.isVirtual && <span title="Horário fixo"><Repeat className="h-3 w-3 text-muted-foreground" /></span>}
                          {s.isProjected && <span title="Projeção pós-contrato"><RefreshCw className="h-3 w-3 text-amber-600" /></span>}
                          {expired && !s.appointment && (
                            <Badge variant="outline" className="text-[9px] py-0 h-4 border-amber-500 text-amber-700">contrato vencido</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate flex items-center flex-wrap gap-x-2">
                          <span>{equipmentName(s.equipment_id)}</span>
                          {roomName(s.room_id) && (
                            <span className="inline-flex items-center gap-0.5"><DoorOpen className="h-3 w-3" />{roomName(s.room_id)}</span>
                          )}
                          {instructorName(s.instructor_id) && (
                            <span>· {instructorName(s.instructor_id)}</span>
                          )}
                          {seqName && <span className="text-primary"><Sparkles className="h-3 w-3 inline mr-0.5" />{seqName}</span>}
                          {!seqName && !s.isProjected && !s.isOpen && (
                            <span className="text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3 inline mr-0.5" />sem grade
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge className={sl.cls}>{sl.label}</Badge>

                      {s.isProjected && s.student_id && (
                        <Button size="sm" variant="outline" onClick={() => renewContract(s.student_id!)}>
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />Renovar
                        </Button>
                      )}

                      {s.isOpen ? (
                        <Button size="sm" onClick={() => openSlotDialog(s)}>
                          <Plus className="h-3.5 w-3.5 mr-1" />Agendar aluno
                        </Button>
                      ) : (
                        <Button size="sm" variant={seqName ? 'outline' : 'default'} onClick={() => openSlotDialog(s)}>
                          <ListChecks className="h-3.5 w-3.5 mr-1" />{seqName ? 'Trocar grade' : 'Definir grade'}
                        </Button>
                      )}

                      {!s.isOpen && (!s.appointment || s.appointment.status === 'scheduled') && !s.isProjected && (
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

      {/* Dialog: alunos da aula + grade + propagação */}
      {slotDialog && user && activeClinicId && (
        <SlotGradeDialog
          open={!!slotDialog}
          onClose={() => setSlotDialog(null)}
          slot={slotDialog.slot}
          focusedStudentId={slotDialog.focusedStudentId}
          clinicId={activeClinicId}
          userId={user.id}
          appointments={appointments as any}
          recurring={recurring}
          students={students}
          equipment={equipment}
          sequences={sequences}
          onSaved={() => { /* react-query refetch via hooks */ }}
        />
      )}

      {/* Dialog: nova aula (avulsa ou fixa) */}
      {user && activeClinicId && (
        <NewClassDialog
          open={newClassOpen}
          onClose={() => setNewClassOpen(false)}
          clinicId={activeClinicId}
          userId={user.id}
          initialDate={day}
          initialTime={newClassTime}
          students={students as any}
          equipment={equipment as any}
          rooms={rooms as any}
          instructors={instructors}
        />
      )}
    </PageMotion>
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

function SlotMini({ slot, studentName, sequenceName, roomName, instructorName, instructorColor, occupancy, onClick }: {
  slot: MergedSlot;
  studentName: string;
  sequenceName: string | null | undefined;
  roomName?: string | null;
  instructorName?: string | null;
  instructorColor?: string;
  occupancy?: { used: number; cap: number } | null;
  onClick: () => void;
}) {
  const time = format(parseISO(slot.scheduled_at), 'HH:mm');
  const status = slot.appointment?.status;
  const hasGrade = !!sequenceName;
  return (
    <button
      onClick={onClick}
      style={instructorColor && !slot.isOpen ? { borderLeftColor: instructorColor, borderLeftWidth: 3 } : undefined}
      className={cn(
        'w-full text-left p-1.5 rounded border text-[11px] hover:bg-muted/50 transition group block',
        slot.isVirtual && 'border-dashed',
        slot.isProjected && 'border-dashed border-amber-500/50 bg-amber-500/5',
        slot.isOpen && 'border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10',
        status === 'completed' && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold">{time}</span>
        <div className="flex items-center gap-0.5">
          {occupancy && (
            <span
              className={cn(
                'text-[9px] font-bold px-1 rounded',
                occupancy.used >= occupancy.cap ? 'bg-destructive/15 text-destructive' : 'bg-primary/10 text-primary',
              )}
              title={`${occupancy.used} de ${occupancy.cap} alunos na sala`}
            >
              {occupancy.used}/{occupancy.cap}
            </span>
          )}
          {slot.isOpen && <Plus className="h-2.5 w-2.5 text-emerald-600" />}
          {slot.isProjected && <RefreshCw className="h-2.5 w-2.5 text-amber-600" />}
          {slot.isVirtual && !slot.isProjected && <Repeat className="h-2.5 w-2.5 text-muted-foreground" />}
          {!slot.isOpen && (hasGrade ? (
            <Sparkles className="h-2.5 w-2.5 text-primary" />
          ) : (
            <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
          ))}
        </div>
      </div>
      <div className="truncate font-medium">
        {slot.isOpen ? <span className="italic text-emerald-700 dark:text-emerald-400">Livre</span> : studentName}
      </div>
      {(roomName || instructorName) && (
        <div className="truncate text-muted-foreground text-[10px]">
          {[roomName, instructorName].filter(Boolean).join(' · ')}
        </div>
      )}
      {sequenceName && <div className="truncate text-primary text-[10px]">{sequenceName}</div>}
    </button>
  );
}
