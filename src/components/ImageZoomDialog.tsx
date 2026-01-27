import { Dialog, DialogContent } from '@/components/ui/dialog';

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
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-black/90 border-none [&>button]:text-white [&>button]:hover:bg-white/20">
        <div className="flex items-center justify-center">
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
