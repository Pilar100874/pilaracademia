import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarDays, Clock, User, Users, MapPin, Dumbbell, Sparkles, ListOrdered,
  ChevronRight, ChevronLeft, Plus, X, GripVertical, AlertTriangle, Save,
  Search, Loader2, Library, Filter, BookmarkPlus,
} from 'lucide-react';
import { ClinicPageHeader } from '@/components/clinic/ClinicPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { useClinicRooms, useRoomEquipment } from '@/hooks/useClinicRooms';
import { useEquipment } from '@/hooks/useClinicData';
import { useSkillLevels } from '@/hooks/useClinicData';

// ----------------- Types -----------------
interface Appointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  student_id: string;
  instructor_id: string | null;
  equipment_id: string | null;
  bookable_slot_id: string | null;
  status: string;
  sequence_id: string | null;
}

interface Student {
  id: string;
  full_name: string;
  skill_level_id: string | null;
}

interface PickItem {
  id: string;
  exercise_library_id: string | null;
  name: string;
  image_urls: string[];
  sets: number;
  reps: number;
  rest_seconds: number | null;
  duration_seconds: number | null;
  notes: string | null;
}

// ----------------- Page -----------------
export default function PlanClassPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { activeClinicId } = useUserRoles();
  const qc = useQueryClient();

  const initialDateStr = searchParams.get('date');
  const initialDate = initialDateStr ? parseISO(initialDateStr) : new Date();
  const focusedAppointmentId = searchParams.get('appointment');

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(focusedAppointmentId);

  // Picked sequence items
  const [items, setItems] = useState<PickItem[]>([]);
  const [chosenEquipmentId, setChosenEquipmentId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterByLevel, setFilterByLevel] = useState(true);
  const [filterByEquipment, setFilterByEquipment] = useState(true);
  const [activeTab, setActiveTab] = useState<'exercises' | 'sequences'>('exercises');

  // Save-as-template dialog
  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplDescription, setTplDescription] = useState('');

  const { data: rooms = [] } = useClinicRooms(activeClinicId);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const { data: roomEqLinks = [] } = useRoomEquipment(activeClinicId);
  const { data: skillLevels = [] } = useSkillLevels(activeClinicId);

  // ---- Appointments of the day ----
  const { data: appointments = [], isLoading: appsLoading } = useQuery({
    queryKey: ['plan-class-appointments', activeClinicId, format(selectedDate, 'yyyy-MM-dd')],
    enabled: !!activeClinicId,
    queryFn: async () => {
      const dStart = startOfDay(selectedDate).toISOString();
      const dEnd = endOfDay(selectedDate).toISOString();
      const { data, error } = await supabase
        .from('class_appointments')
        .select('id,scheduled_at,duration_minutes,student_id,instructor_id,equipment_id,bookable_slot_id,status,sequence_id')
        .eq('clinic_id', activeClinicId!)
        .gte('scheduled_at', dStart)
        .lte('scheduled_at', dEnd)
        .neq('status', 'cancelled')
        .order('scheduled_at');
      if (error) throw error;
      return (data ?? []) as Appointment[];
    },
  });

  // ---- Students (for the day) ----
  const studentIds = useMemo(
    () => Array.from(new Set(appointments.map((a) => a.student_id))),
    [appointments]
  );

  const { data: students = [] } = useQuery({
    queryKey: ['plan-class-students', activeClinicId, studentIds.join(',')],
    enabled: !!activeClinicId && studentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_students')
        .select('id,full_name,skill_level_id')
        .in('id', studentIds);
      if (error) throw error;
      return (data ?? []) as Student[];
    },
  });

  const studentById = useMemo(() => {
    const m = new Map<string, Student>();
    students.forEach((s) => m.set(s.id, s));
    return m;
  }, [students]);

  // ---- Bookable slots (to know room of each appointment) ----
  const slotIds = useMemo(
    () => appointments.map((a) => a.bookable_slot_id).filter(Boolean) as string[],
    [appointments]
  );
  const { data: slots = [] } = useQuery({
    queryKey: ['plan-class-slots', slotIds.join(',')],
    enabled: slotIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookable_slots' as any)
        .select('id,room_id,equipment_id')
        .in('id', slotIds);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const slotById = useMemo(() => new Map(slots.map((s: any) => [s.id, s])), [slots]);

  // ---- Selected appointment ----
  const selectedApp = useMemo(
    () => appointments.find((a) => a.id === selectedAppointmentId) ?? null,
    [appointments, selectedAppointmentId]
  );
  const selectedStudent = selectedApp ? studentById.get(selectedApp.student_id) : null;
  const selectedSlot = selectedApp?.bookable_slot_id ? slotById.get(selectedApp.bookable_slot_id) : null;
  const selectedRoomId = (selectedSlot as any)?.room_id ?? null;
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  /** Todos os alunos inscritos no MESMO horário do appointment selecionado. */
  const slotmates = useMemo(() => {
    if (!selectedApp) return [] as Appointment[];
    const t = new Date(selectedApp.scheduled_at).getTime();
    return appointments
      .filter((a) => new Date(a.scheduled_at).getTime() === t)
      .sort((a, b) => {
        const an = studentById.get(a.student_id)?.full_name ?? '';
        const bn = studentById.get(b.student_id)?.full_name ?? '';
        return an.localeCompare(bn);
      });
  }, [appointments, selectedApp, studentById]);

  /** Agrupa as aulas do dia por (horário + sala) para mostrar todos os alunos juntos na lista. */
  const groupedAppointments = useMemo(() => {
    const map = new Map<string, { key: string; scheduled_at: string; room_id: string | null; apps: Appointment[] }>();
    appointments.forEach((a) => {
      const slot = a.bookable_slot_id ? (slotById.get(a.bookable_slot_id) as any) : null;
      const roomId = slot?.room_id ?? null;
      const key = `${a.scheduled_at}|${roomId ?? 'none'}`;
      const cur = map.get(key);
      if (cur) cur.apps.push(a);
      else map.set(key, { key, scheduled_at: a.scheduled_at, room_id: roomId, apps: [a] });
    });
    return Array.from(map.values()).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  }, [appointments, slotById]);

  // Equipment available in the selected room
  const roomEquipmentIds = useMemo(() => {
    if (!selectedRoomId) return equipment.map((e) => e.id);
    const ids = roomEqLinks.filter((l) => l.room_id === selectedRoomId).map((l) => l.equipment_id);
    return ids.length > 0 ? ids : equipment.map((e) => e.id); // fallback
  }, [selectedRoomId, roomEqLinks, equipment]);

  const roomEquipmentList = useMemo(
    () => equipment.filter((e) => roomEquipmentIds.includes(e.id)),
    [equipment, roomEquipmentIds]
  );

  // ---- Compute occupied equipment in the same time slot (single_per_class rule) ----
  const occupiedEquipmentIds = useMemo(() => {
    if (!selectedApp || !selectedRoom) return new Set<string>();
    if (selectedRoom.equipment_mode !== 'single_per_class') return new Set<string>();
    const start = new Date(selectedApp.scheduled_at).getTime();
    const end = start + selectedApp.duration_minutes * 60000;
    const occupied = new Set<string>();
    appointments.forEach((a) => {
      if (a.id === selectedApp.id) return;
      const aStart = new Date(a.scheduled_at).getTime();
      const aEnd = aStart + a.duration_minutes * 60000;
      const overlaps = aStart < end && aEnd > start;
      if (!overlaps) return;
      const aSlot = a.bookable_slot_id ? (slotById.get(a.bookable_slot_id) as any) : null;
      const aRoomId = aSlot?.room_id ?? null;
      if (aRoomId !== selectedRoomId) return;
      const eqId = a.equipment_id ?? aSlot?.equipment_id ?? null;
      if (eqId) occupied.add(eqId);
    });
    return occupied;
  }, [appointments, selectedApp, selectedRoom, selectedRoomId, slotById]);

  // ---- Last equipment used by selected student ----
  const { data: lastUsedEquipmentId } = useQuery({
    queryKey: ['plan-class-last-eq', selectedApp?.student_id, activeClinicId],
    enabled: !!selectedApp?.student_id && !!activeClinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_appointments')
        .select('equipment_id,bookable_slot_id,scheduled_at')
        .eq('clinic_id', activeClinicId!)
        .eq('student_id', selectedApp!.student_id)
        .neq('status', 'cancelled')
        .lt('scheduled_at', selectedApp!.scheduled_at)
        .order('scheduled_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      // Try to find first non-null equipment_id (may need to look at slot)
      for (const row of data ?? []) {
        if ((row as any).equipment_id) return (row as any).equipment_id as string;
        if ((row as any).bookable_slot_id) {
          const { data: slot } = await supabase
            .from('bookable_slots' as any)
            .select('equipment_id')
            .eq('id', (row as any).bookable_slot_id)
            .maybeSingle();
          if ((slot as any)?.equipment_id) return (slot as any).equipment_id as string;
        }
      }
      return null;
    },
  });

  // ---- Suggest equipment when appointment changes ----
  useEffect(() => {
    if (!selectedApp) {
      setChosenEquipmentId(null);
      return;
    }
    // Priority: existing on appointment > existing on slot > last used (if available) > first available
    const explicit = selectedApp.equipment_id ?? (selectedSlot as any)?.equipment_id ?? null;
    if (explicit && roomEquipmentIds.includes(explicit)) {
      setChosenEquipmentId(explicit);
      return;
    }
    if (lastUsedEquipmentId && roomEquipmentIds.includes(lastUsedEquipmentId) && !occupiedEquipmentIds.has(lastUsedEquipmentId)) {
      setChosenEquipmentId(lastUsedEquipmentId);
      return;
    }
    const firstFree = roomEquipmentList.find((e) => !occupiedEquipmentIds.has(e.id));
    setChosenEquipmentId(firstFree?.id ?? roomEquipmentList[0]?.id ?? null);
  }, [selectedApp?.id, lastUsedEquipmentId, roomEquipmentIds.join(','), occupiedEquipmentIds.size]); // eslint-disable-line

  // ---- Load existing sequence items if appointment already has sequence_id ----
  useEffect(() => {
    if (!selectedApp?.sequence_id) {
      setItems([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('exercise_sequence_items')
        .select('id,exercise_library_id,name,image_urls,sets,reps,rest_seconds,duration_seconds,notes')
        .eq('sequence_id', selectedApp.sequence_id!)
        .order('order_index');
      if (error) {
        toast.error('Erro ao carregar sequência');
        return;
      }
      setItems(
        (data ?? []).map((d: any) => ({
          id: d.id,
          exercise_library_id: d.exercise_library_id,
          name: d.name,
          image_urls: d.image_urls ?? [],
          sets: d.sets ?? 3,
          reps: d.reps ?? 12,
          rest_seconds: d.rest_seconds,
          duration_seconds: d.duration_seconds,
          notes: d.notes,
        }))
      );
    })();
  }, [selectedApp?.sequence_id]);

  // ---- Library: exercises ----
  const { data: libraryExercises = [] } = useQuery({
    queryKey: ['plan-class-library', activeClinicId, user?.id],
    enabled: !!user && !!activeClinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_library')
        .select('id,name,image_urls,default_sets,default_reps,video_url,video_type,video_start_seconds,video_end_seconds,category_id,skill_level_id,clinic_id,is_global')
        .or(`clinic_id.eq.${activeClinicId},is_global.eq.true,user_id.eq.${user!.id}`)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  // ---- Library: sequences (templates) ----
  const { data: librarySequences = [] } = useQuery({
    queryKey: ['plan-class-sequences', activeClinicId],
    enabled: !!activeClinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_sequences')
        .select('id,name,description,equipment_id,equipment_type,skill_level_id,estimated_minutes,is_global,clinic_id')
        .or(`clinic_id.eq.${activeClinicId},is_global.eq.true`)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  // ---- Filter exercises by level + equipment ----
  const studentLevelId = selectedStudent?.skill_level_id ?? null;
  const filteredExercises = useMemo(() => {
    let list = libraryExercises as any[];
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(s));
    }
    // Sort: compatible first
    return list
      .map((e) => {
        let score = 0;
        if (filterByLevel && studentLevelId && e.skill_level_id === studentLevelId) score += 2;
        if (filterByLevel && !e.skill_level_id) score += 1;
        return { ...e, _score: score };
      })
      .sort((a, b) => b._score - a._score);
  }, [libraryExercises, search, filterByLevel, studentLevelId]);

  const filteredSequences = useMemo(() => {
    let list = librarySequences as any[];
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(s));
    }
    return list
      .map((e) => {
        let score = 0;
        if (filterByLevel && studentLevelId && e.skill_level_id === studentLevelId) score += 2;
        if (filterByEquipment && chosenEquipmentId && e.equipment_id === chosenEquipmentId) score += 2;
        return { ...e, _score: score };
      })
      .sort((a, b) => b._score - a._score);
  }, [librarySequences, search, filterByLevel, filterByEquipment, studentLevelId, chosenEquipmentId]);

  // ---- Add exercise ----
  const addExercise = (e: any) => {
    setItems((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}-${Math.random()}`,
        exercise_library_id: e.id,
        name: e.name,
        image_urls: e.image_urls ?? [],
        sets: e.default_sets ?? 3,
        reps: e.default_reps ?? 12,
        rest_seconds: null,
        duration_seconds: null,
        notes: null,
      },
    ]);
  };

  // ---- Add full sequence ----
  const addSequence = async (seqId: string, seqName: string) => {
    const { data, error } = await supabase
      .from('exercise_sequence_items')
      .select('exercise_library_id,name,image_urls,sets,reps,rest_seconds,duration_seconds,notes')
      .eq('sequence_id', seqId)
      .order('order_index');
    if (error) {
      toast.error('Erro ao carregar sequência');
      return;
    }
    const newItems: PickItem[] = (data ?? []).map((d: any) => ({
      id: `tmp-${Date.now()}-${Math.random()}`,
      exercise_library_id: d.exercise_library_id,
      name: d.name,
      image_urls: d.image_urls ?? [],
      sets: d.sets ?? 3,
      reps: d.reps ?? 12,
      rest_seconds: d.rest_seconds,
      duration_seconds: d.duration_seconds,
      notes: d.notes,
    }));
    setItems((prev) => [...prev, ...newItems]);
    toast.success(`"${seqName}" adicionada (${newItems.length} exercícios)`);
  };

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const moveItem = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const updateItem = (id: string, patch: Partial<PickItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  // ---- Save sequence (vinculado à aula) ----
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedApp || !user || !activeClinicId) throw new Error('Aula não selecionada');
      if (items.length === 0) throw new Error('Adicione ao menos um exercício');

      let sequenceId = selectedApp.sequence_id;
      const seqName = `Aula ${selectedStudent?.full_name ?? ''} ${format(new Date(selectedApp.scheduled_at), 'dd/MM HH:mm')}`.trim();

      if (!sequenceId) {
        const { data: newSeq, error: seqErr } = await supabase
          .from('exercise_sequences')
          .insert({
            clinic_id: activeClinicId,
            name: seqName,
            equipment_id: chosenEquipmentId,
            skill_level_id: studentLevelId,
            created_by: user.id,
            is_global: false,
          } as any)
          .select('id')
          .single();
        if (seqErr) throw seqErr;
        sequenceId = (newSeq as any).id;
      } else {
        // Update existing
        await supabase
          .from('exercise_sequences')
          .update({ equipment_id: chosenEquipmentId } as any)
          .eq('id', sequenceId);
        // Wipe existing items
        await supabase.from('exercise_sequence_items').delete().eq('sequence_id', sequenceId);
      }

      // Insert items
      const rows = items.map((it, idx) => ({
        sequence_id: sequenceId,
        exercise_library_id: it.exercise_library_id,
        name: it.name,
        image_urls: it.image_urls,
        sets: it.sets,
        reps: it.reps,
        rest_seconds: it.rest_seconds,
        duration_seconds: it.duration_seconds,
        notes: it.notes,
        order_index: idx,
      }));
      const { error: itemsErr } = await supabase
        .from('exercise_sequence_items')
        .insert(rows as any);
      if (itemsErr) throw itemsErr;

      // Link to appointment + update equipment
      const { error: appErr } = await supabase
        .from('class_appointments')
        .update({
          sequence_id: sequenceId,
          equipment_id: chosenEquipmentId,
        })
        .eq('id', selectedApp.id);
      if (appErr) throw appErr;

      return sequenceId!;
    },
    onSuccess: () => {
      toast.success('Planejamento salvo!');
      qc.invalidateQueries({ queryKey: ['plan-class-appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao salvar'),
  });

  // ---- Save as template ----
  const saveAsTemplate = useMutation({
    mutationFn: async () => {
      if (!user || !activeClinicId) throw new Error('Sem clínica');
      if (items.length === 0) throw new Error('Adicione exercícios primeiro');
      if (!tplName.trim()) throw new Error('Nome obrigatório');

      const { data: newSeq, error } = await supabase
        .from('exercise_sequences')
        .insert({
          clinic_id: activeClinicId,
          name: tplName.trim(),
          description: tplDescription.trim() || null,
          equipment_id: chosenEquipmentId,
          skill_level_id: studentLevelId,
          created_by: user.id,
          is_global: false,
        } as any)
        .select('id')
        .single();
      if (error) throw error;

      const rows = items.map((it, idx) => ({
        sequence_id: (newSeq as any).id,
        exercise_library_id: it.exercise_library_id,
        name: it.name,
        image_urls: it.image_urls,
        sets: it.sets,
        reps: it.reps,
        rest_seconds: it.rest_seconds,
        duration_seconds: it.duration_seconds,
        notes: it.notes,
        order_index: idx,
      }));
      const { error: e2 } = await supabase
        .from('exercise_sequence_items')
        .insert(rows as any);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success('Template salvo na biblioteca');
      qc.invalidateQueries({ queryKey: ['plan-class-sequences'] });
      setSaveTplOpen(false);
      setTplName('');
      setTplDescription('');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao salvar template'),
  });

  // ---- URL sync ----
  const updateUrl = (date: Date, appId: string | null) => {
    const params = new URLSearchParams();
    params.set('date', format(date, 'yyyy-MM-dd'));
    if (appId) params.set('appointment', appId);
    setSearchParams(params, { replace: true });
  };

  useEffect(() => { updateUrl(selectedDate, selectedAppointmentId); }, [selectedDate, selectedAppointmentId]); // eslint-disable-line

  // -------------- Render --------------
  return (
    <>
      <ClinicPageHeader icon={Sparkles} title="Planejar Aulas" subtitle="Monte a sequência de exercícios para cada aluno" />
      <div className="p-3 md:p-6 max-w-[1700px] mx-auto">
        <div className="grid grid-cols-12 gap-4">

          {/* ---------- Column 1: Date + Appointments ---------- */}
          <div className="col-span-12 lg:col-span-3">
            <Card className="p-3 sticky top-2">
              <div className="flex items-center justify-between mb-3">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarDays className="h-4 w-4 mr-2" />
                      {format(selectedDate, "EEE, dd 'de' MMM", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => {
                        if (d) {
                          setSelectedDate(d);
                          setSelectedAppointmentId(null);
                          setCalendarOpen(false);
                        }
                      }}
                      className={cn('p-3 pointer-events-auto')}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">
                Aulas do dia ({appointments.length})
              </div>

              <ScrollArea className="h-[calc(100vh-220px)]">
                <div className="space-y-1.5 pr-1">
                  {appsLoading && (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  )}
                  {!appsLoading && appointments.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-8 space-y-2">
                      <CalendarDays className="h-8 w-8 mx-auto opacity-40" />
                      <p>Nenhuma aula neste dia.</p>
                    </div>
                  )}
                  {groupedAppointments.map((g) => {
                    const room = rooms.find((r) => r.id === g.room_id) ?? null;
                    const isActiveGroup = g.apps.some((a) => a.id === selectedAppointmentId);
                    return (
                      <div
                        key={g.key}
                        className={cn(
                          'w-full text-left p-2.5 rounded-md border transition-all',
                          isActiveGroup
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border'
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-mono text-sm font-semibold">
                            {format(new Date(g.scheduled_at), 'HH:mm')}
                          </span>
                          {room && (
                            <span className="text-xs text-muted-foreground truncate flex items-center gap-1 ml-auto">
                              <MapPin className="h-3 w-3" /> {room.name}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {g.apps.map((a) => {
                            const st = studentById.get(a.student_id);
                            const isActive = a.id === selectedAppointmentId;
                            const hasPlan = !!a.sequence_id;
                            return (
                              <button
                                key={a.id}
                                onClick={() => setSelectedAppointmentId(a.id)}
                                className={cn(
                                  'w-full text-left px-2 py-1.5 rounded border text-sm flex items-center gap-2 transition',
                                  isActive
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border hover:bg-muted/60'
                                )}
                              >
                                <User className={cn('h-3 w-3 shrink-0', isActive ? '' : 'text-muted-foreground')} />
                                <span className="truncate flex-1">{st?.full_name ?? '—'}</span>
                                {hasPlan && (
                                  <ListOrdered className={cn('h-3 w-3 shrink-0', isActive ? '' : 'text-primary')} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* ---------- Column 2: Library ---------- */}
          <div className="col-span-12 lg:col-span-4">
            <Card className="p-3 h-[calc(100vh-100px)] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-xl">Biblioteca</h3>
                {selectedStudent && (
                  <Badge variant="outline" className="text-xs">
                    Nível: {skillLevels.find((s: any) => s.id === studentLevelId)?.name ?? '—'}
                  </Badge>
                )}
              </div>

              <div className="relative mb-2">
                <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar exercício ou sequência..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="flex items-center gap-2 mb-2 text-xs">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <button
                  onClick={() => setFilterByLevel((v) => !v)}
                  className={cn(
                    'px-2 py-0.5 rounded-md border transition',
                    filterByLevel ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground'
                  )}
                >
                  Nível
                </button>
                <button
                  onClick={() => setFilterByEquipment((v) => !v)}
                  className={cn(
                    'px-2 py-0.5 rounded-md border transition',
                    filterByEquipment ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground'
                  )}
                >
                  Equipamento
                </button>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid grid-cols-2 mb-2">
                  <TabsTrigger value="exercises">
                    <Library className="h-3.5 w-3.5 mr-1" />Exercícios
                  </TabsTrigger>
                  <TabsTrigger value="sequences">
                    <ListOrdered className="h-3.5 w-3.5 mr-1" />Sequências
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="exercises" className="flex-1 min-h-0 mt-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-1.5 pr-1">
                      {!selectedApp && (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Selecione uma aula para começar.
                        </p>
                      )}
                      {selectedApp && filteredExercises.map((e: any) => {
                        const compatible = filterByLevel && studentLevelId && e.skill_level_id === studentLevelId;
                        return (
                          <button
                            key={e.id}
                            onClick={() => addExercise(e)}
                            className="w-full text-left p-2 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition flex items-center gap-2"
                          >
                            {e.image_urls?.[0] ? (
                              <img src={e.image_urls[0]} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{e.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {e.default_sets}x{e.default_reps}
                                {compatible && <span className="ml-2 text-primary">• ideal</span>}
                              </div>
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </button>
                        );
                      })}
                      {selectedApp && filteredExercises.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">Nenhum exercício encontrado.</p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="sequences" className="flex-1 min-h-0 mt-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-1.5 pr-1">
                      {!selectedApp && (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Selecione uma aula para começar.
                        </p>
                      )}
                      {selectedApp && filteredSequences.map((s: any) => (
                        <button
                          key={s.id}
                          onClick={() => addSequence(s.id, s.name)}
                          className="w-full text-left p-2.5 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{s.name}</div>
                              {s.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1">{s.description}</div>
                              )}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {s.estimated_minutes && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                    {s.estimated_minutes} min
                                  </Badge>
                                )}
                                {s.is_global && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">global</Badge>
                                )}
                                {filterByLevel && studentLevelId && s.skill_level_id === studentLevelId && (
                                  <span className="text-[10px] text-primary">• nível ideal</span>
                                )}
                              </div>
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground mt-1" />
                          </div>
                        </button>
                      ))}
                      {selectedApp && filteredSequences.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma sequência encontrada.</p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* ---------- Column 3: Plan editor ---------- */}
          <div className="col-span-12 lg:col-span-5">
            {!selectedApp ? (
              <Card className="p-12 text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-serif">Selecione uma aula à esquerda para começar a planejar.</p>
              </Card>
            ) : (
              <Card className="p-4">
                {/* Header da aula */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h2 className="font-serif text-2xl truncate">{selectedStudent?.full_name ?? '—'}</h2>
                    <div className="flex flex-wrap gap-1.5 mt-1.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(selectedApp.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        {' '}({selectedApp.duration_minutes}min)
                      </span>
                      {selectedRoom && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {selectedRoom.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alunos do mesmo horário — alterna entre planos */}
                {slotmates.length > 1 && (
                  <div className="mb-3 p-2 border border-border rounded-md bg-muted/20">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {slotmates.length} alunos neste horário — planejamento individual
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {slotmates.map((a) => {
                        const st = studentById.get(a.student_id);
                        const isActive = a.id === selectedAppointmentId;
                        const hasPlan = !!a.sequence_id;
                        return (
                          <button
                            key={a.id}
                            onClick={() => setSelectedAppointmentId(a.id)}
                            className={cn(
                              'px-2.5 py-1 rounded-full border text-xs flex items-center gap-1.5 transition',
                              isActive
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border hover:bg-muted'
                            )}
                          >
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-[140px]">{st?.full_name ?? '—'}</span>
                            {hasPlan && <ListOrdered className={cn('h-3 w-3', isActive ? '' : 'text-primary')} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Equipamento */}
                <div className="mb-4 p-3 border border-border rounded-md bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      <Dumbbell className="h-3 w-3 inline mr-1" /> Equipamento
                    </Label>
                    {selectedRoom?.equipment_mode === 'single_per_class' && (
                      <Badge variant="outline" className="text-[10px]">1 por aluno/aula</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {roomEquipmentList.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum equipamento vinculado a esta sala.</p>
                    ) : (
                      roomEquipmentList.map((eq) => {
                        const occupied = occupiedEquipmentIds.has(eq.id);
                        const isLast = eq.id === lastUsedEquipmentId;
                        const selected = chosenEquipmentId === eq.id;
                        const single = selectedRoom?.equipment_mode === 'single_per_class';
                        const disabled = single && occupied && !selected;
                        return (
                          <button
                            key={eq.id}
                            disabled={disabled}
                            onClick={() => setChosenEquipmentId(eq.id)}
                            className={cn(
                              'px-2.5 py-1 rounded-md border text-xs transition flex items-center gap-1.5',
                              selected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : disabled
                                ? 'border-border bg-muted text-muted-foreground line-through cursor-not-allowed opacity-60'
                                : 'border-border hover:bg-muted'
                            )}
                            title={
                              disabled
                                ? 'Já em uso por outra aula'
                                : isLast
                                ? 'Último equipamento usado por este aluno'
                                : ''
                            }
                          >
                            {eq.name}
                            {isLast && !disabled && <Sparkles className="h-3 w-3" />}
                            {occupied && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                  {selectedRoom?.equipment_mode === 'single_per_class' && occupiedEquipmentIds.size > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Equipamentos riscados já estão em uso neste horário.
                    </p>
                  )}
                </div>

                <Separator className="my-3" />

                {/* Items */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-serif text-lg">Sequência ({items.length})</h3>
                  {items.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSaveTplOpen(true)}
                    >
                      <BookmarkPlus className="h-3.5 w-3.5 mr-1" />
                      Salvar como template
                    </Button>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-md p-8 text-center text-muted-foreground text-sm">
                    Adicione exercícios ou uma sequência completa da biblioteca ao lado.
                  </div>
                ) : (
                  <ScrollArea className="max-h-[55vh]">
                    <div className="space-y-2 pr-1">
                      {items.map((it, idx) => (
                        <div key={it.id} className="border border-border rounded-md p-2.5 bg-card">
                          <div className="flex items-start gap-2">
                            <div className="flex flex-col items-center pt-1 gap-0.5">
                              <button
                                disabled={idx === 0}
                                onClick={() => moveItem(it.id, -1)}
                                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                              >
                                <ChevronLeft className="h-3 w-3 rotate-90" />
                              </button>
                              <span className="text-xs font-mono text-muted-foreground">{idx + 1}</span>
                              <button
                                disabled={idx === items.length - 1}
                                onClick={() => moveItem(it.id, 1)}
                                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                              >
                                <ChevronRight className="h-3 w-3 rotate-90" />
                              </button>
                            </div>

                            {it.image_urls?.[0] ? (
                              <img src={it.image_urls[0]} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
                            ) : (
                              <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="text-sm font-medium truncate">{it.name}</div>
                              <div className="grid grid-cols-3 gap-1.5">
                                <div>
                                  <Label className="text-[10px] text-muted-foreground">Séries</Label>
                                  <Input
                                    inputMode="numeric"
                                    value={it.sets}
                                    onChange={(e) => updateItem(it.id, { sets: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                                    className="h-7 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground">Reps</Label>
                                  <Input
                                    inputMode="numeric"
                                    value={it.reps}
                                    onChange={(e) => updateItem(it.id, { reps: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                                    className="h-7 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground">Desc. (s)</Label>
                                  <Input
                                    inputMode="numeric"
                                    value={it.rest_seconds ?? ''}
                                    onChange={(e) => {
                                      const v = e.target.value.replace(/\D/g, '');
                                      updateItem(it.id, { rest_seconds: v ? Number(v) : null });
                                    }}
                                    className="h-7 text-sm"
                                  />
                                </div>
                              </div>
                              <Input
                                placeholder="Notas (opcional)"
                                value={it.notes ?? ''}
                                onChange={(e) => updateItem(it.id, { notes: e.target.value })}
                                className="h-7 text-xs"
                              />
                            </div>

                            <button
                              onClick={() => removeItem(it.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/clinica?date=${format(selectedDate, 'yyyy-MM-dd')}`)}
                  >
                    Voltar para Grade
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => saveMutation.mutate()}
                    disabled={items.length === 0 || saveMutation.isPending}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Salvar planejamento
                  </Button>
                </div>
              </Card>
            )}
          </div>

        </div>
      </div>

      {/* ---------- Save as template dialog ---------- */}
      <Dialog open={saveTplOpen} onOpenChange={setSaveTplOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar como template</DialogTitle>
            <DialogDescription>
              Esta sequência ficará disponível para reutilizar em outras aulas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="Ex: Mat avançado abdominal"
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={tplDescription}
                onChange={(e) => setTplDescription(e.target.value)}
              />
            </div>
            <Button
              onClick={() => saveAsTemplate.mutate()}
              disabled={saveAsTemplate.isPending}
              className="w-full"
            >
              {saveAsTemplate.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Salvar template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
