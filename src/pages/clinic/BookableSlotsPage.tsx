import { useState, useMemo } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { useBookableSlots, useClinicSettings } from '@/hooks/useBookableSlots';
import { useEquipment } from '@/hooks/useClinicData';
import { useAppointments } from '@/hooks/useAppointments';
import { useClinicStaff } from '@/hooks/useStaff';
import { useClinicRooms } from '@/hooks/useClinicRooms';
import { useSlotEquipmentLinks } from '@/hooks/useSlotEquipment';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus, Trash2, Settings, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  DoorOpen, Dumbbell, Users as UsersIcon, GraduationCap, MoveHorizontal, X,
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function BookableSlotsPage() {
  const { activeClinicId } = useUserRoles();
  const { user } = useAuth();
  const [day, setDay] = useState(() => new Date());
  const fromISO = useMemo(() => {
    const d = startOfWeek(day, { weekStartsOn: 1 });
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [day]);
  const toISO = useMemo(() => {
    const d = startOfWeek(day, { weekStartsOn: 1 });
    d.setDate(d.getDate() + 7);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [day]);

  const { data: slots = [], create, update, remove } = useBookableSlots(activeClinicId, fromISO, toISO);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const { data: rooms = [] } = useClinicRooms(activeClinicId);
  const { data: settings, upsert: upsertSettings } = useClinicSettings(activeClinicId);
  const { data: appointments = [] } = useAppointments(activeClinicId, day.toISOString());
  const { data: staff = [] } = useClinicStaff(activeClinicId);

  const slotIds = useMemo(() => slots.map((s) => s.id), [slots]);
  const { data: slotEqLinks = [], setEquipmentForSlot } = useSlotEquipmentLinks(activeClinicId, slotIds);

  const linksBySlot = useMemo(() => {
    const m = new Map<string, string[]>();
    slotEqLinks.forEach((l) => {
      const arr = m.get(l.bookable_slot_id) ?? [];
      arr.push(l.equipment_id);
      m.set(l.bookable_slot_id, arr);
    });
    return m;
  }, [slotEqLinks]);

  const instructors = useMemo(
    () => staff.filter((s) => s.role === 'instructor' || s.role === 'clinic_admin'),
    [staff]
  );
  const instructorName = (id: string | null) =>
    id ? (staff.find((s) => s.user_id === id)?.name ?? 'Professor') : 'Sem professor';
  const roomById = (id: string | null) => (id ? rooms.find((r) => r.id === id) ?? null : null);
  const eqName = (id: string) => equipment.find((e) => e.id === id)?.name || 'Equip.';

  const [openCreate, setOpenCreate] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [tab, setTab] = useState<'lista' | 'professores'>('lista');

  const [form, setForm] = useState({
    weekdays: [] as number[],
    start_time: '08:00',
    end_time: '18:00',
    interval_minutes: 60,
    duration_minutes: 50,
    capacity: 1,
    equipment_ids: [] as string[],
    room_id: '',
    instructor_id: '',
    weeks: 1,
  });

  const [setForm2, setSetForm2] = useState({ cancellation_min_hours: 6, booking_open_days_ahead: 30 });
  const openSettingsDialog = () => {
    setSetForm2({
      cancellation_min_hours: settings?.cancellation_min_hours ?? 6,
      booking_open_days_ahead: settings?.booking_open_days_ahead ?? 30,
    });
    setOpenSettings(true);
  };

  const handleRoomChange = (room_id: string) => {
    const room = rooms.find((r) => r.id === room_id);
    setForm((f) => ({ ...f, room_id, capacity: room?.capacity ?? f.capacity }));
  };

  const toggleEquipment = (id: string) => {
    setForm((f) => ({
      ...f,
      equipment_ids: f.equipment_ids.includes(id)
        ? f.equipment_ids.filter((x) => x !== id)
        : [...f.equipment_ids, id],
    }));
  };

  const handleCreate = async () => {
    if (!user || !activeClinicId || form.weekdays.length === 0) return;
    const baseStart = startOfWeek(day, { weekStartsOn: 1 });
    let createdCount = 0;
    for (let w = 0; w < form.weeks; w++) {
      for (const dow of form.weekdays) {
        const target = addDays(baseStart, w * 7 + ((dow + 6) % 7));
        const [sh, sm] = form.start_time.split(':').map(Number);
        const [eh, em] = form.end_time.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        for (let t = startMin; t + form.duration_minutes <= endMin; t += form.interval_minutes) {
          const d = new Date(target);
          d.setHours(Math.floor(t / 60), t % 60, 0, 0);
          // Cria 1 slot e vincula múltiplos equipamentos
          const primaryEq = form.equipment_ids[0] || null;
          const slotId = await create.mutateAsync({
            clinic_id: activeClinicId,
            scheduled_at: d.toISOString(),
            duration_minutes: form.duration_minutes,
            equipment_id: primaryEq,
            room_id: form.room_id || null,
            instructor_id: form.instructor_id || user.id,
            capacity: Math.max(form.capacity, form.equipment_ids.length || 1),
            notes: null,
            created_by: user.id,
          });
          if (slotId && form.equipment_ids.length > 0) {
            await setEquipmentForSlot.mutateAsync({ slotId, equipmentIds: form.equipment_ids });
          }
          createdCount++;
        }
      }
    }
    toast.success(`${createdCount} slot(s) criado(s)`);
    setOpenCreate(false);
  };

  const week = useMemo(() => {
    const start = startOfWeek(day, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [day]);

  const slotsToday = slots.filter((s) => isSameDay(parseISO(s.scheduled_at), day));
  const bookedCountBySlot = useMemo(() => {
    const m = new Map<string, number>();
    appointments.forEach((a: any) => {
      if (a.bookable_slot_id && a.status !== 'cancelled') {
        m.set(a.bookable_slot_id, (m.get(a.bookable_slot_id) || 0) + 1);
      }
    });
    return m;
  }, [appointments]);

  // ====== Drag & drop: assign instructor to slot ======
  const [dragInstructor, setDragInstructor] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  const handleDropOnSlot = async (slotId: string) => {
    if (!dragInstructor) return;
    await update.mutateAsync({ id: slotId, patch: { instructor_id: dragInstructor } });
    setDragInstructor(null);
    setDragOverSlot(null);
    toast.success('Professor atribuído');
  };

  const clearInstructor = async (slotId: string) => {
    await update.mutateAsync({ id: slotId, patch: { instructor_id: null as any } });
  };

  // Slots agrupados por horário (HH:mm) → linhas; e por dia → colunas
  const board = useMemo(() => {
    const timeMap = new Map<string, Map<string, typeof slots>>();
    week.forEach((d) => {
      const key = format(d, 'yyyy-MM-dd');
      slots
        .filter((s) => isSameDay(parseISO(s.scheduled_at), d))
        .forEach((s) => {
          const t = format(parseISO(s.scheduled_at), 'HH:mm');
          if (!timeMap.has(t)) timeMap.set(t, new Map());
          const dayMap = timeMap.get(t)!;
          const arr = (dayMap.get(key) ?? []) as typeof slots;
          arr.push(s);
          dayMap.set(key, arr);
        });
    });
    const times = Array.from(timeMap.keys()).sort();
    return { times, timeMap };
  }, [slots, week]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-7 w-7 text-primary" />Grade de aulas
          </h1>
          <p className="text-sm text-muted-foreground">
            Defina horários, sala, professor, equipamentos e número máximo de alunos.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link to="/clinica/salas"><DoorOpen className="h-4 w-4 mr-1" />Salas</Link>
          </Button>
          <Button variant="outline" onClick={openSettingsDialog}><Settings className="h-4 w-4 mr-1" />Regras</Button>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Criar grade</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Criar grade reservável</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Dias da semana</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {DAY_NAMES.map((n, i) => {
                      const active = form.weekdays.includes(i);
                      return (
                        <Button key={i} type="button" size="sm" variant={active ? 'default' : 'outline'}
                          onClick={() => setForm((f) => ({ ...f, weekdays: active ? f.weekdays.filter((x) => x !== i) : [...f.weekdays, i] }))}>{n}</Button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Início</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                  <div><Label>Fim</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Intervalo</Label><Input type="number" value={form.interval_minutes} onChange={(e) => setForm({ ...form, interval_minutes: parseInt(e.target.value) || 60 })} /></div>
                  <div><Label>Duração</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 50 })} /></div>
                  <div><Label>Vagas máx</Label><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })} /></div>
                </div>
                <div>
                  <Label className="flex items-center gap-1"><DoorOpen className="h-3.5 w-3.5" />Sala</Label>
                  {rooms.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg mt-1">
                      Nenhuma sala cadastrada. <Link to="/clinica/salas" className="text-primary underline">Criar salas</Link>
                    </div>
                  ) : (
                    <Select value={form.room_id} onValueChange={handleRoomChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione a sala" /></SelectTrigger>
                      <SelectContent>
                        {rooms.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            <span className="inline-flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color || '#3b82f6' }} />
                              {r.name}{r.capacity ? ` (cap. ${r.capacity})` : ''}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Dumbbell className="h-3.5 w-3.5" />Equipamentos (selecione 1 ou mais)</Label>
                  {equipment.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">Nenhum equipamento cadastrado.</p>
                  ) : (
                    <div className="mt-1 grid grid-cols-2 gap-2 max-h-44 overflow-auto p-2 border rounded-lg">
                      {equipment.map((e) => {
                        const checked = form.equipment_ids.includes(e.id);
                        return (
                          <label
                            key={e.id}
                            className={cn(
                              'flex items-center gap-2 rounded-md p-2 cursor-pointer border text-sm',
                              checked ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'
                            )}
                          >
                            <Checkbox checked={checked} onCheckedChange={() => toggleEquipment(e.id)} />
                            <span className="truncate">{e.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {form.equipment_ids.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {form.equipment_ids.length} equipamento(s) vinculado(s) a cada slot.
                    </p>
                  )}
                </div>
                <div>
                  <Label className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />Professor (opcional — pode arrastar depois)</Label>
                  <Select value={form.instructor_id} onValueChange={(v) => setForm({ ...form, instructor_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Eu mesmo" /></SelectTrigger>
                    <SelectContent>{instructors.map((i) => <SelectItem key={i.user_id} value={i.user_id}>{i.name ?? i.email ?? 'Professor'}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Repetir por quantas semanas</Label>
                  <Input type="number" min={1} max={12} value={form.weeks} onChange={(e) => setForm({ ...form, weeks: parseInt(e.target.value) || 1 })} />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={form.weekdays.length === 0}>Gerar grade</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="lista">Lista do dia</TabsTrigger>
          <TabsTrigger value="professores">
            <MoveHorizontal className="h-3.5 w-3.5 mr-1" /> Atribuir professores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4 mt-4">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setDay((d) => addDays(d, -7))}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="flex-1 grid grid-cols-7 gap-1">
                {week.map((d) => {
                  const active = isSameDay(d, day);
                  const count = slots.filter((s) => isSameDay(parseISO(s.scheduled_at), d)).length;
                  return (
                    <button key={d.toISOString()} onClick={() => setDay(d)}
                      className={`p-2 rounded-lg text-center transition ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                      <div className="text-[10px] uppercase">{format(d, 'EEE', { locale: ptBR })}</div>
                      <div className="text-lg font-bold">{format(d, 'd')}</div>
                      {count > 0 && <div className={`text-[10px] mt-0.5 ${active ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>{count} slot(s)</div>}
                    </button>
                  );
                })}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDay((d) => addDays(d, 7))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold mb-3">{format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h2>
            {slotsToday.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum slot. Crie uma grade.</p>
            ) : (
              <div className="space-y-2">
                {slotsToday.map((s) => {
                  const booked = bookedCountBySlot.get(s.id) || 0;
                  const full = booked >= s.capacity;
                  const room = roomById(s.room_id);
                  const eqIds = linksBySlot.get(s.id) ?? (s.equipment_id ? [s.equipment_id] : []);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-3 rounded-xl border-l-4 border bg-card hover:bg-muted/30 transition"
                      style={room?.color ? { borderLeftColor: room.color } : undefined}
                    >
                      <div className="text-center min-w-[70px]">
                        <div className="font-bold text-xl">{format(parseISO(s.scheduled_at), 'HH:mm')}</div>
                        <div className="text-[10px] text-muted-foreground">{s.duration_minutes}min</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {room && (
                            <Badge style={{ background: `${room.color}20`, color: room.color, borderColor: `${room.color}40` }} variant="outline" className="border">
                              <DoorOpen className="h-3 w-3 mr-1" />{room.name}
                            </Badge>
                          )}
                          {eqIds.length === 0 ? (
                            <span className="text-muted-foreground text-xs">Sem equipamento</span>
                          ) : (
                            eqIds.map((eid) => (
                              <Badge key={eid} variant="secondary" className="text-[11px]">
                                <Dumbbell className="h-3 w-3 mr-1" />{eqName(eid)}
                              </Badge>
                            ))
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap mt-1">
                          <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{instructorName(s.instructor_id)}</span>
                          <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3" />{booked} / {s.capacity}</span>
                        </div>
                      </div>
                      <Badge variant={full ? 'destructive' : 'secondary'}>{full ? 'Lotado' : `${s.capacity - booked} vaga(s)`}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm('Excluir slot?')) remove.mutate(s.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ===== Tab Professores: Drag & Drop ===== */}
        <TabsContent value="professores" className="mt-4">
          <Card className="p-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="icon" onClick={() => setDay((d) => addDays(d, -7))}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="text-sm font-medium">
                Semana de {format(week[0], 'dd/MM')} a {format(week[6], 'dd/MM')}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDay((d) => addDays(d, 7))}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setDay(new Date())}>Hoje</Button>
              <p className="text-xs text-muted-foreground ml-auto">
                Arraste um professor da lateral até um horário para atribuir.
              </p>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3">
            {/* Sidebar professores arrastáveis */}
            <Card className="p-3 h-fit lg:sticky lg:top-4">
              <h3 className="text-xs uppercase font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <GraduationCap className="h-3 w-3" /> Professores
              </h3>
              {instructors.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum professor.</p>
              ) : (
                <div className="space-y-1.5">
                  {instructors.map((i) => {
                    const initials = (i.name ?? i.email ?? '?').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
                    const active = dragInstructor === i.user_id;
                    return (
                      <div
                        key={i.user_id}
                        draggable
                        onDragStart={() => setDragInstructor(i.user_id)}
                        onDragEnd={() => setDragInstructor(null)}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg border cursor-grab active:cursor-grabbing transition',
                          active ? 'border-primary bg-primary/10 scale-95' : 'hover:bg-muted'
                        )}
                      >
                        <div className="h-7 w-7 shrink-0 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                          {initials}
                        </div>
                        <span className="text-sm truncate">{i.name ?? i.email}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Board: linhas = horário, colunas = dia */}
            <Card className="p-2 overflow-auto">
              {board.times.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">
                  Nenhum slot nesta semana. Crie uma grade primeiro.
                </p>
              ) : (
                <div className="min-w-[640px]">
                  {/* Header de dias */}
                  <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1 mb-1 sticky top-0 bg-card z-10">
                    <div />
                    {week.map((d) => (
                      <div key={d.toISOString()} className="text-center py-1 text-[11px] uppercase text-muted-foreground font-semibold">
                        {format(d, 'EEE dd', { locale: ptBR })}
                      </div>
                    ))}
                  </div>

                  {board.times.map((t) => (
                    <div key={t} className="grid grid-cols-[60px_repeat(7,1fr)] gap-1 mb-1">
                      <div className="text-xs font-bold text-muted-foreground flex items-center justify-end pr-1">
                        {t}
                      </div>
                      {week.map((d) => {
                        const dayKey = format(d, 'yyyy-MM-dd');
                        const cellSlots = board.timeMap.get(t)?.get(dayKey) ?? [];
                        if (cellSlots.length === 0) {
                          return <div key={dayKey} className="min-h-[58px] rounded-md bg-muted/30" />;
                        }
                        return (
                          <div key={dayKey} className="space-y-1">
                            {cellSlots.map((s) => {
                              const room = roomById(s.room_id);
                              const isOver = dragOverSlot === s.id;
                              const profName = instructorName(s.instructor_id);
                              const initials = profName.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
                              return (
                                <div
                                  key={s.id}
                                  onDragOver={(e) => { e.preventDefault(); setDragOverSlot(s.id); }}
                                  onDragLeave={() => setDragOverSlot((id) => (id === s.id ? null : id))}
                                  onDrop={() => handleDropOnSlot(s.id)}
                                  className={cn(
                                    'rounded-md border p-1.5 text-[11px] transition min-h-[58px] flex flex-col gap-1 group',
                                    isOver && 'ring-2 ring-primary scale-[1.02] bg-primary/10',
                                    !s.instructor_id && 'border-dashed border-amber-500/50 bg-amber-500/5'
                                  )}
                                  style={room?.color ? { borderLeftWidth: 3, borderLeftColor: room.color } : undefined}
                                >
                                  <div className="flex items-center gap-1">
                                    {s.instructor_id ? (
                                      <>
                                        <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shrink-0">
                                          {initials}
                                        </div>
                                        <span className="truncate font-medium">{profName}</span>
                                        <button
                                          onClick={() => clearInstructor(s.id)}
                                          className="ml-auto opacity-0 group-hover:opacity-100 hover:text-destructive transition"
                                          title="Remover professor"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </>
                                    ) : (
                                      <span className="text-amber-700 text-[10px] italic">solte aqui</span>
                                    )}
                                  </div>
                                  {room && (
                                    <span className="text-[9px] text-muted-foreground truncate">{room.name}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={openSettings} onOpenChange={setOpenSettings}>
        <DialogContent>
          <DialogHeader><DialogTitle>Regras de reserva</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Antecedência mínima para cancelar (horas)</Label>
              <Input type="number" min={0} value={setForm2.cancellation_min_hours}
                onChange={(e) => setSetForm2({ ...setForm2, cancellation_min_hours: parseInt(e.target.value) || 0 })} />
              <p className="text-xs text-muted-foreground mt-1">O aluno só pode cancelar a própria aula com pelo menos este tempo de antecedência.</p>
            </div>
            <div>
              <Label>Janela de reserva (dias à frente)</Label>
              <Input type="number" min={1} value={setForm2.booking_open_days_ahead}
                onChange={(e) => setSetForm2({ ...setForm2, booking_open_days_ahead: parseInt(e.target.value) || 1 })} />
            </div>
            <Button className="w-full" onClick={async () => { await upsertSettings.mutateAsync(setForm2); setOpenSettings(false); }}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
