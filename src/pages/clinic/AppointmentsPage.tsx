import { useState, useMemo } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { useAppointments, type AppointmentStatus } from '@/hooks/useAppointments';
import { useStudents, useEquipment } from '@/hooks/useClinicData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, LogIn, Trash2 } from 'lucide-react';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STATUS_LABEL: Record<AppointmentStatus, { label: string; variant: any }> = {
  scheduled: { label: 'Agendado', variant: 'secondary' },
  checked_in: { label: 'Check-in', variant: 'default' },
  in_progress: { label: 'Em aula', variant: 'default' },
  completed: { label: 'Concluído', variant: 'outline' },
  no_show: { label: 'Faltou', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
};

export default function AppointmentsPage() {
  const { activeClinicId } = useUserRoles();
  const { user } = useAuth();
  const [day, setDay] = useState(() => new Date());
  const dayISO = day.toISOString();

  const { data: appointments = [], create, updateStatus, remove } = useAppointments(activeClinicId, dayISO);
  const { data: students = [] } = useStudents(activeClinicId);
  const { data: equipment = [] } = useEquipment(activeClinicId);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ student_id: '', equipment_id: '', time: '08:00', duration_minutes: 50, notes: '' });

  const handleCreate = async () => {
    if (!user || !activeClinicId || !form.student_id) return;
    const [h, m] = form.time.split(':').map(Number);
    const sched = new Date(day);
    sched.setHours(h, m, 0, 0);
    await create.mutateAsync({
      clinic_id: activeClinicId,
      student_id: form.student_id,
      equipment_id: form.equipment_id || null,
      instructor_id: user.id,
      scheduled_at: sched.toISOString(),
      duration_minutes: form.duration_minutes,
      notes: form.notes || null,
      created_by: user.id,
    });
    // Notification for student
    const stu = students.find((s) => s.id === form.student_id);
    if (stu?.user_id) {
      await supabase.from('notifications').insert({
        user_id: stu.user_id,
        clinic_id: activeClinicId,
        type: 'appointment_reminder',
        title: 'Nova aula agendada',
        body: `${format(sched, "dd/MM 'às' HH:mm", { locale: ptBR })}`,
        link: '/meu-pilates',
      });
    }
    setForm({ student_id: '', equipment_id: '', time: '08:00', duration_minutes: 50, notes: '' });
    setOpen(false);
  };

  const week = useMemo(() => {
    const start = new Date(day);
    start.setDate(start.getDate() - 3);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [day]);

  const studentName = (id: string) => students.find((s) => s.id === id)?.full_name || '—';
  const equipmentName = (id: string | null) => equipment.find((e) => e.id === id)?.name || 'Sem equipamento';

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" />Agenda</h1>
          <p className="text-sm text-muted-foreground">Agende aulas e faça check-in dos alunos.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova aula</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Agendar aula em {format(day, "dd/MM/yyyy", { locale: ptBR })}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm">Aluno</label>
                <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Hora</label>
                  <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm">Duração (min)</label>
                  <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 50 })} />
                </div>
              </div>
              <div>
                <label className="text-sm">Equipamento</label>
                <Select value={form.equipment_id} onValueChange={(v) => setForm({ ...form, equipment_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>{equipment.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm">Observações</label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button onClick={handleCreate} disabled={!form.student_id} className="w-full">Agendar</Button>
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
              return (
                <button key={d.toISOString()} onClick={() => setDay(d)} className={`p-2 rounded-lg text-center transition ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  <div className="text-[10px] uppercase">{format(d, 'EEE', { locale: ptBR })}</div>
                  <div className="text-lg font-bold">{format(d, 'd')}</div>
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setDay((d) => addDays(d, 7))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">{format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })} · {appointments.length} aula(s)</h2>
        {appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma aula nesse dia.</p>
        ) : (
          <div className="space-y-2">
            {appointments.map((a) => {
              const sl = STATUS_LABEL[a.status];
              return (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="text-center min-w-[60px]">
                    <div className="font-bold text-lg">{format(parseISO(a.scheduled_at), 'HH:mm')}</div>
                    <div className="text-[10px] text-muted-foreground">{a.duration_minutes}min</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{studentName(a.student_id)}</div>
                    <div className="text-xs text-muted-foreground">{equipmentName(a.equipment_id)}</div>
                  </div>
                  <Badge variant={sl.variant}>{sl.label}</Badge>
                  {a.status === 'scheduled' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: a.id, status: 'checked_in' })}>
                      <LogIn className="h-3.5 w-3.5 mr-1" />Check-in
                    </Button>
                  )}
                  {(a.status === 'checked_in' || a.status === 'in_progress') && (
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: a.id, status: 'completed' })}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Concluir
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm('Excluir aula?')) remove.mutate(a.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
