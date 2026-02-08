import { FoodEntryDB } from '@/types/profile';
import { Flame, Droplets, Clock, Pencil, Trash2, UtensilsCrossed, Camera, Barcode, Edit3, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { ImageZoomDialog } from './ImageZoomDialog';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

interface RecentFoodListProps {
  entries: FoodEntryDB[];
  onUpdate?: (id: string, updates: Partial<FoodEntryDB>) => void;
  onDelete?: (id: string) => void;
  onEditTyped?: (entry: FoodEntryDB) => void;
  onEditVoice?: (entry: FoodEntryDB) => void;
  onEditPhotoBarcode?: (entry: FoodEntryDB) => void;
}

const sourceIcons: Record<string, any> = {
  photo: Camera,
  barcode: Barcode,
  manual: Edit3,
  voice: Mic,
};

export function RecentFoodList({ entries, onUpdate, onDelete, onEditTyped, onEditVoice, onEditPhotoBarcode }: RecentFoodListProps) {
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<FoodEntryDB | null>(null);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
          <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Nenhum registro ainda</p>
        <p className="text-xs text-muted-foreground mt-1">Toque no + para adicionar</p>
      </div>
    );
  }

  const handleEdit = (entry: FoodEntryDB) => {
    if (entry.source === 'voice' && onEditVoice) {
      onEditVoice(entry);
    } else if (entry.source === 'manual' && onEditTyped) {
      onEditTyped(entry);
    } else if ((entry.source === 'photo' || entry.source === 'barcode') && onEditPhotoBarcode) {
      onEditPhotoBarcode(entry);
    }
  };

  const canEdit = (entry: FoodEntryDB) => {
    if (entry.source === 'voice') return !!onEditVoice;
    if (entry.source === 'manual') return !!onEditTyped;
    if (entry.source === 'photo' || entry.source === 'barcode') return !!onEditPhotoBarcode;
    return false;
  };

  return (
    <>
      <div className="space-y-2">
        {entries.slice(0, 10).map((entry) => {
          const Icon = sourceIcons[entry.source] || UtensilsCrossed;
          const isLiquid = entry.is_liquid;
          const time = new Date(entry.consumed_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div 
              key={entry.id} 
              className="entry-card animate-fade-in"
            >
              {/* Thumbnail */}
              <button
                onClick={() => entry.image_url && setZoomImage(entry.image_url)}
                className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted"
              >
                {entry.image_url ? (
                  <img
                    src={entry.image_url}
                    alt={entry.name}
                    className="h-full w-full object-cover"
                  />
                ) : isLiquid ? (
                  <Droplets className="h-6 w-6 text-sky-500" />
                ) : (
                  <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
                )}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">{entry.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center text-xs font-medium text-primary">
                    <Flame className="h-3 w-3 mr-0.5" />
                    {entry.calories} cal
                  </span>
                  {isLiquid && (
                    <span className="inline-flex items-center text-xs text-sky-500">
                      <Droplets className="h-3 w-3 mr-0.5" />
                      {entry.liquid_ml}ml
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  <span className="badge-protein px-1.5 py-0.5 rounded font-medium">
                    {entry.protein}g P
                  </span>
                  <span className="badge-carbs px-1.5 py-0.5 rounded font-medium">
                    {entry.carbs}g C
                  </span>
                  <span className="badge-fat px-1.5 py-0.5 rounded font-medium">
                    {entry.fat}g G
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {time}
                </span>
                <div className="flex gap-0.5">
                  {canEdit(entry) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                      onClick={() => handleEdit(entry)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeletingEntry(entry)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ImageZoomDialog 
        images={zoomImage ? [zoomImage] : []} 
        open={!!zoomImage} 
        onOpenChange={(open) => !open && setZoomImage(null)} 
      />

      <ConfirmDeleteDialog
        open={!!deletingEntry}
        onOpenChange={(open) => !open && setDeletingEntry(null)}
        itemName={deletingEntry?.name || ''}
        onConfirm={() => {
          if (deletingEntry && onDelete) {
            onDelete(deletingEntry.id);
            setDeletingEntry(null);
          }
        }}
      />
    </>
  );
}
