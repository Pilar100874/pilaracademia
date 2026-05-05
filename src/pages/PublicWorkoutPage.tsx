import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dumbbell, Loader2, Play, CheckCircle2 } from 'lucide-react';
import { WorkoutViewerDialog } from '@/components/WorkoutViewerDialog';
import { WorkoutPlan, WorkoutExercise } from '@/hooks/useWorkoutPlans';
import { getFreshMediaUrl } from '@/lib/mediaUrl';

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
  body_analysis?: Record<string, number> | null;
  aesthetic_analysis?: Record<string, number> | null;
  mobility_analysis?: Record<string, number> | null;
}

/**
 * Página pública (sem login) que executa um treino compartilhado por QR/link
 * usando o MESMO viewer do app (fullscreen + análise + voz + coach).
 *
 * Antes de abrir o viewer, baixa imagens e vídeos (uploads) para o cache do
 * navegador e exibe uma barra de progresso com porcentagem.
 */
export function PublicWorkoutPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [exercises, setExercises] = useState<SnapshotExercise[]>([]);

  // Preload state
  const [preloadDone, setPreloadDone] = useState(0);
  const [preloadTotal, setPreloadTotal] = useState(0);
  const [preloadCurrent, setPreloadCurrent] = useState<string>('');
  const [ready, setReady] = useState(false);
  const [preloading, setPreloading] = useState(false);

  // Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const startedRef = useRef(false);

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
          setError('Link inválido ou expirado.');
        } else if (!data.active || new Date(data.expires_at) <= new Date()) {
          setError('Este link expirou. Peça outro QR para continuar.');
        } else {
          setPlanName(data.plan_name);
          const list = (data.snapshot?.exercises ?? []) as SnapshotExercise[];
          setExercises([...list].sort((a, b) => a.order_index - b.order_index));
          (supabase as any).rpc('register_workout_share_view', { _token: token }).then(() => {});
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Erro ao carregar treino.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Build a synthetic WorkoutPlan compatible with WorkoutViewerDialog
  const plan = useMemo<WorkoutPlan | null>(() => {
    if (exercises.length === 0) return null;
    const mapped: WorkoutExercise[] = exercises.map((ex, i) => ({
      id: `share-${i}`,
      workout_plan_id: 'share',
      name: ex.name,
      image_url: ex.image_url ?? null,
      image_urls: ex.image_urls ?? [],
      sets: ex.sets,
      reps: ex.reps,
      order_index: ex.order_index ?? i,
      video_type: (ex.video_type ?? null) as any,
      video_url: ex.video_url ?? null,
      video_start_seconds: ex.video_start_seconds ?? null,
      video_end_seconds: ex.video_end_seconds ?? null,
      created_at: new Date().toISOString(),
      body_analysis: ex.body_analysis ?? null,
      aesthetic_analysis: ex.aesthetic_analysis ?? null,
      mobility_analysis: ex.mobility_analysis ?? null,
      is_cooldown: ex.is_cooldown ?? false,
    }));
    return {
      id: 'share',
      user_id: 'share',
      name: planName,
      days_of_week: [],
      cooldown_enabled: false,
      is_cooldown_plan: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      exercises: mapped,
    };
  }, [exercises, planName]);

  // Preload assets (images + uploaded videos) before allowing start
  const startPreload = async () => {
    if (preloading || ready) return;
    setPreloading(true);

    // Build list of assets to preload
    type Asset = { kind: 'img' | 'video'; url: string; label: string };
    const assets: Asset[] = [];
    for (const ex of exercises) {
      const imgs = ex.image_urls?.length ? ex.image_urls : ex.image_url ? [ex.image_url] : [];
      for (const url of imgs) {
        const fresh = getFreshMediaUrl(url) ?? url;
        if (fresh) assets.push({ kind: 'img', url: fresh, label: ex.name });
      }
      if (ex.video_url && ex.video_type === 'upload') {
        const fresh = getFreshMediaUrl(ex.video_url) ?? ex.video_url;
        assets.push({ kind: 'video', url: fresh, label: ex.name });
      }
    }

    setPreloadTotal(assets.length);
    setPreloadDone(0);

    if (assets.length === 0) {
      setReady(true);
      setPreloading(false);
      return;
    }

    let done = 0;
    // Process with limited concurrency
    const CONCURRENCY = 3;
    let cursor = 0;
    const worker = async () => {
      while (cursor < assets.length) {
        const i = cursor++;
        const a = assets[i];
        setPreloadCurrent(a.label);
        try {
          if (a.kind === 'img') {
            await new Promise<void>((res) => {
              const img = new Image();
              img.onload = () => res();
              img.onerror = () => res();
              img.src = a.url;
            });
          } else {
            // Fetch video into cache (best-effort, ignore CORS errors)
            await fetch(a.url, { cache: 'force-cache' }).catch(() => {});
          }
        } catch { /* ignore */ }
        done += 1;
        setPreloadDone(done);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, assets.length) }, worker));

    setReady(true);
    setPreloading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-3">
            <Dumbbell className="h-10 w-10 text-muted-foreground mx-auto" />
            <h1 className="text-xl font-semibold">Não foi possível abrir o treino</h1>
            <p className="text-sm text-muted-foreground">{error ?? 'Sem exercícios.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-semibold">Treino concluído!</h1>
            <p className="text-sm text-muted-foreground">
              Você completou "{planName}".
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setFinished(false);
                startedRef.current = false;
                setViewerOpen(true);
                startedRef.current = true;
              }}
            >
              Refazer treino
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pct = preloadTotal > 0 ? Math.round((preloadDone / preloadTotal) * 100) : 0;

  return (
    <>
      {/* Pre-launch screen with progress bar */}
      {!viewerOpen && (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 space-y-5">
              <div className="text-center space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Treino compartilhado
                </p>
                <h1 className="text-2xl font-serif">{planName}</h1>
                <p className="text-sm text-muted-foreground">
                  {exercises.length} exercício{exercises.length !== 1 ? 's' : ''} · execução em tela cheia
                </p>
              </div>

              {!ready ? (
                <>
                  {preloading ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate">
                          Carregando: {preloadCurrent || '...'}
                        </span>
                        <span className="tabular-nums font-medium">
                          {preloadDone}/{preloadTotal} · {pct}%
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                      <p className="text-[11px] text-muted-foreground text-center">
                        Baixando vídeos e fotos para reprodução fluida...
                      </p>
                    </div>
                  ) : (
                    <Button onClick={startPreload} className="w-full gap-2" size="lg">
                      <Play className="h-4 w-4" />
                      Preparar e começar
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  onClick={() => {
                    startedRef.current = true;
                    setViewerOpen(true);
                  }}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Play className="h-4 w-4" />
                  Iniciar treino
                </Button>
              )}

              <p className="text-[10px] text-muted-foreground text-center">
                Você não precisa de conta. Tudo roda no seu navegador.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fullscreen viewer (same as logged-in app) */}
      {plan && (
        <WorkoutViewerDialog
          open={viewerOpen}
          onOpenChange={(o) => {
            setViewerOpen(o);
            if (!o && startedRef.current) {
              setFinished(true);
            }
          }}
          plan={plan}
        />
      )}
    </>
  );
}
