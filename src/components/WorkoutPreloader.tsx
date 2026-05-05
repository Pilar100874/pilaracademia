import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import type { WorkoutPlan } from '@/hooks/useWorkoutPlans';
import { getFreshMediaUrl } from '@/lib/mediaUrl';
import { getCachedVideoUrl } from '@/lib/videoCache';

interface Props {
  /** Plan to preload. When non-null, dialog opens and starts preloading. */
  plan: WorkoutPlan | null;
  /** Called once preload is finished (success or empty). */
  onReady: () => void;
  /** Called if user cancels preload. */
  onCancel: () => void;
}

/**
 * Pre-launch loader that downloads exercise images and uploaded videos
 * into the browser cache before the WorkoutViewerDialog opens, so the
 * workout doesn't stutter at the first exercise.
 */
export function WorkoutPreloader({ plan, onReady, onCancel }: Props) {
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState('');

  useEffect(() => {
    if (!plan) return;
    let cancelled = false;

    (async () => {
      type Asset = { kind: 'img' | 'video'; url: string; label: string };
      const assets: Asset[] = [];
      for (const ex of plan.exercises ?? []) {
        const imgs = ex.image_urls?.length ? ex.image_urls : ex.image_url ? [ex.image_url] : [];
        for (const url of imgs) {
          const fresh = getFreshMediaUrl(url) ?? url;
          if (fresh) assets.push({ kind: 'img', url: fresh, label: ex.name });
        }
        if (ex.video_url && ex.video_type === 'upload') {
          const fresh = getFreshMediaUrl(ex.video_url) ?? ex.video_url;
          if (fresh) assets.push({ kind: 'video', url: fresh, label: ex.name });
        }
      }

      setTotal(assets.length);
      setDone(0);

      if (assets.length === 0) {
        if (!cancelled) onReady();
        return;
      }

      let counter = 0;
      let cursor = 0;
      const CONCURRENCY = 3;
      const worker = async () => {
        while (cursor < assets.length && !cancelled) {
          const i = cursor++;
          const a = assets[i];
          if (!cancelled) setCurrent(a.label);
          try {
            if (a.kind === 'img') {
              await new Promise<void>((res) => {
                const img = new Image();
                img.onload = () => res();
                img.onerror = () => res();
                img.src = a.url;
              });
            } else {
              // Use the same cache layer the player uses, so the video is
              // ready instantly when the viewer mounts.
              await getCachedVideoUrl(a.url).catch(() => null);
            }
          } catch {
            /* ignore */
          }
          counter += 1;
          if (!cancelled) setDone(counter);
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, assets.length) }, worker)
      );
      if (!cancelled) onReady();
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id]);

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Dialog open={!!plan} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <div className="space-y-4 py-2">
          <div className="text-center space-y-1">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            <h2 className="text-lg font-serif">Preparando treino</h2>
            <p className="text-xs text-muted-foreground">
              Baixando vídeos e fotos para reprodução fluida
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate pr-2">
                {current || '...'}
              </span>
              <span className="tabular-nums font-medium shrink-0">
                {done}/{total} · {pct}%
              </span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
