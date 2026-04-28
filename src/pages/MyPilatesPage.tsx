// @ts-nocheck — Ported from CRM Pilar; references tables not present in this project.
import { useUserRoles } from '@/hooks/useUserRoles';
import { usePrescriptions } from '@/hooks/useClinicData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Check, ArrowLeft, CalendarPlus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function MyPilatesPage() {
  const { user } = useAuth();
  const { activeClinicId } = useUserRoles();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: studentRow } = useQuery({
    queryKey: ['my-student', user?.id, activeClinicId],
    queryFn: async () => {
      if (!user || !activeClinicId) return null;
      const { data } = await supabase.from('clinic_students').select('*').eq('user_id', user.id).eq('clinic_id', activeClinicId).maybeSingle();
      return data;
    },
    enabled: !!user && !!activeClinicId,
  });

  const { data: prescriptions = [], updateStatus } = usePrescriptions({ studentId: studentRow?.id ?? null });

  const { data: items = [] } = useQuery({
    queryKey: ['my-presc-items', openId],
    queryFn: async () => {
      if (!openId) return [];
      const presc = prescriptions.find((p) => p.id === openId);
      if (!presc) return [];
      const { data } = await supabase.from('exercise_sequence_items').select('*').eq('sequence_id', presc.sequence_id).order('order_index');
      return data ?? [];
    },
    enabled: !!openId,
  });

  const { data: sequencesById = {} } = useQuery({
    queryKey: ['my-sequences', prescriptions.map((p) => p.sequence_id).join(',')],
    queryFn: async () => {
      const ids = Array.from(new Set(prescriptions.map((p) => p.sequence_id)));
      if (ids.length === 0) return {};
      const { data } = await supabase.from('exercise_sequences').select('id, name').in('id', ids);
      return Object.fromEntries((data ?? []).map((s) => [s.id, s.name]));
    },
    enabled: prescriptions.length > 0,
  });

  const markDone = async (prescId: string) => {
    const presc = prescriptions.find((p) => p.id === prescId);
    if (!presc || !studentRow) return;
    // Log all items as executed
    const { data: its } = await supabase.from('exercise_sequence_items').select('*').eq('sequence_id', presc.sequence_id);
    if (its && its.length > 0) {
      await supabase.from('execution_log').insert(its.map((it) => ({
        clinic_id: presc.clinic_id,
        student_id: studentRow.id,
        prescription_id: presc.id,
        sequence_id: presc.sequence_id,
        sequence_item_id: it.id,
        exercise_name: it.name,
        context: presc.context,
      })));
    }
    await updateStatus.mutateAsync({ id: prescId, status: 'completed' });
    toast.success('Treino registrado!');
    setOpenId(null);
  };

  if (!studentRow) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-muted-foreground">Você ainda não está vinculado a uma clínica de Pilates.</p>
        <p className="text-xs text-muted-foreground">Peça à sua clínica para te cadastrar com este e-mail.</p>
        <Button variant="outline" onClick={() => navigate('/')}>Voltar</Button>
      </div>
    );
  }

  if (openId) {
    const presc = prescriptions.find((p) => p.id === openId);
    return (
      <div className="min-h-screen p-6 max-w-2xl mx-auto pb-24">
        <Button variant="ghost" onClick={() => setOpenId(null)} className="mb-3"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
        <h1 className="text-2xl font-bold mb-1">{presc && sequencesById[presc.sequence_id]}</h1>
        <p className="text-sm text-muted-foreground mb-4">{presc?.context === 'in_class' ? 'Aula presencial' : 'Para casa'}</p>
        <div className="space-y-2 mb-6">
          {items.map((it: any, idx: number) => (
            <Card key={it.id} className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{idx + 1}</div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{it.name}</div>
                <div className="text-xs text-muted-foreground">{it.sets} séries × {it.reps} reps {it.notes ? `· ${it.notes}` : ''}</div>
              </div>
            </Card>
          ))}
        </div>
        <Button size="lg" className="w-full" onClick={() => markDone(openId)}><Check className="h-5 w-5 mr-2" />Marcar como feito</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" />Meu Pilates</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>Início</Button>
      </div>

      <Button className="w-full mb-6" size="lg" onClick={() => navigate('/meu-pilates/agendar')}>
        <CalendarPlus className="h-5 w-5 mr-2" />Reservar uma aula
      </Button>

      <h2 className="font-semibold mb-2">Pendentes</h2>
      <div className="space-y-2 mb-6">
        {prescriptions.filter((p) => p.status !== 'completed').length === 0 && <p className="text-sm text-muted-foreground">Nada pendente.</p>}
        {prescriptions.filter((p) => p.status !== 'completed').map((p) => (
          <Card key={p.id} className="p-4 cursor-pointer hover:shadow" onClick={() => setOpenId(p.id)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{sequencesById[p.sequence_id] || 'Sequência'}</div>
                <div className="text-xs text-muted-foreground">{p.context === 'in_class' ? 'Presencial' : 'Para casa'} · {format(new Date(p.created_at), 'dd/MM')}</div>
              </div>
              <Badge variant="secondary">{p.status}</Badge>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="font-semibold mb-2">Histórico</h2>
      <div className="space-y-2">
        {prescriptions.filter((p) => p.status === 'completed').slice(0, 10).map((p) => (
          <Card key={p.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{sequencesById[p.sequence_id]}</div>
              <div className="text-xs text-muted-foreground">{p.completed_at ? format(new Date(p.completed_at), 'dd/MM/yyyy') : ''}</div>
            </div>
            <Check className="h-4 w-4 text-emerald-500" />
          </Card>
        ))}
      </div>
    </div>
  );
}
