// @ts-nocheck — Ported from CRM Pilar; references tables not present in this project.
import { useState, useMemo } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBookableSlots, useClinicSettings } from '@/hooks/useBookableSlots';
import { useEquipment } from '@/hooks/useClinicData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, X, Lock } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ConfirmProvider';

export default function BookClassPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeClinicId } = useUserRoles();
  const qc = useQueryClient();
  const { confirm } = useConfirm();

  const [day, setDay] = useState(() => new Date());

  const { data: studentRow } = useQuery({
    queryKey: ['my-student', user?.id, activeClinicId],
    queryFn: async () => {
      if (!user || !activeClinicId) return null;
      const { data } = await supabase.from('clinic_students').select('*').eq('user_id', user.id).eq('clinic_id', activeClinicId).maybeSingle();
      return data as any;
    },
    enabled: !!user && !!activeClinicId,
  });

  const fromISO = useMemo(() => {
    const d = startOfWeek(day, { weekStartsOn: 1 });
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [day]);
  const toISO = useMemo(() => {
    const d = startOfWeek(day, { weekStartsOn: 1 });
    d.setDate(d.getDate() + 7);
    return d.toISOString();
  }, [day]);

  const { data: slots = [] } = useBookableSlots(activeClinicId, fromISO, toISO);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const { data: settings } = useClinicSettings(activeClinicId);

  // Reservas existentes do aluno (mesma faixa de datas)
  const { data: myAppts = [] } = useQuery({
    queryKey: ['my-appointments', studentRow?.id, fromISO, toISO],
    queryFn: async () => {
      if (!studentRow?.id) return [];
      const { data } = await supabase.from('class_appointments').select('*')
        .eq('student_id', studentRow.id)
        .gte('scheduled_at', fromISO)
        .lte('scheduled_at', toISO)
        .order('scheduled_at');
      return (data ?? []) as any[];
    },
    enabled: !!studentRow?.id,
  });

  // Conta reservas por slot (para mostrar lotação)
  const { data: countsBySlot = {} } = useQuery({
    queryKey: ['slot-counts', activeClinicId, fromISO, toISO],
    queryFn: async () => {
      if (!activeClinicId) return {};
      const { data } = await supabase.from('class_appointments').select('bookable_slot_id, status')
        .eq('clinic_id', activeClinicId)
        .gte('scheduled_at', fromISO)
        .lte('scheduled_at', toISO)
        .neq('status', 'cancelled');
      const m: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { if (r.bookable_slot_id) m[r.bookable_slot_id] = (m[r.bookable_slot_id] || 0) + 1; });
      return m;
    },
    enabled: !!activeClinicId,
  });

  const book = useMutation({
    mutationFn: async (slot: any) => {
      if (!studentRow || !user) throw new Error('Aluno não encontrado');
      const { error } = await supabase.from('class_appointments').insert({
        clinic_id: slot.clinic_id,
        student_id: studentRow.id,
        equipment_id: slot.equipment_id,
        instructor_id: slot.instructor_id,
        scheduled_at: slot.scheduled_at,
        duration_minutes: slot.duration_minutes,
        bookable_slot_id: slot.id,
        booked_by_student: true,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-appointments'] });
      qc.invalidateQueries({ queryKey: ['slot-counts'] });
      toast.success('Aula reservada!');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao reservar'),
  });

  const cancel = useMutation({
    mutationFn: async (apptId: string) => {
      const { error } = await supabase.from('class_appointments')
        .update({ status: 'cancelled', cancelled_by: user!.id, cancelled_at: new Date().toISOString() })
        .eq('id', apptId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-appointments'] });
      qc.invalidateQueries({ queryKey: ['slot-counts'] });
      toast.success('Reserva cancelada');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao cancelar'),
  });

  const week = useMemo(() => {
    const start = startOfWeek(day, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [day]);

  const slotsToday = slots.filter((s) => isSameDay(parseISO(s.scheduled_at), day));
  const eqName = (id: string | null) => equipment.find((e) => e.id === id)?.name || 'Sem equipamento definido';
  const myApptForSlot = (slotId: string) => myAppts.find((a) => a.bookable_slot_id === slotId && a.status !== 'cancelled');

  const minHours = settings?.cancellation_min_hours ?? 6;
  const maxAhead = settings?.booking_open_days_ahead ?? 30;
  const limitDate = addDays(new Date(), maxAhead);

  // Saldo de contrato
  const contractInfo = useMemo(() => {
    if (!studentRow) return null;
    if (studentRow.contract_type === 'classes') {
      const used = studentRow.contract_classes_used || 0;
      const total = studentRow.contract_classes_total || 0;
      return { type: 'classes', label: `${Math.max(total - used, 0)} de ${total} aulas restantes`, blocked: used >= total && total > 0 };
    }
    if (studentRow.contract_type === 'period') {
      return { type: 'period', label: `Contrato: ${studentRow.contract_start_date || '—'} → ${studentRow.contract_end_date || '—'}`, blocked: false };
    }
    return null;
  }, [studentRow]);

  if (!studentRow) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-muted-foreground">Você não está vinculado a uma clínica.</p>
        <Button variant="outline" onClick={() => navigate('/meu-pilates')}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto pb-24 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/meu-pilates')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarIcon className="h-6 w-6 text-primary" />Reservar aula</h1>
      </div>

      {contractInfo && (
        <Card className={`p-3 text-sm ${contractInfo.blocked ? 'border-destructive bg-destructive/5' : 'bg-muted/50'}`}>
          {contractInfo.label}
          {contractInfo.blocked && <div className="text-xs text-destructive mt-1">Pacote esgotado. Fale com a clínica.</div>}
        </Card>
      )}

      <Card className="p-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setDay((d) => addDays(d, -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="flex-1 grid grid-cols-7 gap-1">
            {week.map((d) => {
              const active = isSameDay(d, day);
              return (
                <button key={d.toISOString()} onClick={() => setDay(d)}
                  className={`p-2 rounded-lg text-center transition ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
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
        <h2 className="font-semibold mb-3">{format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h2>
        {slotsToday.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum horário aberto neste dia.</p>
        ) : (
          <div className="space-y-2">
            {slotsToday.map((s) => {
              const sched = parseISO(s.scheduled_at);
              const booked = countsBySlot[s.id] || 0;
              const myReserve = myApptForSlot(s.id);
              const past = sched < new Date();
              const tooFar = sched > limitDate;
              const full = booked >= s.capacity;
              const hoursToGo = differenceInHours(sched, new Date());
              const canCancel = hoursToGo >= minHours;
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="text-center min-w-[60px]">
                    <div className="font-bold text-lg">{format(sched, 'HH:mm')}</div>
                    <div className="text-[10px] text-muted-foreground">{s.duration_minutes}min</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{eqName(s.equipment_id)}</div>
                    <div className="text-xs text-muted-foreground">{booked}/{s.capacity} reservado(s)</div>
                  </div>
                  {myReserve ? (
                    <>
                      <Badge>Reservada</Badge>
                      <Button size="sm" variant="outline" disabled={!canCancel || cancel.isPending}
                        onClick={async () => { if (await confirm({ title: 'Cancelar reserva', description: `Cancelar a reserva de ${format(sched, 'dd/MM HH:mm')}?`, destructive: true })) cancel.mutate(myReserve.id); }}>
                        {canCancel ? <><X className="h-3.5 w-3.5 mr-1" />Cancelar</> : <><Lock className="h-3.5 w-3.5 mr-1" />Min {minHours}h</>}
                      </Button>
                    </>
                  ) : past ? (
                    <Badge variant="outline">Encerrado</Badge>
                  ) : tooFar ? (
                    <Badge variant="outline">Fora da janela</Badge>
                  ) : full ? (
                    <Badge variant="destructive">Lotado</Badge>
                  ) : contractInfo?.blocked ? (
                    <Badge variant="outline">Sem saldo</Badge>
                  ) : (
                    <Button size="sm" disabled={book.isPending} onClick={() => book.mutate(s)}>
                      <Check className="h-3.5 w-3.5 mr-1" />Reservar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Reservas só podem ser canceladas com pelo menos {minHours}h de antecedência.
      </p>
    </div>
  );
}
