import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, LogIn, Trash2,
  Repeat, ListChecks, Sparkles, AlertTriangle, RefreshCw, Filter, DoorOpen, Users, UserCog,
  Maximize2, Minimize2,
} from 'lucide-react';
import { format, addDays, addMonths, isSameDay, parseISO, startOfWeek, startOfMonth, endOfMonth, endOfWeek, isSameMonth, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/ConfirmProvider';
import { SlotGradeDialog } from '@/components/clinic/SlotGradeDialog';
import { NewClassDialog } from '@/components/clinic/NewClassDialog';
import { AvailableSlotsPickerDialog } from '@/components/clinic/AvailableSlotsPickerDialog';
import { InstructorAvailabilityDialog } from '@/components/clinic/InstructorAvailabilityDialog';
import { InstructorPicker } from '@/components/clinic/InstructorPicker';
import { CalendarTimeline, type TimelineSlot, makeWeekEmptyKey, parseWeekEmptyKey, type WeekEmptyKey } from '@/components/clinic/CalendarTimeline';
import { RoomsTimeline, makeEmptyKey, parseEmptyKey, type EmptyCellKey } from '@/components/clinic/RoomsTimeline';
import { BulkAssignDialog, type BulkAssignValues } from '@/components/clinic/BulkAssignDialog';
import { MonthMarqueeGrid } from '@/components/clinic/MonthMarqueeGrid';
import { InstructorDragPalette, CLEAR_INSTRUCTOR, INSTRUCTOR_DRAG_TYPE } from '@/components/clinic/InstructorDragPalette';
import { PageMotion } from '@/components/PageMotion';
import { useBlockedPeriods, findActiveBlockAt } from '@/hooks/useBlockedPeriods';

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
  /** Slot bloqueado (mantido na grade, sem prof, ninguém agenda) */
  isBlocked?: boolean;
  bookable_slot_id?: string;
  /** Bloqueio padrão recorrente (almoço etc). Quando setado, o slot é virtual e não persistido. */
  blockedPeriodId?: string;
  blockedPeriodName?: string;
  blockedPeriodColor?: string | null;
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
  const navigate = useNavigate();
  const { activeClinicId } = useUserRoles();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const handlePlanClick = useCallback((s: any) => {
    if (!s?.appointment_id) return;
    const d = new Date(s.scheduled_at ?? Date.now());
    const dateStr = format(d, 'yyyy-MM-dd');
    navigate(`/clinica/planejar?date=${dateStr}&appointment=${s.appointment_id}`);
  }, [navigate]);
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [day, setDay] = useState(() => new Date());
  const [simulateRenewal, setSimulateRenewal] = useState(true);
  const [renewalMonths, setRenewalMonths] = useState(3);
  const [filterInstructor, setFilterInstructor] = useState<string>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [focusMode, setFocusMode] = useState(false);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  const toggleFocusMode = useCallback(async () => {
    const el = fullscreenRef.current;
    try {
      if (!document.fullscreenElement) {
        if (el?.requestFullscreen) {
          await el.requestFullscreen();
        }
        setFocusMode(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setFocusMode(false);
      }
    } catch {
      // Fallback: alterna apenas o layout caso a Fullscreen API falhe
      setFocusMode((v) => !v);
    }
  }, []);

  // Sincroniza estado quando o usuário sai do fullscreen via ESC
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setFocusMode(false);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

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
  const { data: bookableSlots = [], create: createBookable, remove: removeBookable, block: blockBookable, unblock: unblockBookable } = useBookableSlots(activeClinicId, rangeFromISO, rangeToISO);
  const instructors = useMemo(
    () => staff.filter((s) => s.role === 'instructor' || s.role === 'clinic_admin').map((s) => ({ user_id: s.user_id, name: s.name })),
    [staff],
  );
  const { data: recurring = [] } = useRecurringSchedules(activeClinicId);
  const { create: createPresc } = usePrescriptions({ clinicId: activeClinicId });
  const { data: availability = [] } = useInstructorAvailability(activeClinicId);
  const { data: instructorColors = [] } = useInstructorColors(activeClinicId);
  const { periods: blockedPeriods, exceptions: blockedExceptions, addException, removeException } = useBlockedPeriods(activeClinicId);
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
    const bookableById = new Map((bookableSlots as any[]).map((b) => [b.id, b]));
    const merged: MergedSlot[] = dayApps.map((a) => {
      const fromRec = (a as any).recurring_schedule_id ? recById.get((a as any).recurring_schedule_id) : null;
      const fromBookable = (a as any).bookable_slot_id ? bookableById.get((a as any).bookable_slot_id) : null;
      return {
        key: `real-${a.id}`,
        scheduled_at: a.scheduled_at,
        duration_minutes: a.duration_minutes,
        student_id: a.student_id,
        equipment_id: a.equipment_id ?? fromBookable?.equipment_id ?? null,
        instructor_id: a.instructor_id,
        room_id: (fromRec as any)?.room_id ?? fromBookable?.room_id ?? null,
        notes: a.notes,
        appointment: a as any,
        bookable_slot_id: (a as any).bookable_slot_id ?? undefined,
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
      const alreadyBooked = dayApps.some((a) => (a as any).bookable_slot_id === b.id && a.status !== 'cancelled');
      if (alreadyBooked) return;
      const t = parseISO(b.scheduled_at);
      const k = `${t.getHours()}:${t.getMinutes()}|${b.room_id ?? ''}|${b.equipment_id ?? ''}`;
      const isBlocked = b.blocked === true;
      // também considera ocupado se já existe aula no mesmo horário+sala (mesmo sem equipamento)
      const sameTimeRoom = merged.some((m) => {
        const mt = parseISO(m.scheduled_at);
        return mt.getHours() === t.getHours() && mt.getMinutes() === t.getMinutes() && (m.room_id ?? '') === (b.room_id ?? '');
      });
      // Slots bloqueados sempre aparecem (mesmo se houver outra aula no mesmo horário)
      if (!isBlocked && (occupiedKeys.has(k) || sameTimeRoom)) return;
      merged.push({
        key: `open-${b.id}`,
        scheduled_at: b.scheduled_at,
        duration_minutes: b.duration_minutes,
        student_id: null,
        equipment_id: b.equipment_id,
        instructor_id: isBlocked ? null : b.instructor_id,
        room_id: b.room_id,
        notes: b.notes,
        isOpen: !isBlocked,
        isBlocked,
        bookable_slot_id: b.id,
      });
    });

    // ===== Bloqueios padrão recorrentes (ex: almoço) =====
    // Para cada hora dentro de cada bloqueio ativo (não excepcionado naquele dia),
    // injeta um slot virtual isBlocked. Se o bloqueio tem room_id, só naquela sala;
    // caso contrário, em todas as salas (ou null).
    const targetRoomIds: (string | null)[] = (rooms as any[]).length > 0
      ? (rooms as any[]).map((r) => r.id as string)
      : [null];
    blockedPeriods
      .filter((bp) => bp.active && bp.day_of_week === d.getDay())
      .forEach((bp) => {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const released = blockedExceptions.some((e) => e.blocked_period_id === bp.id && e.exception_date === dateStr);
        if (released) return;
        const [sh, sm] = bp.start_time.split(':').map(Number);
        const [eh, em] = bp.end_time.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        const roomIds = bp.room_id ? [bp.room_id] : targetRoomIds;
        // Quebra em fatias de 1 hora alinhadas
        for (let m = startMin; m < endMin; m += 60) {
          const sliceEnd = Math.min(m + 60, endMin);
          const dur = sliceEnd - m;
          const sched = new Date(d);
          sched.setHours(Math.floor(m / 60), m % 60, 0, 0);
          roomIds.forEach((rid) => {
            // Sempre injeta o bloqueio — ele é renderizado por cima das aulas existentes
            // (z-index maior na timeline) para sinalizar visualmente o conflito.
            merged.push({
              key: `bp-${bp.id}-${sched.toISOString()}-${rid ?? 'all'}`,
              scheduled_at: sched.toISOString(),
              duration_minutes: dur,
              student_id: null,
              equipment_id: null,
              instructor_id: null,
              room_id: rid,
              notes: bp.name,
              isBlocked: true,
              blockedPeriodId: bp.id,
              blockedPeriodName: bp.name,
              blockedPeriodColor: bp.color,
            });
          });
        }
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
  const [newClassInstructorId, setNewClassInstructorId] = useState<string | null | undefined>(undefined);
  const [newClassDuration, setNewClassDuration] = useState<number | null | undefined>(undefined);
  const [newClassBookableSlotId, setNewClassBookableSlotId] = useState<string | null | undefined>(undefined);
  const [availPickerOpen, setAvailPickerOpen] = useState(false);
  const openNewClassAt = (d: Date, time?: string, roomId?: string | null, instructorId?: string | null, durationMinutes?: number | null, bookableSlotId?: string | null) => {
    setDay(d);
    setNewClassTime(time);
    setNewClassRoomId(roomId);
    setNewClassInstructorId(instructorId);
    setNewClassDuration(durationMinutes);
    setNewClassBookableSlotId(bookableSlotId);
    setNewClassOpen(true);
  };

  /** Verifica se há ao menos um professor alocado na grade naquele dia/hora.
   *  Considera disponibilidade recorrente (instructor_availability) e bookable_slots. */
  const hasInstructorAt = (d: Date, hour: number, minute = 0, durationMin = 60, roomId?: string | null) => {
    const dow = d.getDay();
    const startMin = hour * 60 + minute;
    const endMin = startMin + durationMin;
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };
    // 1) Disponibilidade recorrente
    const hasAvail = (availability as any[]).some((a) => {
      if (!a.active) return false;
      if (a.day_of_week !== dow) return false;
      if (roomId && a.room_id && a.room_id !== roomId) return false;
      const s = toMin(a.start_time);
      const e = toMin(a.end_time);
      return s < endMin && e > startMin;
    });
    if (hasAvail) return true;
    // 2) Bookable slots ativos com instrutor cobrindo o intervalo
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
    const targetStart = new Date(d); targetStart.setHours(hour, minute, 0, 0);
    const targetEnd = new Date(targetStart.getTime() + durationMin * 60 * 1000);
    return (bookableSlots as any[]).some((s) => {
      if (!s.instructor_id) return false;
      if (s.active === false || s.blocked === true) return false;
      if (roomId && s.room_id && s.room_id !== roomId) return false;
      const sStart = new Date(s.scheduled_at).getTime();
      if (sStart < dayStart.getTime() || sStart > dayEnd.getTime()) return false;
      const sEnd = sStart + (s.duration_minutes || 50) * 60 * 1000;
      return sStart < targetEnd.getTime() && sEnd > targetStart.getTime();
    });
  };

  const findInstructorFor = (d: Date, hour: number, minute = 0, durationMin = 60, roomId?: string | null) => {
    const dow = d.getDay();
    const startMin = hour * 60 + minute;
    const endMin = startMin + durationMin;
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };
    const avail = (availability as any[]).find((a) => {
      if (!a.active || !a.instructor_id) return false;
      if (a.day_of_week !== dow) return false;
      if (roomId && a.room_id && a.room_id !== roomId) return false;
      const s = toMin(a.start_time);
      const e = toMin(a.end_time);
      return s <= startMin && e >= endMin;
    });
    if (avail?.instructor_id) return avail.instructor_id as string;

    const targetStart = new Date(d); targetStart.setHours(hour, minute, 0, 0);
    const targetEnd = new Date(targetStart.getTime() + durationMin * 60 * 1000);
    const slot = (bookableSlots as any[]).find((s) => {
      if (!s.instructor_id || s.active === false || s.blocked === true) return false;
      if (roomId && s.room_id && s.room_id !== roomId) return false;
      const sStart = new Date(s.scheduled_at).getTime();
      const sEnd = sStart + (s.duration_minutes || 50) * 60 * 1000;
      return sStart <= targetStart.getTime() && sEnd >= targetEnd.getTime();
    });
    return slot?.instructor_id ?? null;
  };

  const tryOpenNewClassAt = (d: Date, time?: string, roomId?: string | null) => {
    if (time) {
      const [h, m] = time.split(':').map(Number);
      // Bloqueia horários passados
      const cellEnd = new Date(d);
      cellEnd.setHours(h, (m || 0) + 60, 0, 0);
      if (cellEnd.getTime() <= Date.now()) {
        toast.error('Não é possível agendar em horários que já passaram.');
        return;
      }
      if (!hasInstructorAt(d, h, m || 0, 60, roomId)) {
        toast.error('Sem professor alocado nesse horário. Defina a disponibilidade do professor antes de criar uma aula aqui.');
        return;
      }
    }
    const instructorId = time ? findInstructorFor(d, Number(time.split(':')[0]), Number(time.split(':')[1] || 0), 60, roomId) : null;
    openNewClassAt(d, time, roomId, instructorId, 50, null);
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
    setSelectionMode(true);
    setSelectedSlotKeys((prev) => {
      const next = new Set(prev);
      if (next.has(s.key)) next.delete(s.key);
      else next.add(s.key);
      return next;
    });
  };
  const toggleEmptySel = (k: EmptyCellKey) => {
    setSelectionMode(true);
    setSelectedEmptyKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };
  const replaceSelection = (slotKeys: Set<string>, emptyKeys: Set<EmptyCellKey>) => {
    setSelectionMode(true);
    setSelectedSlotKeys(slotKeys);
    setSelectedEmptyKeys(emptyKeys);
  };
  const addSelection = (slotKeys: Set<string>, emptyKeys: Set<EmptyCellKey>) => {
    setSelectionMode(true);
    setSelectedSlotKeys((prev) => {
      const n = new Set(prev);
      slotKeys.forEach((k) => n.add(k));
      return n;
    });
    setSelectedEmptyKeys((prev) => {
      const n = new Set(prev);
      emptyKeys.forEach((k) => n.add(k));
      return n;
    });
  };

  /** Slots visíveis na visualização atual (dia/semana/mês), usados para mapear seleção. */
  const visibleSlotsForSelection = (): MergedSlot[] => {
    if (view === 'day') return daySlots;
    if (view === 'week') return weekDays.flatMap(slotsForDay);
    return monthDays.flatMap(slotsForDay);
  };

  const deleteSelected = async () => {
    if (selectedSlotKeys.size === 0) return;
    if (!(await confirm({ title: 'Bloquear horários', description: `Bloquear ${selectedSlotKeys.size} horário(s) selecionado(s)? (aulas serão canceladas)`, destructive: true, confirmText: 'Bloquear' }))) return;
    const tsList = visibleSlotsForSelection().map(toTimelineSlot).filter((t) => selectedSlotKeys.has(t.key));
    for (const t of tsList) {
      if (t.appointment_id) await remove.mutateAsync(t.appointment_id);
      else if (t.bookable_slot_id) await blockBookable.mutateAsync(t.bookable_slot_id);
    }
    await qc.invalidateQueries({ queryKey: ['bookable-slots'] });
    await qc.invalidateQueries({ queryKey: ['appointments'] });
    toast.success(`${tsList.length} horário(s) bloqueado(s)`);
    exitSelection();
  };

  // ===== Atribuição em massa (criar / reatribuir) =====
  const [bulkOpen, setBulkOpen] = useState<null | 'create' | 'reassign'>(null);

  const createSelectedEmpty = async (values: BulkAssignValues) => {
    console.log('[GradeMaster] createSelectedEmpty', { count: selectedEmptyKeys.size, values, activeClinicId, hasUser: !!user });
    if (!activeClinicId || !user) {
      toast.error('Sessão sem clínica ativa. Recarregue a página.');
      return;
    }
    if (selectedEmptyKeys.size === 0) return;
    let count = 0;
    const conflicts: string[] = [];
    const otherErrors: string[] = [];
    for (const k of selectedEmptyKeys) {
      const { date, hour, roomId: cellRoomId } = parseEmptyKey(k);
      const sched = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);
      try {
        await createBookable.mutateAsync({
          clinic_id: activeClinicId,
          scheduled_at: sched.toISOString(),
          duration_minutes: values.durationMinutes,
          equipment_id: null,
          instructor_id: values.instructorId,
          room_id: values.roomId ?? cellRoomId,
          capacity: 1,
          notes: null,
          created_by: user.id,
        } as any);
        count++;
      } catch (e: any) {
        const msg = e?.message || 'Erro ao criar horário';
        const label = format(sched, 'dd/MM HH:mm');
        if (/professor já/i.test(msg) || /already/i.test(msg)) {
          conflicts.push(`${label} — ${msg.replace(/^.*?:\s*/, '')}`);
        } else {
          otherErrors.push(`${label}: ${msg}`);
        }
        console.error('[GradeMaster] createBookable error', e);
      }
    }
    await qc.invalidateQueries({ queryKey: ['bookable-slots'] });
    await qc.invalidateQueries({ queryKey: ['appointments'] });
    if (count > 0) toast.success(`${count} horário(s) criado(s)`);
    if (conflicts.length > 0) {
      toast.warning(
        `${conflicts.length} horário(s) ignorado(s) — professor já ocupado`,
        { description: conflicts.slice(0, 5).join('\n') + (conflicts.length > 5 ? `\n…e mais ${conflicts.length - 5}` : ''), duration: 8000 }
      );
    }
    if (otherErrors.length > 0) {
      toast.error(`${otherErrors.length} falha(s)`, { description: otherErrors.slice(0, 5).join('\n'), duration: 8000 });
    }
    if (count === 0 && conflicts.length === 0 && otherErrors.length === 0) {
      toast.info('Nenhum horário processado.');
    }
    exitSelection();
  };

  const reassignSelected = async (values: BulkAssignValues) => {
    if (selectedSlotKeys.size === 0) return;
    const tsList = visibleSlotsForSelection().map(toTimelineSlot).filter((t) => selectedSlotKeys.has(t.key));
    let updated = 0;
    const conflicts: string[] = [];
    const otherErrors: string[] = [];
    for (const t of tsList) {
      const patch: any = {};
      if (values.instructorId !== null) patch.instructor_id = values.instructorId;
      if (values.roomId !== null) patch.room_id = values.roomId;
      if (Object.keys(patch).length === 0) continue;
      try {
        if (t.appointment_id) {
          const apptPatch: any = {};
          if (patch.instructor_id !== undefined) apptPatch.instructor_id = patch.instructor_id;
          if (Object.keys(apptPatch).length > 0) {
            const { error } = await supabase.from('class_appointments').update(apptPatch).eq('id', t.appointment_id);
            if (error) throw error;
          }
        } else if (t.bookable_slot_id) {
          const { error } = await supabase.from('bookable_slots' as any).update(patch).eq('id', t.bookable_slot_id);
          if (error) throw error;
        } else {
          continue;
        }
        updated++;
      } catch (e: any) {
        const msg = e?.message || 'Erro ao atualizar';
        const label = t.scheduled_at ? format(new Date(t.scheduled_at), 'dd/MM HH:mm') : '';
        if (/professor já/i.test(msg)) {
          conflicts.push(`${label} — ${msg.replace(/^.*?:\s*/, '')}`);
        } else {
          otherErrors.push(`${label}: ${msg}`);
        }
      }
    }
    await qc.invalidateQueries({ queryKey: ['bookable-slots'] });
    await qc.invalidateQueries({ queryKey: ['appointments'] });
    if (updated > 0) toast.success(`${updated} horário(s) atualizado(s)`);
    if (conflicts.length > 0) {
      toast.warning(
        `${conflicts.length} horário(s) ignorado(s) — professor já ocupado`,
        { description: conflicts.slice(0, 5).join('\n') + (conflicts.length > 5 ? `\n…e mais ${conflicts.length - 5}` : ''), duration: 8000 }
      );
    }
    if (otherErrors.length > 0) {
      toast.error(`${otherErrors.length} falha(s)`, { description: otherErrors.slice(0, 5).join('\n'), duration: 8000 });
    }
    exitSelection();
  };

  /**
   * Seleciona toda a coluna de uma sala (todas as horas 6..21) para um conjunto
   * de dias visíveis e abre o BulkAssignDialog. Se o slot daquele horário já
   * existir (slot/aula), entra em selectedSlotKeys (modo reassign);
   * caso contrário entra em selectedEmptyKeys (modo create).
   */
  const selectRoomColumn = (roomId: string | null, targetDays: Date[]) => {
    const HOUR_START = 6;
    const HOUR_END = 22;
    const newEmpty = new Set<EmptyCellKey>();
    const newSlots = new Set<string>();
    const allVisible = visibleSlotsForSelection();
    targetDays.forEach((d) => {
      for (let h = HOUR_START; h < HOUR_END; h++) {
        // Slot existente neste horário+sala?
        const existing = allVisible.find((s) => {
          if ((s.room_id ?? null) !== roomId) return false;
          if (!isSameDay(parseISO(s.scheduled_at), d)) return false;
          return parseISO(s.scheduled_at).getHours() === h;
        });
        if (existing) {
          newSlots.add(existing.key);
        } else {
          newEmpty.add(makeEmptyKey(d, h, roomId));
        }
      }
    });
    console.log('[GradeMaster] selectRoomColumn', { roomId, targetDays: targetDays.map((d) => d.toISOString().slice(0,10)), newEmpty: newEmpty.size, newSlots: newSlots.size });
    if (newEmpty.size === 0 && newSlots.size === 0) {
      toast.info('Nenhum horário disponível nessa coluna.');
      return;
    }
    replaceSelection(newSlots, newEmpty);
    // Prioriza criar horários vazios; se só houver existentes, vai para reassign
    if (newEmpty.size > 0) setBulkOpen('create');
    else setBulkOpen('reassign');
  };

  // ===== Drag & drop de professor =====
  const [draggingInstructorId, setDraggingInstructorId] = useState<string | null>(null);
  const resolveInstructor = (raw: string): string | null => raw === CLEAR_INSTRUCTOR ? null : raw;

  const dropInstructorOnSlot = async (raw: string, ts: TimelineSlot) => {
    if (!activeClinicId || !user) return;
    const newInstructorId = resolveInstructor(raw);
    try {
      if (ts.appointment_id) {
        const { error } = await supabase.from('class_appointments')
          .update({ instructor_id: newInstructorId })
          .eq('id', ts.appointment_id);
        if (error) throw error;
      } else if (ts.bookable_slot_id) {
        const { error } = await supabase.from('bookable_slots' as any)
          .update({ instructor_id: newInstructorId })
          .eq('id', ts.bookable_slot_id);
        if (error) throw error;
      } else if (ts.recurring_id) {
        // Materializa a virtual como appointment já com o novo professor
        const original = (view === 'day' ? daySlots : weekDays.flatMap(slotsForDay)).find((s) => s.key === ts.key);
        if (!original?.student_id) { setDraggingInstructorId(null); return; }
        const { error } = await supabase.from('class_appointments').insert({
          clinic_id: activeClinicId,
          student_id: original.student_id,
          equipment_id: original.equipment_id,
          instructor_id: newInstructorId,
          scheduled_at: original.scheduled_at,
          duration_minutes: original.duration_minutes,
          notes: original.notes,
          created_by: user.id,
          recurring_schedule_id: original.recurring_id || null,
        });
        if (error) throw error;
      }
      toast.success(newInstructorId ? 'Professor atribuído' : 'Professor removido');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atribuir professor');
    } finally {
      setDraggingInstructorId(null);
    }
  };

  const dropInstructorOnCell = async (raw: string, d: Date, hour: number, roomId: string | null = null) => {
    console.log('[GradeMaster] dropInstructorOnCell', { raw, day: d.toISOString(), hour, roomId, activeClinicId, hasUser: !!user });
    if (!activeClinicId || !user) {
      toast.error('Sessão sem clínica ativa. Recarregue a página.');
      setDraggingInstructorId(null);
      return;
    }
    const newInstructorId = resolveInstructor(raw);
    if (!newInstructorId) {
      toast.info('Arraste um professor para criar um horário.');
      setDraggingInstructorId(null);
      return;
    }
    const sched = new Date(d);
    sched.setHours(hour, 0, 0, 0);
    try {
      await createBookable.mutateAsync({
        clinic_id: activeClinicId,
        scheduled_at: sched.toISOString(),
        duration_minutes: 50,
        equipment_id: null,
        instructor_id: newInstructorId,
        room_id: roomId,
        capacity: 1,
        notes: null,
        created_by: user.id,
      } as any);
      await qc.invalidateQueries({ queryKey: ['bookable-slots'] });
      toast.success(`Horário criado em ${format(sched, 'dd/MM HH:mm')}`);
    } catch (e: any) {
      console.error('[GradeMaster] dropInstructorOnCell error', e);
      const msg = e?.message || 'Erro ao criar horário';
      if (/professor já/i.test(msg)) {
        toast.warning('Conflito de professor', {
          description: `${format(sched, 'dd/MM HH:mm')} — ${msg.replace(/^.*?:\s*/, '')}`,
          duration: 7000,
        });
      } else {
        toast.error(`Falha: ${msg}`);
      }
    } finally {
      setDraggingInstructorId(null);
    }
  };


  const openSlotDialog = (slot: MergedSlot) => {
    // Slot bloqueado → ignora clique de "abrir"
    if (slot.isBlocked) {
      toast.info('Horário bloqueado. Desbloqueie para usar.');
      return;
    }
    // Slot livre da grade → abre Nova aula com horário/sala pré-preenchidos
    if (slot.isOpen || !slot.student_id) {
      const t = parseISO(slot.scheduled_at);
      // Bloqueia horários passados
      const slotEnd = new Date(t.getTime() + (slot.duration_minutes || 50) * 60 * 1000);
      if (slotEnd.getTime() <= Date.now()) {
        toast.error('Não é possível agendar em horários que já passaram.');
        return;
      }
      const hh = String(t.getHours()).padStart(2, '0');
      const mm = String(t.getMinutes()).padStart(2, '0');
      openNewClassAt(t, `${hh}:${mm}`, (slot as any).room_id ?? null, (slot as any).instructor_id ?? null, slot.duration_minutes || 50, (slot as any).bookable_slot_id ?? null);
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
    isBlocked: s.isBlocked,
    hasGrade: !!s.appointment?.sequence_id,
    uncovered: isUncovered(s),
    appointment_id: s.appointment?.id,
    bookable_slot_id: s.bookable_slot_id,
    recurring_id: s.recurring_id,
    blockedPeriodId: s.blockedPeriodId,
    blockedPeriodName: s.blockedPeriodName,
    blockedPeriodColor: s.blockedPeriodColor,
  });

  /**
   * "Excluir" um horário NUNCA remove de fato.
   * - Bloqueio padrão (almoço etc) → cria/remove EXCEÇÃO daquela data.
   * - Aulas reais (class_appointments) → cancelamento.
   * - Slots livres (bookable_slots) → bloqueio (blocked=true).
   */
  const handleTimelineDelete = (ts: TimelineSlot) => {
    if (ts.blockedPeriodId) {
      const dt = parseISO(ts.scheduled_at);
      const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      // Como o slot só aparece quando NÃO há exceção, deletar = liberar pontualmente.
      addException.mutate({ blocked_period_id: ts.blockedPeriodId, exception_date: dateStr });
      return;
    }
    if (ts.appointment_id) {
      remove.mutate(ts.appointment_id);
    } else if (ts.bookable_slot_id) {
      if (ts.isBlocked) {
        unblockBookable.mutate(ts.bookable_slot_id);
      } else {
        blockBookable.mutate(ts.bookable_slot_id);
      }
    }
  };

  const handleTimelineSlotClick = (ts: TimelineSlot) => {
    // Reconstrói minimal MergedSlot — encontra o original
    const all = view === 'day' ? daySlots : weekDays.flatMap(slotsForDay);
    const original = all.find((s) => s.key === ts.key);
    if (original) openSlotDialog(original);
  };

  const handleCellClick = (d: Date, hour: number) => {
    tryOpenNewClassAt(d, `${String(hour).padStart(2, '0')}:00`);
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
      {!focusMode && (
        <div className="border-b bg-card/40">
          <div className="w-full px-3 sm:px-4 py-3 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Grade Master</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">· agenda da clínica</span>
          </div>
        </div>
      )}


      <div ref={fullscreenRef} className={cn(focusMode ? 'w-full h-full overflow-auto bg-background px-2 sm:px-3 py-2 space-y-2' : 'w-full px-2 sm:px-3 lg:px-4 py-4 space-y-4')}>
        {/* TOP BAR: stats + view + filters */}
        <Card className={cn(focusMode ? 'p-2 space-y-2' : 'p-4 space-y-4')}>
          {/* Stats movidos para a linha de filtros (compactos) */}

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
              <Button size="sm" onClick={() => setAvailPickerOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />Nova aula
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={toggleFocusMode}
                title={focusMode ? 'Sair do modo foco' : 'Maximizar agenda'}
              >
                {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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

              {/* Stats compactos inline */}
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <StatChip label="Total" value={stats.total} icon={CalendarDays} />
                <StatChip label="Aulas" value={stats.classes} icon={CheckCircle2} tone="success" />
                <StatChip label="Sem prof." value={stats.uncovered} icon={AlertTriangle} tone={stats.uncovered > 0 ? 'danger' : 'muted'} />
                <StatChip label="Livres" value={stats.open} icon={Plus} tone="warn" />
                <StatChip label="Projeções" value={stats.projected} icon={RefreshCw} tone="muted" />
              </div>
            </div>
          )}
        </Card>

        {/* Paleta de professores arrastáveis (visível inclusive em fullscreen) */}
        {instructors.length > 0 && (
          <div className={cn(focusMode && 'sticky top-0 z-30')}>
            <InstructorDragPalette
              instructors={instructors}
              colorOf={colorOf}
              draggingId={draggingInstructorId}
              onDragStart={(id) => setDraggingInstructorId(id)}
              onDragEnd={() => setDraggingInstructorId(null)}
            />
          </div>
        )}

        {/* CONTEÚDO */}
        {view === 'week' ? (
          <div className="space-y-3">
            {rooms.length > 0 && <RoomsLegend rooms={rooms as any[]} roomColorOf={roomColorOf} />}
            <CalendarTimeline
              days={weekDays}
              startHour={6}
              endHour={22}
              rooms={rooms as any[]}
              slotsForDay={(d) => slotsForDay(d).map(toTimelineSlot)}
              studentName={studentName}
              instructorName={instructorName}
              roomName={roomName}
              roomColorOf={roomColorOf}
              colorOf={colorOf}
              onCellClick={(d, h, roomId) => tryOpenNewClassAt(d, `${String(h).padStart(2, '0')}:00`, roomId ?? null)}
              onSlotClick={handleTimelineSlotClick}
              onDelete={handleTimelineDelete}
              onPlanClick={handlePlanClick}
              renderInstructorPicker={renderTimelineInstructorPicker}
              dragActive={draggingInstructorId !== null}
              onDropInstructorOnCell={(id, d, h, roomId) => dropInstructorOnCell(id, d, h, roomId ?? null)}
              onDropInstructorOnSlot={dropInstructorOnSlot}
              selectedSlotKeys={selectedSlotKeys}
              selectedEmptyKeys={selectedEmptyKeys}
              onReplaceSelection={replaceSelection}
              onAddSelection={addSelection}
              onMarqueeEnd={({ slotCount, emptyCount }) => {
                if (emptyCount > 0) setBulkOpen('create');
                else if (slotCount > 0) setBulkOpen('reassign');
              }}
              onRoomColumnClick={(d, roomId, allDays) => selectRoomColumn(roomId, allDays ? weekDays : [d])}
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
              <MonthMarqueeGrid
                monthDays={monthDays}
                day={day}
                roomColorOf={roomColorOf}
                roomName={roomName}
                studentName={studentName}
                slotsForDay={slotsForDay}
                draggingInstructorId={draggingInstructorId}
                dropInstructorOnCell={dropInstructorOnCell}
                selectedEmptyKeys={selectedEmptyKeys}
                onReplaceSelection={replaceSelection}
                onAddSelection={addSelection}
                onMarqueeEnd={({ emptyCount }) => {
                  if (emptyCount > 0) setBulkOpen('create');
                }}
                onCellOpen={(d) => { setDay(d); setView('day'); }}
              />
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
                      onClick={() => tryOpenNewClassAt(day, `${String(c.hour).padStart(2, '0')}:00`)}
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
              hourHeight={72}
              slots={daySlots.map(toTimelineSlot)}
              studentName={studentName}
              instructorName={instructorName}
              colorOf={colorOf}
              onCellClick={(d, hour, roomId) => tryOpenNewClassAt(d, `${String(hour).padStart(2, '0')}:00`, roomId)}
              onSlotClick={handleTimelineSlotClick}
              onDelete={handleTimelineDelete}
              onPlanClick={handlePlanClick}
              renderInstructorPicker={renderTimelineInstructorPicker}
              selectionMode={selectionMode}
              selectedSlotKeys={selectedSlotKeys}
              selectedEmptyKeys={selectedEmptyKeys}
              onToggleSlot={toggleSlotSel}
              onToggleEmpty={toggleEmptySel}
              onReplaceSelection={replaceSelection}
              onAddSelection={addSelection}
              onMarqueeEnd={({ slotCount, emptyCount }) => {
                // Abre o diálogo direto após selecionar por arrasto
                if (emptyCount > 0) setBulkOpen('create');
                else if (slotCount > 0) setBulkOpen('reassign');
              }}
              dragActive={draggingInstructorId !== null}
              onDropInstructorOnCell={dropInstructorOnCell}
              onDropInstructorOnSlot={dropInstructorOnSlot}
              onRoomHeaderClick={(roomId) => selectRoomColumn(roomId, [day])}
            />

            {/* Barra flutuante de ações de seleção */}
            {selectionMode && (selectedSlotKeys.size > 0 || selectedEmptyKeys.size > 0) && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border shadow-lg rounded-full px-3 py-2 flex items-center gap-2 flex-wrap max-w-[95vw]">
                {selectedSlotKeys.size > 0 && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setBulkOpen('reassign')}>
                      <UserCog className="h-4 w-4 mr-1" />
                      Atribuir prof./sala ({selectedSlotKeys.size})
                    </Button>
                    <Button size="sm" variant="destructive" onClick={deleteSelected}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir {selectedSlotKeys.size}
                    </Button>
                  </>
                )}
                {selectedEmptyKeys.size > 0 && (
                  <Button size="sm" onClick={() => setBulkOpen('create')}>
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
            <span className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border-2 border-l-4 border-l-primary" />Horário fixo (virtual)</span>
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
          initialInstructorId={newClassInstructorId ?? null}
          initialDurationMinutes={newClassDuration ?? null}
          initialBookableSlotId={newClassBookableSlotId ?? null}
          students={students as any}
          equipment={equipment as any}
          rooms={rooms as any}
          instructors={instructors}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['appointments'] });
            qc.invalidateQueries({ queryKey: ['bookable-slots'] });
          }}
        />
      )}

      {/* Dialog: seletor de horários disponíveis (passo 1 do botão Nova aula) */}
      {activeClinicId && (
        <AvailableSlotsPickerDialog
          open={availPickerOpen}
          onClose={() => setAvailPickerOpen(false)}
          clinicId={activeClinicId}
          rooms={rooms as any}
          instructors={instructors}
          onPick={(p) => {
            openNewClassAt(p.date, p.time, p.roomId, p.instructorId, p.durationMinutes, p.bookableSlotId);
          }}
        />
      )}

      {/* Dialog: atribuição em massa (criar slots ou reatribuir prof/sala) */}
      <BulkAssignDialog
        open={bulkOpen !== null}
        onClose={() => {
          // Fechar sem confirmar = cancelar a seleção pendente
          setBulkOpen(null);
          if (selectedEmptyKeys.size > 0 || selectedSlotKeys.size > 0) {
            exitSelection();
          }
        }}
        mode={bulkOpen === 'reassign' ? 'reassign' : 'create'}
        count={selectedEmptyKeys.size + selectedSlotKeys.size}
        rooms={rooms as any}
        instructors={instructors}
        colorOf={colorOf}
        roomColorOf={roomColorOf}
        initial={(() => {
          // Pré-preenche com a sala/prof do primeiro item selecionado.
          if (bulkOpen === 'reassign') {
            const first = visibleSlotsForSelection().map(toTimelineSlot).find((t) => selectedSlotKeys.has(t.key));
            return { roomId: first?.room_id ?? null, instructorId: first?.instructor_id ?? null, durationMinutes: 50 };
          }
          if (bulkOpen === 'create' && selectedEmptyKeys.size > 0) {
            const firstK = Array.from(selectedEmptyKeys)[0];
            const { roomId } = parseEmptyKey(firstK);
            return { roomId, instructorId: null, durationMinutes: 50 };
          }
          return undefined;
        })()}
        onConfirm={async (values) => {
          console.log('[GradeMaster] BulkAssignDialog confirm', { values, empty: selectedEmptyKeys.size, slots: selectedSlotKeys.size });
          // Sempre executa ambas as operações se houver seleção mista
          if (selectedEmptyKeys.size > 0) await createSelectedEmpty(values);
          if (selectedSlotKeys.size > 0) await reassignSelected(values);
        }}
      />
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

function StatChip({ label, value, icon: Icon, tone = 'default' }: { label: string; value: number; icon: any; tone?: 'default' | 'success' | 'warn' | 'muted' | 'danger' }) {
  const toneCls = {
    default: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    warn: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    muted: 'bg-muted text-muted-foreground border-border',
    danger: 'bg-destructive/15 text-destructive border-destructive/20',
  }[tone];
  return (
    <div className={cn('inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs', toneCls)} title={label}>
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-[11px] opacity-80 hidden md:inline">{label}</span>
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

        {/* Separador */}
        <span className="h-3 w-px bg-border mx-1" aria-hidden />

        {/* Legenda de ocupação */}
        <span className="inline-flex items-center gap-1 text-muted-foreground font-semibold uppercase tracking-wide text-[10px]">
          Ocupação
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/90" /> <span className="text-muted-foreground">livre</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> <span className="text-muted-foreground">quase cheia</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-destructive" /> <span className="text-muted-foreground">lotada</span>
        </span>
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
        slot.isVirtual && 'border-solid',
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
