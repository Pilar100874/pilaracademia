import { FoodEntry } from "@/types/nutrition";
import { Button } from "@/components/ui/button";
import { Camera, Barcode, Edit3, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FoodEntryItemProps {
  entry: FoodEntry;
  onDelete?: (id: string) => void;
}

const sourceIcons = {
  photo: Camera,
  barcode: Barcode,
  manual: Edit3,
};

const sourceLabels = {
  photo: 'Foto',
  barcode: 'Código',
  manual: 'Manual',
};

export function FoodEntryItem({ entry, onDelete }: FoodEntryItemProps) {
  const Icon = sourceIcons[entry.source];
  const time = new Date(entry.timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="group flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card transition-all duration-200 hover:shadow-soft animate-scale-in">
      {/* Image or Icon */}
      <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
        {entry.imageUrl ? (
          <img
            src={entry.imageUrl}
            alt={entry.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Icon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-medium truncate">{entry.name}</h4>
            <p className="text-sm text-muted-foreground">
              {entry.quantity} {entry.unit} • {time}
            </p>
          </div>
        </div>

        {/* Nutrition badges */}
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {entry.nutrition.calories} kcal
          </span>
          <span className="inline-flex items-center rounded-lg bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            {entry.nutrition.protein}g prot
          </span>
        </div>
      </div>

      {/* Delete button */}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(entry.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
