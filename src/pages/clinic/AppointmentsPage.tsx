import { useState, useMemo } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { useAppointments, type AppointmentStatus, type Appointment } from '@/hooks/useAppointments';
import { useStudents, useEquipment, useSequences, usePrescriptions } from '@/hooks/useClinicData';
import { useRecurringSchedules, expandRecurringForDay } from '@/hooks/useRecurringSchedules';
import { useBookableSlots } from '@/hooks/useBookableSlots';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, LogIn, Trash2, Repeat, ListChecks, Sparkles } from 'lucide-react';
import { format, addDays, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClinicPageHeader } from '@/components/clinic/ClinicPageHeader';

const STATUS_LABEL: Record<AppointmentStatus, { label: string; variant: any }> = {
  scheduled: { label: 'Agendado', variant: 'secondary' },
  checked_in: { label: 'Check-in', variant: 'default' },
  in_progress: { label: 'Em aula', variant: 'default' },
  completed: { label: 'Concluído', variant: 'outline' },
  no_show: { label: 'Faltou', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
};

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface MergedSlot {
  key: string;
  scheduled_at: string;
  duration_minutes: number;
  student_id: string;
  equipment_id: string | null;
  notes: string | null;
  // Either persisted or virtual
  appointment?: Appointment & { sequence_id?: string | null };
  recurring_id?: string;
}

export default function AppointmentsPage() {
  const { activeClinicId } = useUserRoles();
  const { user } = useAuth();
  const [day, setDay] = useState(() => new Date());
  const dayISO = day.toISOString();

  // Janela do dia para buscar slots da grade
  const dayStart = useMemo(() => { const d = new Date(day); d.setHours(0,0,0,0); return d.toISOString(); }, [day]);
  const dayEnd = useMemo(() => { const d = new Date(day); d.setHours(23,59,59,999); return d.toISOString(); }, [day]);

  const { data: appointments = [], create, updateStatus, remove } = useAppointments(activeClinicId, dayISO);
  const { data: students = [] } = useStudents(activeClinicId);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const { data: sequences = [] } = useSequences(activeClinicId);
  const { data: recurring = [] } = useRecurringSchedules(activeClinicId);
  const { data: daySlots = [] } = useBookableSlots(activeClinicId, dayStart, dayEnd);
  const { create: createPresc } = usePrescriptions({ clinicId: activeClinicId });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ student_id: string; bookable_slot_id: string; notes: string }>({
    student_id: '', bookable_slot_id: '', notes: '',
  });

  // Vagas livres por slot (capacity - appointments já criados nesse slot)
  const slotOccupancy = useMemo(() => {
    const map = new Map<string, number>();
    appointments.forEach((a: any) => {
      if (a.bookable_slot_id && a.status !== 'cancelled') {
        map.set(a.bookable_slot_id, (map.get(a.bookable_slot_id) || 0) + 1);
      }
    });
    return map;
  }, [appointments]);

  const availableSlots = useMemo(() => {
    return daySlots
      .filter((s) => (slotOccupancy.get(s.id) || 0) < (s.capacity || 1))
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  }, [daySlots, slotOccupancy]);

  const handleCreate = async () => {
    if (!user || !activeClinicId || !form.student_id || !form.bookable_slot_id) return;
    const slot = daySlots.find((s) => s.id === form.bookable_slot_id);
    if (!slot) { toast.error('Horário não encontrado na grade'); return; }
    await create.mutateAsync({
      clinic_id: activeClinicId,
      student_id: form.student_id,
      equipment_id: slot.equipment_id,
      instructor_id: slot.instructor_id || user.id,
      scheduled_at: slot.scheduled_at,
      duration_minutes: slot.duration_minutes,
      notes: form.notes || null,
      created_by: user.id,
      bookable_slot_id: slot.id,
    } as any);
    const stu = students.find((s) => s.id === form.student_id);
    if (stu?.user_id) {
      await supabase.from('notifications').insert({
        user_id: stu.user_id,
        clinic_id: activeClinicId,
        type: 'appointment_reminder',
        title: 'Nova aula agendada',
        body: `${format(parseISO(slot.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}`,
        link: '/meu-pilates',
      });
    }
    setForm({ student_id: '', bookable_slot_id: '', notes: '' });
    setOpen(false);
  };

  const week = useMemo(() => {
    const start = startOfWeek(day, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [day]);

  // Mescla virtuais (recorrentes) com reais (agendamentos)
  const slots: MergedSlot[] = useMemo(() => {
    const virtuals = expandRecurringForDay(recurring, day);
    const realKeys = new Set(
      appointments.map((a) => `${a.student_id}-${parseISO(a.scheduled_at).getHours()}:${parseISO(a.scheduled_at).getMinutes()}`)
    );
    const merged: MergedSlot[] = appointments.map((a) => ({
      key: `real-${a.id}`,
      scheduled_at: a.scheduled_at,
      duration_minutes: a.duration_minutes,
      student_id: a.student_id,
      equipment_id: a.equipment_id,
      notes: a.notes,
      appointment: a as any,
    }));
    virtuals.forEach((v) => {
      const t = new Date(v.scheduled_at);
      const k = `${v.student_id}-${t.getHours()}:${t.getMinutes()}`;
      if (!realKeys.has(k)) {
        merged.push({
          key: `virt-${v.recurring_id}-${v.scheduled_at}`,
          scheduled_at: v.scheduled_at,
          duration_minutes: v.duration_minutes,
          student_id: v.student_id,
          equipment_id: v.equipment_id,
          notes: v.notes,
          recurring_id: v.recurring_id,
        });
      }
    });
    return merged.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  }, [appointments, recurring, day]);

  // Contagem por dia da semana (real + virtual)
  const weekCounts = useMemo(() => {
    const map = new Map<string, number>();
    week.forEach((d) => {
      const v = expandRecurringForDay(recurring, d).length;
      map.set(d.toDateString(), v);
    });
    appointments.forEach((a) => {
      const k = parseISO(a.scheduled_at).toDateString();
      map.set(k, (map.get(k) || 0) + 1);
    });
    return map;
  }, [recurring, appointments, week]);

  const studentName = (id: string) => students.find((s) => s.id === id)?.full_name || '—';
  const studentAvatar = (id: string) => (students.find((s) => s.id === id) as any)?.avatar_url;
  const equipmentName = (id: string | null) => equipment.find((e) => e.id === id)?.name || 'Sem equipamento';

  // Materializar virtual em real quando precisar (check-in ou definir grade)
  const materialize = async (slot: MergedSlot): Promise<string | null> => {
    if (slot.appointment) return slot.appointment.id;
    if (!user || !activeClinicId) return null;
    const { data, error } = await supabase.from('class_appointments').insert({
      clinic_id: activeClinicId,
      student_id: slot.student_id,
      equipment_id: slot.equipment_id,
      instructor_id: user.id,
      scheduled_at: slot.scheduled_at,
      duration_minutes: slot.duration_minutes,
      notes: slot.notes,
      created_by: user.id,
      recurring_schedule_id: slot.recurring_id || null,
    }).select('id').single();
    if (error) { toast.error(error.message); return null; }
    return data.id;
  };

  // Definir grade (sequência) para um slot
  const [gradeOpen, setGradeOpen] = useState<MergedSlot | null>(null);
  const [gradeSeq, setGradeSeq] = useState('');
  const assignGrade = async () => {
    if (!gradeOpen || !gradeSeq || !user || !activeClinicId) return;
    const apptId = await materialize(gradeOpen);
    if (!apptId) return;
    // cria prescrição (in_class) para a data
    const dateOnly = new Date(gradeOpen.scheduled_at).toISOString().slice(0, 10);
    const presc = await createPresc.mutateAsync({
      clinic_id: activeClinicId,
      student_id: gradeOpen.student_id,
      sequence_id: gradeSeq,
      context: 'in_class',
      created_by: user.id,
      scheduled_for: dateOnly,
    } as any);
    // vincula prescription/sequence ao appointment
    const prescId = (presc as any)?.id || (presc as any)?.[0]?.id;
    await supabase.from('class_appointments').update({
      sequence_id: gradeSeq,
      prescription_id: prescId || null,
    }).eq('id', apptId);
    toast.success('Grade definida para a aula');
    // notify student
    const stu = students.find((s) => s.id === gradeOpen.student_id);
    if (stu?.user_id) {
      await supabase.from('notifications').insert({
        user_id: stu.user_id,
        clinic_id: activeClinicId,
        type: 'general',
        title: 'Grade da próxima aula está pronta',
        body: `${format(parseISO(gradeOpen.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}`,
        link: '/meu-pilates',
      });
    }
    setGradeOpen(null);
    setGradeSeq('');
  };

  const handleCheckIn = async (slot: MergedSlot) => {
    const apptId = await materialize(slot);
    if (apptId) updateStatus.mutate({ id: apptId, status: 'checked_in' });
  };

  return (
    <>
      <ClinicPageHeader icon={CalendarDays} title="Agenda" subtitle="Aulas fixas + avulsas, com grade pré-montada por aluno" />
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-end flex-wrap gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Aula avulsa</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Agendar em {format(day, "dd/MM/yyyy", { locale: ptBR })}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm">Aluno</label>
                <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm">Horário disponível na grade</label>
                <Select value={form.bookable_slot_id} onValueChange={(v) => setForm({ ...form, bookable_slot_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={availableSlots.length ? 'Selecione um horário' : 'Sem horários na grade deste dia'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSlots.map((s) => {
                      const used = slotOccupancy.get(s.id) || 0;
                      const free = (s.capacity || 1) - used;
                      const eqName = equipment.find((e) => e.id === s.equipment_id)?.name;
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          {format(parseISO(s.scheduled_at), 'HH:mm')} · {s.duration_minutes}min{eqName ? ` · ${eqName}` : ''} · {free} vaga{free !== 1 ? 's' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {availableSlots.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure os horários em <span className="font-medium">Grade Master</span> para esta data.
                  </p>
                )}
              </div>
              <div><label className="text-sm">Observações</label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleCreate} disabled={!form.student_id || !form.bookable_slot_id} className="w-full">Agendar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Week strip */}
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setDay((d) => addDays(d, -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="flex-1 grid grid-cols-7 gap-1">
            {week.map((d) => {
              const active = isSameDay(d, day);
              const count = weekCounts.get(d.toDateString()) || 0;
              return (
                <button key={d.toISOString()} onClick={() => setDay(d)} className={`p-2 rounded-lg text-center transition relative ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  <div className="text-[10px] uppercase">{format(d, 'EEE', { locale: ptBR })}</div>
                  <div className="text-lg font-bold">{format(d, 'd')}</div>
                  {count > 0 && (
                    <div className={`text-[10px] mt-0.5 ${active ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                      {count} aula{count > 1 ? 's' : ''}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setDay((d) => addDays(d, 7))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">{format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })} · {slots.length} aula(s)</h2>
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma aula nesse dia.</p>
        ) : (
          <div className="space-y-2">
            {slots.map((s) => {
              const isVirt = !s.appointment;
              const sl = s.appointment ? STATUS_LABEL[s.appointment.status] : { label: 'Fixo', variant: 'secondary' as any };
              const seqId = s.appointment?.sequence_id;
              const seqName = seqId ? sequences.find((x) => x.id === seqId)?.name : null;
              const av = studentAvatar(s.student_id);
              return (
                <div key={s.key} className={`flex items-center gap-3 p-3 rounded-lg border ${isVirt ? 'border-dashed' : ''}`}>
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
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate flex items-center gap-1.5">
                      {studentName(s.student_id)}
                      {isVirt && <Repeat className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {equipmentName(s.equipment_id)}
                      {seqName && <span className="ml-2 text-primary"><Sparkles className="h-3 w-3 inline mr-0.5" />{seqName}</span>}
                    </div>
                  </div>
                  <Badge variant={sl.variant}>{sl.label}</Badge>
                  <Button size="sm" variant="outline" onClick={() => { setGradeOpen(s); setGradeSeq(seqId || ''); }}>
                    <ListChecks className="h-3.5 w-3.5 mr-1" />{seqName ? 'Trocar' : 'Grade'}
                  </Button>
                  {(!s.appointment || s.appointment.status === 'scheduled') && (
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

      {/* Dialog: definir grade */}
      <Dialog open={!!gradeOpen} onOpenChange={(o) => !o && setGradeOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Grade · {gradeOpen ? studentName(gradeOpen.student_id) : ''} · {gradeOpen && format(parseISO(gradeOpen.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
    </>
  );
}
