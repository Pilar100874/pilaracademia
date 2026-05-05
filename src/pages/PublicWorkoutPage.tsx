import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Dumbbell, Loader2, Play, ImageIcon, CheckCircle2 } from 'lucide-react';
import { ExerciseVideoPlayer } from '@/components/ExerciseVideoPlayer';
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
}
interface Snapshot {
  exercises: SnapshotExercise[];
}

/**
 * Página pública (sem login) para executar um treino compartilhado por QR/link.
 * Apenas leitura — não salva nada na conta de ninguém.
 */
export function PublicWorkoutPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [exercises, setExercises] = useState<SnapshotExercise[]>([]);
  const [idx, setIdx] = useState(0);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [finished, setFinished] = useState(false);

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
          // Registra visualização (best-effort)
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

  const current = exercises[idx];
  const images = useMemo(() => {
    if (!current) return [] as string[];
    if (current.image_urls?.length) return current.image_urls;
    return current.image_url ? [current.image_url] : [];
  }, [current]);
  const hasVideo = !!(current?.video_url && current?.video_type);

  useEffect(() => {
    setPhotoIdx(0);
    setShowVideo(hasVideo);
  }, [idx, hasVideo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || exercises.length === 0) {
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
            <p className="text-sm text-muted-foreground">Você completou {exercises.length} exercício{exercises.length !== 1 ? 's' : ''} de "{planName}".</p>
            <Button variant="outline" onClick={() => { setIdx(0); setFinished(false); }}>
              Refazer treino
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-3xl flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Treino compartilhado</p>
            <h1 className="font-semibold truncate">{planName}</h1>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {idx + 1}/{exercises.length}
          </span>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-3xl w-full p-4 space-y-4">
        <div className="rounded-md border border-border overflow-hidden bg-muted aspect-video relative">
          {showVideo && hasVideo ? (
            <ExerciseVideoPlayer
              videoType={current.video_type as any}
              videoUrl={current.video_url!}
              startSeconds={current.video_start_seconds ?? undefined}
              endSeconds={current.video_end_seconds ?? undefined}
              autoPlay
            />
          ) : images.length > 0 ? (
            <img
              src={getFreshMediaUrl(images[photoIdx]) ?? images[photoIdx]}
              alt={current.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Dumbbell className="h-16 w-16 text-muted-foreground" />
            </div>
          )}

          {hasVideo && images.length > 0 && (
            <div className="absolute bottom-2 right-2 flex gap-1">
              <Button size="sm" variant={showVideo ? 'default' : 'secondary'} onClick={() => setShowVideo(true)}>
                <Play className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant={!showVideo ? 'default' : 'secondary'} onClick={() => setShowVideo(false)}>
                <ImageIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold">{current.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {current.sets} série{current.sets !== 1 ? 's' : ''} · {current.reps} repetiç{current.reps !== 1 ? 'ões' : 'ão'}
          </p>
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur p-3">
        <div className="mx-auto max-w-3xl flex items-center gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          {idx === exercises.length - 1 ? (
            <Button className="flex-1" onClick={() => setFinished(true)}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Finalizar
            </Button>
          ) : (
            <Button
              className="flex-1"
              onClick={() => setIdx((i) => Math.min(exercises.length - 1, i + 1))}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
