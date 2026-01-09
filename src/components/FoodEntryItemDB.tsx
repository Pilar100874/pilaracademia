import { useState } from 'react';
import { FoodEntryDB } from '@/types/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [editCarbs, setEditCarbs] = useState(entry.carbs.toString());
  const [editFat, setEditFat] = useState(entry.fat.toString());
  const [editFiber, setEditFiber] = useState((entry.fiber || 0).toString());
  const [editSodium, setEditSodium] = useState((entry.sodium || 0).toString());
  const [editSaturatedFat, setEditSaturatedFat] = useState((entry.saturated_fat || 0).toString());
  const [editTransFat, setEditTransFat] = useState((entry.trans_fat || 0).toString());
  const [editTime, setEditTime] = useState(
    new Date(entry.consumed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', ':')
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
      // Manter a data original, só atualizar a hora
      const originalDate = new Date(entry.consumed_at);
      const [hours, minutes] = editTime.split(':').map(Number);
      originalDate.setHours(hours, minutes, 0, 0);
      
      onUpdate(entry.id, {
        name: editName,
        calories: Number(editCalories),
        protein: Number(editProtein),
        carbs: Number(editCarbs),
        fat: Number(editFat),
        fiber: Number(editFiber),
        sodium: Number(editSodium),
        saturated_fat: Number(editSaturatedFat),
        trans_fat: Number(editTransFat),
        consumed_at: originalDate.toISOString(),
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(entry.name);
    setEditCalories(entry.calories.toString());
    setEditProtein(entry.protein.toString());
    setEditCarbs(entry.carbs.toString());
    setEditFat(entry.fat.toString());
    setEditFiber((entry.fiber || 0).toString());
    setEditSodium((entry.sodium || 0).toString());
    setEditSaturatedFat((entry.saturated_fat || 0).toString());
    setEditTransFat((entry.trans_fat || 0).toString());
    setEditTime(new Date(entry.consumed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    setIsEditing(false);
  };

  return (
    <>
      <div className="group flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card transition-all duration-200 hover:shadow-soft animate-scale-in overflow-hidden">
        {/* Image or Icon */}
        <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
          {entry.image_url ? (
            <img
              src={entry.image_url}
              alt={entry.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate text-sm">{entry.name}</h4>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {date} às {time}
          </p>

          {/* Nutrition badges */}
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
              {entry.calories} kcal
            </span>
            <span className="inline-flex items-center rounded-md bg-red-500/10 px-1.5 py-0.5 text-xs font-medium text-red-600">
              {entry.protein}g P
            </span>
            <span className="inline-flex items-center rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600">
              {entry.carbs}g C
            </span>
            <span className="inline-flex items-center rounded-md bg-blue-500/10 px-1.5 py-0.5 text-xs font-medium text-blue-600">
              {entry.fat}g G
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          {onUpdate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(entry.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Dialog para editar */}
      <Dialog open={isEditing} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Alimento
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do alimento"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Horário do consumo
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{date}</span>
                <Input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Informações Nutricionais</p>
                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                  {entry.quantity} {entry.unit}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Calorias (kcal)</label>
                  <Input
                    type="number"
                    value={editCalories}
                    onChange={(e) => setEditCalories(e.target.value)}
                    placeholder="kcal"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Proteína (g)</label>
                  <Input
                    type="number"
                    value={editProtein}
                    onChange={(e) => setEditProtein(e.target.value)}
                    placeholder="g"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Carboidratos (g)</label>
                  <Input
                    type="number"
                    value={editCarbs}
                    onChange={(e) => setEditCarbs(e.target.value)}
                    placeholder="g"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Gorduras (g)</label>
                  <Input
                    type="number"
                    value={editFat}
                    onChange={(e) => setEditFat(e.target.value)}
                    placeholder="g"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fibras (g)</label>
                  <Input
                    type="number"
                    value={editFiber}
                    onChange={(e) => setEditFiber(e.target.value)}
                    placeholder="g"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Sódio (mg)</label>
                  <Input
                    type="number"
                    value={editSodium}
                    onChange={(e) => setEditSodium(e.target.value)}
                    placeholder="mg"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">G. Saturada (g)</label>
                  <Input
                    type="number"
                    value={editSaturatedFat}
                    onChange={(e) => setEditSaturatedFat(e.target.value)}
                    placeholder="g"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">G. Trans (g)</label>
                  <Input
                    type="number"
                    value={editTransFat}
                    onChange={(e) => setEditTransFat(e.target.value)}
                    placeholder="g"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                <Check className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
