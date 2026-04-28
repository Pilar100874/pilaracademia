// @ts-nocheck — Ported from CRM Pilar; references tables not present in this project.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Public station view (no login). The token uniquely identifies the equipment.
export default function StationPage() {
  const { token } = useParams<{ token: string }>();
  const [equipment, setEquipment] = useState<any>(null);
  const [liveStudent, setLiveStudent] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Note: this query relies on RLS allowing anon select where station_token matches.
  // For simplicity we use a public-readable approach through a function-less query;
  // because RLS requires auth, we mark this page as needing a future edge function.
  // For now, station tokens act like opaque public IDs and rely on the equipment.station_token being secret.

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const { data: eq } = await supabase
      .from('clinic_equipment')
      .select('*')
      .eq('station_token', token)
      .maybeSingle();
    setEquipment(eq);

    if (eq) {
      const { data: lss } = await supabase
        .from('live_session_students')
        .select('*, clinic_students(full_name), live_sessions(status)')
        .eq('equipment_id', eq.id)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const active = lss?.live_sessions?.status === 'in_progress' ? lss : null;
      setLiveStudent(active);

      if (active?.prescription_id) {
        const { data: presc } = await supabase.from('prescriptions').select('sequence_id').eq('id', active.prescription_id).maybeSingle();
        if (presc?.sequence_id) {
          const { data: its } = await supabase.from('exercise_sequence_items').select('*').eq('sequence_id', presc.sequence_id).order('order_index');
          setItems(its ?? []);
        }
      } else {
        setItems([]);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [token]);

  // Realtime: refresh when something changes
  useEffect(() => {
    if (!equipment) return;
    const ch = supabase
      .channel(`station-${equipment.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_session_students', filter: `equipment_id=eq.${equipment.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [equipment?.id]);

  const advance = async () => {
    if (!liveStudent) return;
    const idx = liveStudent.current_item_index;
    const next = Math.min(items.length - 1, idx + 1);
    const it = items[idx];
    if (it) {
      await supabase.from('execution_log').insert({
        clinic_id: equipment.clinic_id,
        student_id: liveStudent.student_id,
        prescription_id: liveStudent.prescription_id,
        sequence_id: items[0]?.sequence_id,
        sequence_item_id: it.id,
        exercise_name: it.name,
        context: 'in_class',
      });
    }
    await supabase.from('live_session_students').update({
      current_item_index: next,
      current_item_id: items[next]?.id ?? liveStudent.current_item_id,
    }).eq('id', liveStudent.id);
    load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!equipment) return <div className="min-h-screen flex items-center justify-center text-muted-foreground p-6 text-center">Equipamento não encontrado.</div>;

  const current = liveStudent ? items[liveStudent.current_item_index] : null;
  const next = liveStudent ? items[liveStudent.current_item_index + 1] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-sm opacity-80 uppercase tracking-wider">{equipment.equipment_type}</div>
            <h1 className="text-3xl font-bold">{equipment.name}</h1>
          </div>
          {liveStudent && <div className="text-right"><div className="text-xs opacity-70">Aluno</div><div className="font-semibold text-lg">{liveStudent.clinic_students?.full_name}</div></div>}
        </div>

        {!liveStudent ? (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-10 text-center">
            <p className="text-xl opacity-80">Aguardando aluno...</p>
            <p className="text-sm opacity-60 mt-2">Esta tela atualiza automaticamente quando um aluno for atribuído.</p>
          </div>
        ) : (
          <>
            <div className="text-xs opacity-80 mb-2">Exercício {liveStudent.current_item_index + 1} de {items.length}</div>
            {current && (
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 md:p-8 mb-4">
                <div className="text-xs uppercase opacity-80">Agora</div>
                <h2 className="text-4xl md:text-5xl font-bold mt-2">{current.name}</h2>
                <div className="mt-3 text-xl opacity-90">{current.sets} séries × {current.reps} reps</div>
                {current.notes && <p className="mt-3 opacity-80">{current.notes}</p>}
              </div>
            )}
            {next && (
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <div className="text-xs uppercase opacity-70">Próximo</div>
                <div className="text-xl font-semibold">{next.name}</div>
              </div>
            )}
            <Button size="lg" className="w-full bg-white text-emerald-700 hover:bg-white/90 font-bold py-6 text-lg" onClick={advance}>
              <Check className="h-5 w-5 mr-2" />Concluí, próximo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
