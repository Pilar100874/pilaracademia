import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ChevronLeft, ChevronRight, Dumbbell, Loader2, Play, CheckCircle2, ListOrdered,
} from 'lucide-react';
import { ExerciseVideoPlayer } from '@/components/ExerciseVideoPlayer';

type ShareLink = {
  id: string;
  sequence_id: string;
  expires_at: string | null;
  active: boolean;
};

type Sequence = {
  id: string;
  name: string;
  description: string | null;
  estimated_minutes: number | null;
};

type Item = {
  id: string;
  name: string;
  image_urls: string[] | null;
  sets: number;
  reps: number;
  notes: string | null;
  order_index: number;
  duration_seconds: number | null;
  rest_seconds: number | null;
  video_url: string | null;
  video_type: string | null;
  video_start_seconds: number | null;
  video_end_seconds: number | null;
};

export default function SharedSequencePage() {
  const { token } = useParams<{ token: string }>();
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  // 1. Resolve link by token
  const linkQ = useQuery({
    queryKey: ['share-link', token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sequence_share_links')
        .select('id,sequence_id,expires_at,active')
        .eq('token', token!)
        .maybeSingle();
      if (error) throw error;
      return data as ShareLink | null;
    },
  });

  const link = linkQ.data;
  const expired = !!link?.expires_at && new Date(link.expires_at) < new Date();
  const valid = link && link.active && !expired;

  // 2. Sequence header
  const seqQ = useQuery({
    queryKey: ['shared-sequence', link?.sequence_id],
    enabled: !!valid && !!link?.sequence_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_sequences')
        .select('id,name,description,estimated_minutes')
        .eq('id', link!.sequence_id)
        .maybeSingle();
      if (error) throw error;
      return data as Sequence | null;
    },
  });

  // 3. Items
  const itemsQ = useQuery({
    queryKey: ['shared-sequence-items', link?.sequence_id],
    enabled: !!valid && !!link?.sequence_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_sequence_items')
        .select('id,name,image_urls,sets,reps,notes,order_index,duration_seconds,rest_seconds,video_url,video_type,video_start_seconds,video_end_seconds')
        .eq('sequence_id', link!.sequence_id)
        .order('order_index');
      if (error) throw error;
      return (data || []) as Item[];
    },
  });

  // 4. Register view (once)
  useEffect(() => {
    if (token && valid) {
      supabase.rpc('register_share_link_view', { _token: token }).then(() => {});
    }
  }, [token, valid]);

  const items = itemsQ.data || [];
  const current = items[index];
  const total = items.length;

  const progress = useMemo(() => (total ? Math.round((completed.size / total) * 100) : 0), [completed, total]);

  if (linkQ.isLoading || seqQ.isLoading || itemsQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!link || !valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-sm w-full p-8 text-center space-y-3">
          <div className="h-14 w-14 rounded-full bg-destructive/10 mx-auto flex items-center justify-center">
            <ListOrdered className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-lg font-bold">Link indisponível</h1>
          <p className="text-sm text-muted-foreground">
            {expired
              ? 'Este link expirou. Peça um novo link à sua clínica.'
              : 'Este link não está mais ativo ou é inválido.'}
          </p>
        </Card>
      </div>
    );
  }

  const sequence = seqQ.data;

  if (!sequence || total === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-sm w-full p-8 text-center">
          <p className="text-sm text-muted-foreground">Esta sequência ainda não tem exercícios.</p>
        </Card>
      </div>
    );
  }

  const goPrev = () => setIndex(i => Math.max(0, i - 1));
  const goNext = () => setIndex(i => Math.min(total - 1, i + 1));
  const toggleDone = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const hasVideo = !!(current.video_url && current.video_type);
  const firstImage = current.image_urls?.[0];
  const isDone = completed.has(current.id);
  const isLast = index === total - 1;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-base sm:text-lg leading-tight truncate">{sequence.name}</h1>
              <p className="text-xs text-muted-foreground">
                Exercício {index + 1} de {total}
                {sequence.estimated_minutes ? ` · ~${sequence.estimated_minutes} min` : ''}
              </p>
            </div>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Current exercise */}
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <Card className="overflow-hidden">
          {/* Media */}
          <div className="relative w-full aspect-video bg-muted/40 flex items-center justify-center">
            {hasVideo ? (
              <ExerciseVideoPlayer
                videoType={current.video_type as any}
                videoUrl={current.video_url!}
                startSeconds={current.video_start_seconds ?? undefined}
                endSeconds={current.video_end_seconds ?? undefined}
                className="w-full h-full"
              />
            ) : firstImage ? (
              <img src={firstImage} alt={current.name} className="max-h-full max-w-full object-contain" />
            ) : (
              <Dumbbell className="h-14 w-14 text-muted-foreground" />
            )}
            <div className="absolute top-2 left-2 h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow">
              {index + 1}
            </div>
          </div>

          <div className="p-4 space-y-3">
            <h2 className="text-xl font-bold leading-tight">{current.name}</h2>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {current.sets} × {current.reps}
              </span>
              {current.duration_seconds ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">
                  {current.duration_seconds}s
                </span>
              ) : null}
              {current.rest_seconds ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">
                  Descanso {current.rest_seconds}s
                </span>
              ) : null}
            </div>

            {current.notes && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">{current.notes}</p>
            )}

            <Button
              variant={isDone ? 'secondary' : 'default'}
              size="lg"
              className="w-full"
              onClick={() => {
                toggleDone(current.id);
                if (!isDone && !isLast) setTimeout(() => goNext(), 250);
              }}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {isDone ? 'Concluído ✓' : 'Marcar como concluído'}
            </Button>
          </div>
        </Card>

        {/* Mini list */}
        <Card className="p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 px-1">
            Sequência ({completed.size}/{total} feitos · {progress}%)
          </p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {items.map((it, i) => {
              const done = completed.has(it.id);
              const active = i === index;
              return (
                <button
                  key={it.id}
                  onClick={() => setIndex(i)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                    active ? 'bg-primary/10 border border-primary/40' : 'hover:bg-muted'
                  }`}
                >
                  <div
                    className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                      done ? 'bg-emerald-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${done ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                      {it.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{it.sets}×{it.reps}</div>
                  </div>
                  {it.video_url ? <Play className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                </button>
              );
            })}
          </div>
        </Card>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="outline" className="flex-1" onClick={goPrev} disabled={index === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <Button className="flex-1" onClick={goNext} disabled={isLast}>
            Próximo <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </nav>
    </div>
  );
}
