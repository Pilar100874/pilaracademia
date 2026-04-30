import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getFreshMediaUrl } from '@/lib/mediaUrl';

interface ImageZoomDialogProps {
  images: string[];
  initialIndex?: number;
  alt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: title shown over the image (exercise name). */
  name?: string | null;
  /** Optional: navigate to previous EXERCISE (not previous image). */
  onPrev?: () => void;
  /** Optional: navigate to next EXERCISE (not next image). */
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  position?: { current: number; total: number };
}

/**
 * Full-screen image viewer styled like VideoPreviewDialog.
 * - Inner dots: cycle through images of the same exercise.
 * - Outer arrow buttons (when onPrev/onNext provided): navigate to other
 *   exercises in the surrounding list.
 * - Keyboard ArrowLeft/Right: navigate exercises when handlers are provided,
 *   otherwise cycle inner images.
 */
export function ImageZoomDialog({
  images,
  initialIndex = 0,
  alt = 'Imagem',
  open,
  onOpenChange,
  name,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  position,
}: ImageZoomDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setRetryKey(0);
    }
  }, [open, initialIndex]);

  useEffect(() => {
    setRetryKey(0);
  }, [currentIndex]);

  const showNav = !!(onPrev || onNext);
  const showDots = images.length > 1;

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (showNav && hasPrev && onPrev) onPrev();
        else if (showDots) setCurrentIndex((p) => (p > 0 ? p - 1 : images.length - 1));
      } else if (e.key === 'ArrowRight') {
        if (showNav && hasNext && onNext) onNext();
        else if (showDots) setCurrentIndex((p) => (p < images.length - 1 ? p + 1 : 0));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, showNav, showDots, hasPrev, hasNext, onPrev, onNext, images.length]);

  if (!images.length) return null;

  const currentImage = getFreshMediaUrl(images[currentIndex], retryKey) ?? images[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 gap-0 border-none bg-black block overflow-hidden [&>button]:!top-5 [&>button]:!right-5 [&>button]:z-50 [&>button]:h-12 [&>button]:w-12 [&>button]:p-0 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-black/50 [&>button]:backdrop-blur-2xl [&>button]:border [&>button]:border-white/25 [&>button]:text-white [&>button]:opacity-100 [&>button]:shadow-[0_4px_20px_rgba(0,0,0,0.6)] [&>button]:transition-all [&>button]:hover:bg-black/70 [&>button]:hover:scale-110 [&>button]:hover:border-white/40 [&>button]:active:scale-95 [&>button>svg]:h-6 [&>button>svg]:w-6 [&>button>svg]:stroke-[2.5]"
      >
        <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden z-0">
          <img
            src={currentImage}
            alt={`${alt} ${currentIndex + 1}`}
            onError={() => setRetryKey((key) => (key < 2 ? key + 1 : key))}
            className="max-w-full max-h-full object-contain"
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

        {/* Inner image dots (multiple images of same exercise) */}
        {showDots && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 z-40 flex gap-1.5 ${
              showNav ? 'bottom-24 sm:bottom-28' : 'bottom-6 pb-safe'
            }`}
          >
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-white w-5' : 'bg-white/40 hover:bg-white/60 w-2'
                }`}
                aria-label={`Imagem ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Outer exercise navigation arrows */}
        {showNav && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 pb-safe">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="Exercício anterior"
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-black/50 backdrop-blur-2xl border border-white/25 text-white shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all hover:bg-black/70 hover:scale-110 hover:border-white/40 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-7 w-7 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Próximo exercício"
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-black/50 backdrop-blur-2xl border border-white/25 text-white shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all hover:bg-black/70 hover:scale-110 hover:border-white/40 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-7 w-7 stroke-[2.5]" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
