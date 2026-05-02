import { useRef, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, Trash2, Image as ImageIcon, GitCompare } from 'lucide-react';
import { useProgressPhotos, ProgressAngle, ProgressPhoto } from '@/hooks/useProgressPhotos';
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
  const [mode, setMode] = useState<'gallery' | 'compare'>('gallery');
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => photos.filter((p) => p.angle === angle).sort((a, b) => a.taken_at.localeCompare(b.taken_at)),
    [photos, angle],
  );

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

        <div className="flex gap-2">
          <Button
            variant={mode === 'gallery' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('gallery')}
            className="flex-1"
          >
            Galeria
          </Button>
          <Button
            variant={mode === 'compare' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('compare')}
            disabled={filtered.length < 2}
            className="flex-1 gap-1.5"
          >
            <GitCompare className="h-3.5 w-3.5" /> Antes/Depois
          </Button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.currentTarget.value = ''; }} />
        {mode === 'gallery' && (
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Adicionar foto ({angles.find((a) => a.id === angle)?.label})
          </Button>
        )}

        {mode === 'gallery' ? (
          filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma foto neste ângulo ainda.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {[...filtered].reverse().map((p) => (
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
          )
        ) : (
          <CompareView photos={filtered} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CompareView({ photos }: { photos: ProgressPhoto[] }) {
  const [beforeId, setBeforeId] = useState(photos[0].id);
  const [afterId, setAfterId] = useState(photos[photos.length - 1].id);
  const [pos, setPos] = useState(50);
  const before = photos.find((p) => p.id === beforeId)!;
  const after = photos.find((p) => p.id === afterId)!;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="space-y-1">
          <span className="text-muted-foreground">Antes</span>
          <select
            value={beforeId}
            onChange={(e) => setBeforeId(e.target.value)}
            className="w-full rounded-md border border-border bg-background p-1.5"
          >
            {photos.map((p) => (
              <option key={p.id} value={p.id}>{format(parseISO(p.taken_at), 'd MMM yy', { locale: ptBR })}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">Depois</span>
          <select
            value={afterId}
            onChange={(e) => setAfterId(e.target.value)}
            className="w-full rounded-md border border-border bg-background p-1.5"
          >
            {photos.map((p) => (
              <option key={p.id} value={p.id}>{format(parseISO(p.taken_at), 'd MMM yy', { locale: ptBR })}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden border border-border bg-muted select-none">
        <img src={after.image_url} alt="depois" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
          <img src={before.image_url} alt="antes" className="absolute inset-0 w-full h-full object-cover" style={{ width: `${100 / (pos / 100)}%`, maxWidth: 'none' }} />
        </div>
        <div className="absolute inset-y-0" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
          <div className="w-0.5 h-full bg-white shadow-md" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white shadow-md flex items-center justify-center text-[10px] font-semibold">
            ⇄
          </div>
        </div>
        <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
          {format(parseISO(before.taken_at), 'd MMM', { locale: ptBR })}
        </span>
        <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
          {format(parseISO(after.taken_at), 'd MMM', { locale: ptBR })}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
