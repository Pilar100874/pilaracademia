import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ExerciseVideoPlayer } from '@/components/ExerciseVideoPlayer';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';

interface VideoPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name?: string | null;
  videoType: string | null | undefined;
  videoUrl: string | null | undefined;
  startSeconds?: number | null;
  endSeconds?: number | null;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  position?: { current: number; total: number };
}

/**
 * Full-screen video preview dialog with floating title and large close button.
 * Optionally supports prev/next navigation between videos.
 */
export function VideoPreviewDialog({
  open,
  onOpenChange,
  name,
  videoType,
  videoUrl,
  startSeconds,
  endSeconds,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  position,
}: VideoPreviewDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
      else if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, hasPrev, hasNext, onPrev, onNext]);

  if (!videoUrl || !videoType) return null;

  const showNav = !!(onPrev || onNext);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 border-none bg-black [&>button]:top-5 [&>button]:right-5 [&>button]:z-50 [&>button]:h-12 [&>button]:w-12 [&>button]:p-0 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-black/50 [&>button]:backdrop-blur-2xl [&>button]:border [&>button]:border-white/25 [&>button]:text-white [&>button]:opacity-100 [&>button]:shadow-[0_4px_20px_rgba(0,0,0,0.6)] [&>button]:transition-all [&>button]:hover:bg-black/70 [&>button]:hover:scale-110 [&>button]:hover:border-white/40 [&>button]:active:scale-95 [&>button>svg]:h-6 [&>button>svg]:w-6 [&>button>svg]:stroke-[2.5]"
      >
        <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
          <ExerciseVideoPlayer
            key={videoUrl}
            videoType={videoType}
            videoUrl={videoUrl}
            startSeconds={startSeconds}
            endSeconds={endSeconds}
            autoPlay
            loop
            className="w-full h-full"
          />
        </div>
        {name && (
          <div className="absolute top-5 left-5 right-20 z-40 pointer-events-none">
            <div className="inline-block bg-black/40 backdrop-blur-xl rounded-2xl px-4 py-2 border border-white/10 shadow-xl max-w-full">
              <h2 className="text-white font-extrabold text-base sm:text-lg leading-tight tracking-tight truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {name}
              </h2>
              {position && position.total > 1 && (
                <p className="text-white/70 text-xs font-medium mt-0.5">
                  {position.current} / {position.total}
                </p>
              )}
            </div>
          </div>
        )}

        {showNav && (
          <>
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="Vídeo anterior"
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-40 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-black/50 backdrop-blur-2xl border border-white/25 text-white shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all hover:bg-black/70 hover:scale-110 hover:border-white/40 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-7 w-7 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Próximo vídeo"
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-40 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-black/50 backdrop-blur-2xl border border-white/25 text-white shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all hover:bg-black/70 hover:scale-110 hover:border-white/40 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-7 w-7 stroke-[2.5]" />
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
