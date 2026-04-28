import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Save, Trash2, CheckSquare, Square, Loader2, Image as ImageIcon, ZoomIn, X } from 'lucide-react';

export interface BatchResultItem {
  imageUrl: string;
  productName: string;
  productId?: string;
}

interface BatchReviewDialogProps {
  open: boolean;
  onClose: () => void;
  results: BatchResultItem[];
}

const BatchReviewDialog: React.FC<BatchReviewDialogProps> = ({ open, onClose, results }) => {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(results.map((_, i) => i)));
  const [saving, setSaving] = useState(false);
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);

  const toggleItem = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(results.map((_, i) => i)));
  const deselectAll = () => setSelected(new Set());

  const handleSaveSelected = async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) { toast.error('Estabelecimento não encontrado.'); return; }

    const toSave = results.filter((_, i) => selected.has(i));
    if (toSave.length === 0) { toast.warning('Selecione pelo menos uma imagem.'); return; }

    setSaving(true);
    let savedCount = 0;

    for (const item of toSave) {
      try {
        let blob: Blob;
        if (item.imageUrl.startsWith('data:')) {
          const [header, b64] = item.imageUrl.split(',');
          const mime = header.match(/data:(.*?);/)?.[1] || 'image/png';
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          blob = new Blob([bytes], { type: mime });
        } else {
          const response = await fetch(item.imageUrl);
          if (!response.ok) continue;
          blob = await response.blob();
        }

        const ext = blob.type?.includes('png') ? 'png' : 'jpg';
        const fileName = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const storagePath = `${estabId}/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('marketing-images')
          .upload(storagePath, blob, { contentType: blob.type || 'image/png' });
        if (uploadErr) { console.error('Upload error:', uploadErr); continue; }

        const { data: { publicUrl } } = supabase.storage
          .from('marketing-images')
          .getPublicUrl(storagePath);

        await supabase.from('media_gallery').insert({
          estabelecimento_id: estabId,
          tipo: 'image',
          storage_path: storagePath,
          public_url: publicUrl,
          nome: `AI Studio - ${item.productName}`,
          descricao: 'Gerado pelo AI Studio (lote)',
          tamanho_bytes: blob.size,
          mime_type: blob.type || 'image/png',
          origem: 'ai_studio',
        });
        savedCount++;
      } catch (err) {
        console.error('Save error for', item.productName, err);
      }
    }

    setSaving(false);
    toast.success(`${savedCount} imagem(ns) salva(s) na galeria!`);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v && zoomedIndex === null) onClose(); }}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          onPointerDownOutside={(e) => { if (zoomedIndex !== null) e.preventDefault(); }}
          onInteractOutside={(e) => { if (zoomedIndex !== null) e.preventDefault(); }}
          onEscapeKeyDown={(e) => {
            if (zoomedIndex !== null) {
              e.preventDefault();
              setZoomedIndex(null);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Revisão do Lote — {results.length} imagens geradas
            </DialogTitle>
            <DialogDescription>
              Selecione as imagens que deseja salvar na galeria. Clique na lupa para ampliar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 py-2 border-b">
            <Button variant="outline" size="sm" onClick={selectAll}>
              <CheckSquare className="h-4 w-4 mr-1" /> Selecionar Todas
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              <Square className="h-4 w-4 mr-1" /> Limpar Seleção
            </Button>
            <span className="ml-auto text-sm text-muted-foreground">
              {selected.size} de {results.length} selecionadas
            </span>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {results.map((item, idx) => {
                const isSelected = selected.has(idx);
                return (
                  <div
                    key={idx}
                    className={`relative group cursor-pointer rounded-xl border-2 overflow-hidden transition-all ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border opacity-50 hover:opacity-80'
                    }`}
                  >
                    <div className="aspect-square bg-muted" onClick={() => toggleItem(idx)}>
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleItem(idx)}
                        className="h-5 w-5 bg-background/80 backdrop-blur-sm"
                      />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setZoomedIndex(idx); }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                    >
                      <ZoomIn className="h-4 w-4 text-foreground" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-xs text-white font-medium truncate">{item.productName}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              <Trash2 className="h-4 w-4 mr-1" /> Descartar Todas
            </Button>
            <Button onClick={handleSaveSelected} disabled={saving || selected.size === 0}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar {selected.size} na Galeria
            </Button>
           </DialogFooter>

          {/* Zoom overlay - rendered INSIDE DialogContent to stay within Radix's DOM tree */}
          {zoomedIndex !== null && results[zoomedIndex] && (
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 cursor-zoom-out"
              style={{ zIndex: 99999 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setZoomedIndex(null);
              }}
            >
              <button
                onClick={() => setZoomedIndex(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              >
                <X className="h-6 w-6 text-white" />
              </button>
              <div className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3">
                <img
                  src={results[zoomedIndex].imageUrl}
                  alt={results[zoomedIndex].productName}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                />
                <p className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                  {results[zoomedIndex].productName}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-white border-white/30 hover:bg-white/10"
                    disabled={zoomedIndex <= 0}
                    onClick={(e) => { e.stopPropagation(); setZoomedIndex(zoomedIndex - 1); }}
                  >
                    ← Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-white border-white/30 hover:bg-white/10"
                    disabled={zoomedIndex >= results.length - 1}
                    onClick={(e) => { e.stopPropagation(); setZoomedIndex(zoomedIndex + 1); }}
                  >
                    Próxima →
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BatchReviewDialog;
