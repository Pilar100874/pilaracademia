import { useState, useMemo } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { useBookableSlots, useClinicSettings } from '@/hooks/useBookableSlots';
import { useEquipment } from '@/hooks/useClinicData';
import { useAppointments } from '@/hooks/useAppointments';
import { useClinicStaff } from '@/hooks/useStaff';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Settings, Calendar as CalendarIcon, ChevronLeft, ChevronRight, User2, Repeat } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  const { data: slots = [], create, remove } = useBookableSlots(activeClinicId, fromISO, toISO);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const { data: settings, upsert: upsertSettings } = useClinicSettings(activeClinicId);
  const { data: appointments = [] } = useAppointments(activeClinicId, day.toISOString());
  const { data: staff = [] } = useClinicStaff(activeClinicId);
  const instructors = useMemo(
    () => staff.filter((s) => s.role === 'instructor' || s.role === 'clinic_admin'),
    [staff]
  );
  const instructorName = (id: string | null) =>
    id ? (staff.find((s) => s.user_id === id)?.name ?? 'Professor') : 'Sem professor';

  const [openCreate, setOpenCreate] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  const [form, setForm] = useState({
    weekdays: [] as number[],
    start_time: '08:00',
    end_time: '18:00',
    interval_minutes: 60,
    duration_minutes: 50,
    capacity: 1,
    equipment_id: '',
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

  const handleCreate = async () => {
    if (!user || !activeClinicId || form.weekdays.length === 0) return;
    const baseStart = startOfWeek(day, { weekStartsOn: 1 });
    const inserts: Promise<unknown>[] = [];
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
          inserts.push(create.mutateAsync({
            clinic_id: activeClinicId,
            scheduled_at: d.toISOString(),
            duration_minutes: form.duration_minutes,
            equipment_id: form.equipment_id || null,
            instructor_id: form.instructor_id || user.id,
            capacity: form.capacity,
            notes: null,
            created_by: user.id,
          }));
        }
      }
    }
    await Promise.all(inserts);
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

  const eqName = (id: string | null) => equipment.find((e) => e.id === id)?.name || 'Qualquer equipamento';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarIcon className="h-6 w-6 text-primary" />Grades disponíveis</h1>
          <p className="text-sm text-muted-foreground">Crie horários abertos para os alunos reservarem pelo app.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openSettingsDialog}><Settings className="h-4 w-4 mr-1" />Regras</Button>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Criar grade</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
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
                  <div><Label>Intervalo (min)</Label><Input type="number" value={form.interval_minutes} onChange={(e) => setForm({ ...form, interval_minutes: parseInt(e.target.value) || 60 })} /></div>
                  <div><Label>Duração (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 50 })} /></div>
                  <div><Label>Vagas</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })} /></div>
                </div>
                <div>
                  <Label>Equipamento</Label>
                  <Select value={form.equipment_id} onValueChange={(v) => setForm({ ...form, equipment_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                    <SelectContent>{equipment.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Professor</Label>
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
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="text-center min-w-[60px]">
                    <div className="font-bold text-lg">{format(parseISO(s.scheduled_at), 'HH:mm')}</div>
                    <div className="text-[10px] text-muted-foreground">{s.duration_minutes}min</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">{eqName(s.equipment_id)}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1"><User2 className="h-3 w-3" /> {booked} / {s.capacity}</span>
                      <span className="flex items-center gap-1 text-primary font-medium">👨‍🏫 {instructorName(s.instructor_id)}</span>
                    </div>
                  </div>
                  <Badge variant={full ? 'destructive' : 'secondary'}>{full ? 'Lotado' : 'Aberto'}</Badge>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm('Excluir slot?')) remove.mutate(s.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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
