import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageZoomDialogProps {
  imageUrl: string | null;
  alt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageZoomDialog({ imageUrl, alt = 'Imagem', open, onOpenChange }: ImageZoomDialogProps) {
  if (!imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/90 border-none">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-50 text-white hover:bg-white/20"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="flex items-center justify-center p-4">
          <img
            src={imageUrl}
            alt={alt}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
