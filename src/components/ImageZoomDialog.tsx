import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getFreshMediaUrl } from '@/lib/mediaUrl';

interface ImageZoomDialogProps {
  images: string[];
  initialIndex?: number;
  alt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageZoomDialog({ 
  images, 
  initialIndex = 0, 
  alt = 'Imagem', 
  open, 
  onOpenChange 
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

  if (!images.length) return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    } else if (e.key === 'ArrowRight') {
      setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    }
  };

  const showNavigation = images.length > 1;
  const currentImage = getFreshMediaUrl(images[currentIndex], retryKey) ?? images[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[90vw] max-h-[90vh] p-2 bg-black/95 border-none [&>button]:text-white [&>button]:hover:bg-white/20"
        onKeyDown={handleKeyDown}
      >
        <div className="relative flex items-center justify-center min-h-[50vh]">
          {/* Previous button */}
          {showNavigation && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 z-10 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {/* Image */}
          <img
            src={currentImage}
            alt={`${alt} ${currentIndex + 1}`}
            onError={() => setRetryKey((key) => (key < 2 ? key + 1 : key))}
            className="max-w-full max-h-[75vh] object-contain rounded-lg"
          />

          {/* Next button */}
          {showNavigation && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 z-10 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={handleNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>

        {/* Dots indicator */}
        {showNavigation && (
          <div className="flex justify-center gap-1.5 mt-2">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex 
                    ? 'bg-white w-4' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
