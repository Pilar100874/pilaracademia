import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface SnapshotExercise {
  name: string;
  sets: number;
  reps: number;
  order_index: number;
  is_cooldown?: boolean;
  image_urls?: string[];
  image_url?: string | null;
  video_url?: string | null;
  video_type?: string | null;
  video_start_seconds?: number | null;
  video_end_seconds?: number | null;
  body_analysis?: any;
  aesthetic_analysis?: any;
  mobility_analysis?: any;
  body_analyzed_at?: string | null;
  category_ids?: string[];
}

interface Snapshot {
  exercises: SnapshotExercise[];
  days_of_week?: number[];
  cooldown_enabled?: boolean;
}

/**
 * Tela para usuário **logado** revisar e aprovar a importação de um treino
 * compartilhado por outra pessoa via QR/link. Copia o plano + os exercícios
 * + cria entradas faltantes na biblioteca pessoal.
 */
export function ImportWorkoutPage() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('workout_shares')
          .select('plan_name, snapshot, expires_at, active')
          .eq('token', token)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        if (!data) {
          setError('Link inválido.');
        } else if (!data.active || new Date(data.expires_at) <= new Date()) {
          setError('Este link expirou. Peça outro QR para o remetente.');
        } else {
          setPlanName(data.plan_name);
          setSnapshot(data.snapshot as Snapshot);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Erro ao carregar.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleImport = async () => {
    if (!user || !snapshot) return;
    setImporting(true);
    try {
      // 1) Cria o plano
      const { data: newPlan, error: planErr } = await supabase
        .from('workout_plans')
        .insert({
          user_id: user.id,
          name: `${planName} (importado)`,
          days_of_week: snapshot.days_of_week ?? [],
          cooldown_enabled: snapshot.cooldown_enabled ?? false,
        } as any)
        .select()
        .single();
      if (planErr || !newPlan) throw planErr ?? new Error('Falha ao criar plano');

      // 2) Para cada exercício, garante existência na biblioteca pessoal
      const exercises = [...(snapshot.exercises ?? [])].sort(
        (a, b) => a.order_index - b.order_index,
      );

      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        let libId: string | null = null;

        // Tenta encontrar por nome na biblioteca do próprio usuário
        const { data: existing } = await supabase
          .from('exercise_library')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', ex.name)
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          libId = existing.id;
        } else {
          // Cria nova entrada na biblioteca pessoal
          const { data: created, error: libErr } = await supabase
            .from('exercise_library')
            .insert({
              user_id: user.id,
              name: ex.name,
              image_urls: ex.image_urls ?? [],
              video_url: ex.video_url ?? null,
              video_type: ex.video_type ?? null,
              video_start_seconds: ex.video_start_seconds ?? null,
              video_end_seconds: ex.video_end_seconds ?? null,
              default_sets: ex.sets,
              default_reps: ex.reps,
              body_analysis: ex.body_analysis ?? null,
              aesthetic_analysis: ex.aesthetic_analysis ?? null,
              mobility_analysis: ex.mobility_analysis ?? null,
              body_analyzed_at: ex.body_analyzed_at ?? null,
              is_global: false,
              clinic_id: null,
            } as any)
            .select('id')
            .single();
          if (libErr) throw libErr;
          libId = created?.id ?? null;
        }

        await supabase.from('workout_exercises').insert({
          workout_plan_id: newPlan.id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          order_index: i,
          is_cooldown: !!ex.is_cooldown,
          image_urls: ex.image_urls ?? [],
          video_url: ex.video_url ?? null,
          video_type: ex.video_type ?? null,
          video_start_seconds: ex.video_start_seconds ?? null,
          video_end_seconds: ex.video_end_seconds ?? null,
          exercise_library_id: libId,
        } as any);
      }

      queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
      setDone(true);
      toast.success('Treino importado!');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Erro ao importar treino');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-3">
            <X className="h-10 w-10 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold">Não foi possível importar</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => navigate('/workouts')}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-semibold">Treino importado!</h1>
            <p className="text-sm text-muted-foreground">
              "{planName}" foi adicionado aos seus treinos.
            </p>
            <Button onClick={() => navigate('/workouts')}>Ver meus treinos</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const exercises = snapshot?.exercises ?? [];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Importar treino compartilhado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome do treino</p>
              <p className="font-semibold">{planName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Exercícios ({exercises.length})</p>
              <ul className="mt-2 space-y-1 max-h-72 overflow-y-auto pr-1">
                {exercises.map((ex, i) => (
                  <li key={i} className="text-sm flex items-center justify-between gap-3 border-b border-border/50 pb-1 last:border-0">
                    <span className="truncate">{ex.name}</span>
                    <span className="text-muted-foreground tabular-nums shrink-0 text-xs">
                      {ex.sets}×{ex.reps}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              Os exercícios que ainda não estão na sua biblioteca serão copiados (com vídeo, fotos e análises de IA quando existirem).
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/workouts')} disabled={importing}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleImport} disabled={importing}>
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando…</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" /> Importar treino</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
