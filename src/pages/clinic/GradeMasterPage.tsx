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
import { InstructorPicker } from '@/components/clinic/InstructorPicker';
import { CalendarTimeline, type TimelineSlot } from '@/components/clinic/CalendarTimeline';
import { RoomsTimeline, makeEmptyKey, parseEmptyKey, type EmptyCellKey } from '@/components/clinic/RoomsTimeline';
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
  const { data: bookableSlots = [], create: createBookable, remove: removeBookable } = useBookableSlots(activeClinicId, rangeFromISO, rangeToISO);
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
  // Paleta fallback para salas sem cor cadastrada (HSL Editorial Cotton compat).
  const ROOM_PALETTE = [
    'hsl(20 70% 55%)',  'hsl(190 60% 45%)', 'hsl(140 45% 45%)',
    'hsl(280 50% 55%)', 'hsl(40 75% 50%)',  'hsl(0 60% 55%)',
    'hsl(220 55% 55%)', 'hsl(160 50% 40%)',
  ];
  const roomColorOf = (id: string | null | undefined) => {
    if (!id) return null;
    const r = (rooms as any[]).find((x) => x.id === id);
    if (r?.color) return r.color as string;
    const idx = (rooms as any[]).findIndex((x) => x.id === id);
    return ROOM_PALETTE[(idx >= 0 ? idx : 0) % ROOM_PALETTE.length];
  };
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

  /** Slot está sem professor? (sem instructor_id atribuído ou ninguém de plantão na hora) */
  const isUncovered = (slot: MergedSlot) => {
    if (slot.isOpen) return false; // slot livre não conta
    if (!slot.instructor_id) return true;
    return shiftsCovering(parseISO(slot.scheduled_at)).length === 0;
  };

  /** Cobertura por hora do dia: para cada hora 7..21 retorna {hora, profsDePlantao, aulas, semProf}. */
  const dayCoverage = useMemo(() => {
    if (view !== 'day') return [];
    const dow = day.getDay();
    return Array.from({ length: 15 }, (_, i) => {
      const hour = 7 + i;
      const hhmm = `${String(hour).padStart(2, '0')}:00:00`;
      const shifts = (availability as any[]).filter(
        (s) => s.day_of_week === dow && s.start_time <= hhmm && s.end_time > hhmm,
      );
      const slotsAt = daySlots.filter((s) => parseISO(s.scheduled_at).getHours() === hour && !s.isOpen);
      const studentsCount = slotsAt.filter((s) => s.student_id).length;
      const uncoveredCount = slotsAt.filter((s) => isUncovered(s)).length;
      return { hour, shifts, studentsCount, uncoveredCount, hasAnyClass: slotsAt.length > 0 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, day, availability, daySlots]);

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
  const [newClassRoomId, setNewClassRoomId] = useState<string | null | undefined>(undefined);
  const openNewClassAt = (d: Date, time?: string, roomId?: string | null) => {
    setDay(d);
    setNewClassTime(time);
    setNewClassRoomId(roomId);
    setNewClassOpen(true);
  };

  // ===== Seleção múltipla na timeline do dia =====
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<Set<string>>(new Set());
  const [selectedEmptyKeys, setSelectedEmptyKeys] = useState<Set<EmptyCellKey>>(new Set());

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedSlotKeys(new Set());
    setSelectedEmptyKeys(new Set());
  };

  const toggleSlotSel = (s: TimelineSlot) => {
    setSelectedSlotKeys((prev) => {
      const next = new Set(prev);
      if (next.has(s.key)) next.delete(s.key);
      else next.add(s.key);
      return next;
    });
  };
  const toggleEmptySel = (k: EmptyCellKey) => {
    setSelectedEmptyKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selectedSlotKeys.size === 0) return;
    if (!confirm(`Excluir ${selectedSlotKeys.size} horário(s) selecionado(s)?`)) return;
    const tsList = daySlots.map(toTimelineSlot).filter((t) => selectedSlotKeys.has(t.key));
    for (const t of tsList) {
      if (t.appointment_id) await remove.mutateAsync(t.appointment_id);
      else if (t.bookable_slot_id) await removeBookable.mutateAsync(t.bookable_slot_id);
    }
    toast.success(`${tsList.length} horário(s) excluído(s)`);
    exitSelection();
  };

  const createSelectedEmpty = async () => {
    if (selectedEmptyKeys.size === 0 || !activeClinicId || !user) return;
    let count = 0;
    for (const k of selectedEmptyKeys) {
      const { date, hour, roomId } = parseEmptyKey(k);
      const sched = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);
      try {
        await createBookable.mutateAsync({
          clinic_id: activeClinicId,
          scheduled_at: sched.toISOString(),
          duration_minutes: 50,
          equipment_id: null,
          instructor_id: null,
          room_id: roomId,
          capacity: 1,
          notes: null,
          created_by: user.id,
        } as any);
        count++;
      } catch (e) { /* mutation toasts errors */ }
    }
    toast.success(`${count} horário(s) criado(s)`);
    exitSelection();
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
      uncovered: all.filter((s) => isUncovered(s)).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, daySlots, weekDays, monthDays, day, appointments, recurring, bookableSlots, simulateRenewal, horizonDate, filterInstructor, filterRoom]);

  // ===== Adapter para a timeline visual =====
  const toTimelineSlot = (s: MergedSlot): TimelineSlot => ({
    key: s.key,
    scheduled_at: s.scheduled_at,
    duration_minutes: s.duration_minutes,
    student_id: s.student_id,
    instructor_id: s.instructor_id,
    room_id: s.room_id,
    isOpen: s.isOpen,
    isVirtual: s.isVirtual,
    isProjected: s.isProjected,
    hasGrade: !!s.appointment?.sequence_id,
    uncovered: isUncovered(s),
    appointment_id: s.appointment?.id,
    bookable_slot_id: s.bookable_slot_id,
    recurring_id: s.recurring_id,
  });

  const handleTimelineDelete = (ts: TimelineSlot) => {
    if (ts.appointment_id) remove.mutate(ts.appointment_id);
    else if (ts.bookable_slot_id) removeBookable.mutate(ts.bookable_slot_id);
  };

  const handleTimelineSlotClick = (ts: TimelineSlot) => {
    // Reconstrói minimal MergedSlot — encontra o original
    const all = view === 'day' ? daySlots : weekDays.flatMap(slotsForDay);
    const original = all.find((s) => s.key === ts.key);
    if (original) openSlotDialog(original);
  };

  const handleCellClick = (d: Date, hour: number) => {
    openNewClassAt(d, `${String(hour).padStart(2, '0')}:00`);
  };

  const renderTimelineInstructorPicker = (ts: TimelineSlot) => (
    <InstructorPicker
      appointmentId={ts.appointment_id}
      bookableSlotId={ts.bookable_slot_id}
      recurringId={!ts.appointment_id && ts.recurring_id ? ts.recurring_id : undefined}
      currentInstructorId={ts.instructor_id}
      instructors={instructors}
      colorOf={colorOf}
      clinicId={activeClinicId!}
    >
      <button className="px-2 py-1.5 rounded border text-[11px] hover:bg-muted inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: ts.instructor_id ? colorOf(ts.instructor_id) : 'hsl(var(--muted-foreground))' }} />
        Prof.
      </button>
    </InstructorPicker>
  );

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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Total" value={stats.total} icon={CalendarDays} />
            <Stat label="Aulas marcadas" value={stats.classes} icon={CheckCircle2} tone="success" />
            <Stat label="Sem professor" value={stats.uncovered} icon={AlertTriangle} tone={stats.uncovered > 0 ? 'danger' : 'muted'} />
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

              <Button size="sm" variant="outline" onClick={() => setAvailOpen(true)}>
                <UserCog className="h-4 w-4 mr-1" />Disponibilidade
              </Button>
              {view === 'day' && (
                <Button
                  size="sm"
                  variant={selectionMode ? 'default' : 'outline'}
                  onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
                >
                  <ListChecks className="h-4 w-4 mr-1" />
                  {selectionMode ? 'Cancelar seleção' : 'Selecionar'}
                </Button>
              )}
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
          <div className="space-y-3">
            {rooms.length > 0 && <RoomsLegend rooms={rooms as any[]} roomColorOf={roomColorOf} />}
            <CalendarTimeline
              days={weekDays}
              startHour={6}
              endHour={22}
              slotsForDay={(d) => slotsForDay(d).map(toTimelineSlot)}
              studentName={studentName}
              instructorName={instructorName}
              roomName={roomName}
              roomColorOf={roomColorOf}
              colorOf={colorOf}
              onCellClick={handleCellClick}
              onSlotClick={handleTimelineSlotClick}
              onDelete={handleTimelineDelete}
              renderInstructorPicker={renderTimelineInstructorPicker}
            />
          </div>
        ) : view === 'month' ? (
          <div className="space-y-3">
            {rooms.length > 0 && <RoomsLegend rooms={rooms as any[]} roomColorOf={roomColorOf} />}
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
                  // salas únicas usadas no dia
                  const roomIds = Array.from(new Set(slots.map((s) => s.room_id).filter(Boolean))) as string[];
                  return (
                    <button
                      key={d.toISOString()}
                      onClick={() => { setDay(d); setView('day'); }}
                      className={cn(
                        'min-h-[100px] p-1.5 rounded border text-left flex flex-col gap-1 hover:border-primary transition',
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
                      {/* faixa de salas usadas */}
                      {roomIds.length > 0 && (
                        <div className="flex items-center gap-px h-1 -mt-0.5" title={`${roomIds.length} sala(s) usada(s)`}>
                          {roomIds.map((rid) => (
                            <span
                              key={rid}
                              className="flex-1 rounded-sm"
                              style={{ background: roomColorOf(rid) || 'hsl(var(--muted))' }}
                            />
                          ))}
                        </div>
                      )}
                      <div className="space-y-0.5 flex-1">
                        {visible.map((s) => {
                          const hasGrade = !!s.appointment?.sequence_id;
                          const rcolor = roomColorOf(s.room_id);
                          return (
                            <div
                              key={s.key}
                              className={cn(
                                'text-[9px] px-1 py-0.5 rounded truncate border flex items-center gap-1',
                                s.isVirtual && 'border-dashed',
                                s.isProjected && 'border-dashed border-amber-500/50 bg-amber-500/5',
                                s.isOpen && 'border-dashed border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
                                !s.isOpen && (hasGrade ? 'bg-primary/10 text-primary' : 'bg-muted'),
                              )}
                            >
                              {rcolor && (
                                <span
                                  className="h-1.5 w-1.5 rounded-full shrink-0"
                                  style={{ background: rcolor }}
                                  title={roomName(s.room_id) || ''}
                                />
                              )}
                              <span className="truncate">
                                {format(parseISO(s.scheduled_at), 'HH:mm')} {s.isOpen ? (roomName(s.room_id) || 'livre') : studentName(s.student_id).split(' ')[0]}
                              </span>
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
          </div>
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

            {/* Cobertura por hora — bate o olho e vê quem está e quantos alunos */}
            <div className="mb-4 p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">
                  Cobertura do dia
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500/70" />com prof.</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-destructive/70" />sem prof.</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />alunos</span>
                </div>
              </div>
              <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
                {dayCoverage.map((c) => {
                  const covered = c.shifts.length > 0;
                  const danger = c.hasAnyClass && !covered;
                  return (
                    <button
                      key={c.hour}
                      onClick={() => openNewClassAt(day, `${String(c.hour).padStart(2, '0')}:00`)}
                      className={cn(
                        'group flex flex-col items-stretch rounded border p-1 text-[10px] transition hover:ring-2 hover:ring-primary/30',
                        danger && 'bg-destructive/10 border-destructive/40',
                        !danger && covered && 'bg-emerald-500/5 border-emerald-500/30',
                        !covered && !danger && 'bg-muted/30 border-dashed',
                      )}
                      title={
                        covered
                          ? `${c.shifts.map((s: any) => instructorName(s.instructor_id)).filter(Boolean).join(', ')}\n${c.studentsCount} aluno(s)`
                          : c.hasAnyClass
                            ? `⚠ ${c.studentsCount} aula(s) sem professor de plantão`
                            : 'Sem professor / sem aulas'
                      }
                    >
                      <div className="font-bold text-center">{String(c.hour).padStart(2, '0')}h</div>
                      <div className="flex gap-px h-1.5 mt-0.5">
                        {covered ? (
                          c.shifts.slice(0, 4).map((s: any, i: number) => (
                            <span key={i} className="flex-1 rounded-sm" style={{ background: colorOf(s.instructor_id) }} />
                          ))
                        ) : (
                          <span className={cn('flex-1 rounded-sm', danger ? 'bg-destructive/60' : 'bg-muted-foreground/20')} />
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-0.5 mt-1 text-muted-foreground">
                        <Users className="h-2.5 w-2.5" />
                        <span className={cn('font-semibold', danger && 'text-destructive', c.studentsCount === 0 && 'opacity-40')}>
                          {c.studentsCount}
                        </span>
                      </div>
                      {danger && <AlertTriangle className="h-2.5 w-2.5 text-destructive mx-auto mt-0.5" />}
                    </button>
                  );
                })}
              </div>
              {stats.uncovered > 0 && (
                <div className="mt-2 text-[11px] text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.uncovered} aula{stats.uncovered !== 1 ? 's' : ''} sem professor de plantão neste dia.
                  <button onClick={() => setAvailOpen(true)} className="underline ml-1">cadastrar disponibilidade</button>
                </div>
              )}
            </div>

            {/* Banner do modo seleção */}
            {selectionMode && (
              <div className="mb-3 px-3 py-2 rounded-md border border-primary/30 bg-primary/5 text-xs flex items-center gap-2 flex-wrap">
                <ListChecks className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold">Modo seleção</span>
                <span className="text-muted-foreground">
                  Clique em horários existentes para excluir, ou em células vazias para criar.
                </span>
                <span className="ml-auto">
                  <Badge variant="secondary">{selectedSlotKeys.size} p/ excluir</Badge>{' '}
                  <Badge variant="secondary">{selectedEmptyKeys.size} p/ criar</Badge>
                </span>
              </div>
            )}

            {/* Timeline visual do dia — uma coluna por sala */}
            <RoomsTimeline
              day={day}
              rooms={rooms as any}
              startHour={6}
              endHour={22}
              hourHeight={64}
              slots={daySlots.map(toTimelineSlot)}
              studentName={studentName}
              instructorName={instructorName}
              colorOf={colorOf}
              onCellClick={(d, hour, roomId) => openNewClassAt(d, `${String(hour).padStart(2, '0')}:00`, roomId)}
              onSlotClick={handleTimelineSlotClick}
              onDelete={handleTimelineDelete}
              renderInstructorPicker={renderTimelineInstructorPicker}
              selectionMode={selectionMode}
              selectedSlotKeys={selectedSlotKeys}
              selectedEmptyKeys={selectedEmptyKeys}
              onToggleSlot={toggleSlotSel}
              onToggleEmpty={toggleEmptySel}
            />

            {/* Barra flutuante de ações de seleção */}
            {selectionMode && (selectedSlotKeys.size > 0 || selectedEmptyKeys.size > 0) && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border shadow-lg rounded-full px-3 py-2 flex items-center gap-2">
                {selectedSlotKeys.size > 0 && (
                  <Button size="sm" variant="destructive" onClick={deleteSelected}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir {selectedSlotKeys.size}
                  </Button>
                )}
                {selectedEmptyKeys.size > 0 && (
                  <Button size="sm" onClick={createSelectedEmpty}>
                    <Plus className="h-4 w-4 mr-1" />
                    Criar {selectedEmptyKeys.size} horário(s)
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={exitSelection}>Cancelar</Button>
              </div>
            )}
          </Card>
        )}

        {/* Legenda */}
        <Card className="p-3 text-xs text-muted-foreground space-y-2">
          <div className="flex flex-wrap gap-4">
            <span className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border bg-card" />Aula real</span>
            <span className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-dashed" />Horário fixo (virtual)</span>
            <span className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-dashed border-amber-500 bg-amber-500/10" />Projeção pós-contrato</span>
            <span className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-amber-600" />Sem grade definida</span>
            <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-primary" />Grade pronta</span>
            <span className="flex items-center gap-1.5"><Users className="h-3 w-3" />Ocupação da sala</span>
            <span className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-destructive" />Sem professor de plantão</span>
          </div>
          {instructors.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2 border-t">
              <span className="font-semibold text-muted-foreground">Professores:</span>
              {instructors.map((i) => (
                <span key={i.user_id} className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded" style={{ background: colorOf(i.user_id) }} />
                  {i.name}
                </span>
              ))}
              <button onClick={() => setAvailOpen(true)} className="text-primary underline ml-2">editar cores</button>
            </div>
          )}
        </Card>
      </div>

      {/* Dialog: disponibilidade + cores dos professores */}
      {user && activeClinicId && (
        <InstructorAvailabilityDialog
          open={availOpen}
          onClose={() => setAvailOpen(false)}
          clinicId={activeClinicId}
          userId={user.id}
          instructors={instructors}
          rooms={rooms as any}
        />
      )}

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
          initialRoomId={newClassRoomId ?? null}
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
function Stat({ label, value, icon: Icon, tone = 'default' }: { label: string; value: number; icon: any; tone?: 'default' | 'success' | 'warn' | 'muted' | 'danger' }) {
  const toneCls = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warn: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    muted: 'bg-muted text-muted-foreground',
    danger: 'bg-destructive/15 text-destructive',
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

function RoomsLegend({ rooms, roomColorOf }: { rooms: any[]; roomColorOf: (id: string | null | undefined) => string | null }) {
  if (!rooms || rooms.length === 0) return null;
  return (
    <Card className="p-2 px-3">
      <div className="flex items-center gap-3 flex-wrap text-[11px]">
        <span className="inline-flex items-center gap-1 text-muted-foreground font-semibold uppercase tracking-wide text-[10px]">
          <DoorOpen className="h-3 w-3" /> Salas
        </span>
        {rooms.map((r) => (
          <span key={r.id} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm border"
              style={{ background: roomColorOf(r.id) || 'hsl(var(--muted))' }}
            />
            <span className="font-medium">{r.name}</span>
            {r.capacity ? <span className="text-muted-foreground">· cap. {r.capacity}</span> : null}
          </span>
        ))}
      </div>
    </Card>
  );
}

function SlotMini({ slot, studentName, sequenceName, roomName, instructorName, instructorColor, occupancy, uncovered, onClick, instructorPicker }: {
  slot: MergedSlot;
  studentName: string;
  sequenceName: string | null | undefined;
  roomName?: string | null;
  instructorName?: string | null;
  instructorColor?: string;
  occupancy?: { used: number; cap: number } | null;
  uncovered?: boolean;
  onClick: () => void;
  instructorPicker?: React.ReactNode;
}) {
  const time = format(parseISO(slot.scheduled_at), 'HH:mm');
  const status = slot.appointment?.status;
  const hasGrade = !!sequenceName;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      style={instructorColor && !slot.isOpen ? { borderLeftColor: uncovered ? 'hsl(var(--destructive))' : instructorColor, borderLeftWidth: 3 } : undefined}
      className={cn(
        'w-full text-left p-1.5 rounded border text-[11px] hover:bg-muted/50 transition group block cursor-pointer',
        slot.isVirtual && 'border-dashed',
        slot.isProjected && 'border-dashed border-amber-500/50 bg-amber-500/5',
        slot.isOpen && 'border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10',
        uncovered && !slot.isOpen && 'bg-destructive/5',
        status === 'completed' && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold">{time}</span>
        <div className="flex items-center gap-1">
          {instructorPicker}
          {uncovered && (
            <span title="Sem professor de plantão" className="text-[9px] font-bold px-1 rounded bg-destructive/15 text-destructive flex items-center gap-0.5">
              <AlertTriangle className="h-2.5 w-2.5" />sem prof
            </span>
          )}
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
    </div>
  );
}
