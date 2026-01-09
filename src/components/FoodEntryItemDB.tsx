import { useState } from 'react';
import { FoodEntryDB } from '@/types/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Barcode, Edit3, Trash2, Pencil, X, Check, Clock } from 'lucide-react';

interface FoodEntryItemDBProps {
  entry: FoodEntryDB;
  onUpdate?: (id: string, updates: Partial<FoodEntryDB>) => void;
  onDelete?: (id: string) => void;
}

const sourceIcons = {
  photo: Camera,
  barcode: Barcode,
  manual: Edit3,
};

export function FoodEntryItemDB({ entry, onUpdate, onDelete }: FoodEntryItemDBProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(entry.name);
  const [editCalories, setEditCalories] = useState(entry.calories.toString());
  const [editProtein, setEditProtein] = useState(entry.protein.toString());
  const [editConsumedAt, setEditConsumedAt] = useState(
    new Date(entry.consumed_at).toISOString().slice(0, 16)
  );

  const Icon = sourceIcons[entry.source];
  const consumedDate = new Date(entry.consumed_at);
  const time = consumedDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const date = consumedDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(entry.id, {
        name: editName,
        calories: Number(editCalories),
        protein: Number(editProtein),
        consumed_at: new Date(editConsumedAt).toISOString(),
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(entry.name);
    setEditCalories(entry.calories.toString());
    setEditProtein(entry.protein.toString());
    setEditConsumedAt(new Date(entry.consumed_at).toISOString().slice(0, 16));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-card space-y-3 animate-scale-in">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Editando</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
            <Button variant="soft" size="icon" onClick={handleSave}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Nome do alimento"
        />

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Calorias</label>
            <Input
              type="number"
              value={editCalories}
              onChange={(e) => setEditCalories(e.target.value)}
              placeholder="kcal"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Proteína (g)</label>
            <Input
              type="number"
              value={editProtein}
              onChange={(e) => setEditProtein(e.target.value)}
              placeholder="g"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Data e hora do consumo
          </label>
          <Input
            type="datetime-local"
            value={editConsumedAt}
            onChange={(e) => setEditConsumedAt(e.target.value)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card transition-all duration-200 hover:shadow-soft animate-scale-in">
      {/* Image or Icon */}
      <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
        {entry.image_url ? (
          <img
            src={entry.image_url}
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
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {date} às {time}
            </p>
          </div>
        </div>

        {/* Nutrition badges */}
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {entry.calories} kcal
          </span>
          <span className="inline-flex items-center rounded-lg bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            {entry.protein}g prot
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onUpdate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(entry.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
