import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CatalogAIImage } from './hooks/useCatalogAIImages';
import { Trash2, Loader2, ImageIcon, Check } from 'lucide-react';

interface AIImageGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: CatalogAIImage[];
  loading: boolean;
  onSelect: (imageUrl: string) => void;
  onDelete: (image: CatalogAIImage) => void;
}

export const AIImageGallery: React.FC<AIImageGalleryProps> = ({
  open,
  onOpenChange,
  images,
  loading,
  onSelect,
  onDelete
}) => {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleSelect = (image: CatalogAIImage) => {
    setSelectedId(image.id);
    onSelect(image.public_url);
    onOpenChange(false);
  };

  const handleDelete = async (e: React.MouseEvent, image: CatalogAIImage) => {
    e.stopPropagation();
    setDeletingId(image.id);
    await onDelete(image);
    setDeletingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Galeria de Imagens IA</DialogTitle>
          <DialogDescription>
            Selecione uma imagem gerada anteriormente para usar no catálogo
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Nenhuma imagem gerada ainda</p>
            <p className="text-xs mt-1">Gere imagens com IA para salvá-las aqui</p>
          </div>
        ) : (
          <ScrollArea className="h-[50vh]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary transition-all"
                  onClick={() => handleSelect(image)}
                >
                  <img
                    src={image.public_url}
                    alt={image.prompt || 'AI Generated'}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay with prompt */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs line-clamp-2">
                        {image.prompt || 'Sem descrição'}
                      </p>
                      <p className="text-white/60 text-[10px] mt-1">
                        {new Date(image.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Delete button */}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(e, image)}
                    disabled={deletingId === image.id}
                  >
                    {deletingId === image.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>

                  {/* Selected indicator */}
                  {selectedId === image.id && (
                    <div className="absolute top-2 left-2 h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
