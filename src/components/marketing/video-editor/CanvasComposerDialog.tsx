// @ts-nocheck
// Stub: Canvas composer completo depende de editor pesado não portado.
// Mantido como placeholder para preservar imports do VideoTimelineEditor.
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CanvasComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport?: (dataUrl: string) => void;
  initialImageUrl?: string;
}

export function CanvasComposerDialog({ open, onOpenChange }: CanvasComposerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Composer de Canvas</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Editor de canvas avançado não disponível neste app. Use o AI Creative Studio ou o Editor de Vídeo.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default CanvasComposerDialog;
