import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, Trash2, Image as ImageIcon } from 'lucide-react';
import { useProgressPhotos, ProgressAngle } from '@/hooks/useProgressPhotos';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const angles: { id: ProgressAngle; label: string }[] = [
  { id: 'front', label: 'Frente' },
  { id: 'side', label: 'Lado' },
  { id: 'back', label: 'Costas' },
];

export function ProgressPhotosDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { photos, upload, remove } = useProgressPhotos();
  const [angle, setAngle] = useState<ProgressAngle>('front');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = photos.filter((p) => p.angle === angle);

  const onPick = async (file: File) => {
    setUploading(true);
    try {
      await upload(file, angle);
      toast.success('Foto adicionada');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Fotos de progresso</DialogTitle>
          <DialogDescription>Compare sua evolução visual ao longo do tempo.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b border-border pb-2">
          {angles.map((a) => (
            <button
              key={a.id}
              onClick={() => setAngle(a.id)}
              className={`flex-1 text-xs py-1.5 rounded-md ${angle === a.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.currentTarget.value = ''; }} />
        <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full gap-2">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          Adicionar foto ({angles.find((a) => a.id === angle)?.label})
        </Button>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma foto neste ângulo ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((p) => (
              <div key={p.id} className="relative rounded-md overflow-hidden border border-border">
                <img src={p.image_url} alt="progresso" className="w-full aspect-[3/4] object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-[11px] flex justify-between items-end">
                  <span>{format(parseISO(p.taken_at), 'd MMM yy', { locale: ptBR })}</span>
                  <button onClick={() => remove(p.id).catch(() => toast.error('Erro ao remover'))} className="p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
