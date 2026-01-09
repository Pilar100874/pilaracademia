import { useState, useEffect, useMemo } from 'react';
import { FoodEntryDB } from '@/types/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Barcode, Edit3, Trash2, Pencil, X, Check, Clock, Minus, Plus, Droplets } from 'lucide-react';

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

// Porções predefinidas
const PORTION_OPTIONS = [
  { label: '1/4', value: 0.25 },
  { label: '1/3', value: 0.33 },
  { label: '1/2', value: 0.5 },
  { label: '2/3', value: 0.67 },
  { label: '3/4', value: 0.75 },
  { label: '1', value: 1 },
  { label: '1.5', value: 1.5 },
  { label: '2', value: 2 },
];

export function FoodEntryItemDB({ entry, onUpdate, onDelete }: FoodEntryItemDBProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(entry.name);
  const [editTime, setEditTime] = useState(
    new Date(entry.consumed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', ':')
  );
  const [isLiquid, setIsLiquid] = useState(entry.is_liquid || false);
  const [liquidMl, setLiquidMl] = useState(entry.liquid_ml || 0);
  
  // Porção como multiplicador (1 = quantidade original)
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  
  // Valores originais (base para cálculos)
  const originalValues = useMemo(() => ({
    calories: entry.calories,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    fiber: entry.fiber || 0,
    sodium: entry.sodium || 0,
    saturated_fat: entry.saturated_fat || 0,
    trans_fat: entry.trans_fat || 0,
    quantity: entry.quantity,
    liquid_ml: entry.liquid_ml || 0,
  }), [entry]);

  // Valores calculados baseados na porção
  const calculatedValues = useMemo(() => ({
    calories: Math.round(originalValues.calories * portionMultiplier),
    protein: Number((originalValues.protein * portionMultiplier).toFixed(1)),
    carbs: Number((originalValues.carbs * portionMultiplier).toFixed(1)),
    fat: Number((originalValues.fat * portionMultiplier).toFixed(1)),
    fiber: Number((originalValues.fiber * portionMultiplier).toFixed(1)),
    sodium: Math.round(originalValues.sodium * portionMultiplier),
    saturated_fat: Number((originalValues.saturated_fat * portionMultiplier).toFixed(1)),
    trans_fat: Number((originalValues.trans_fat * portionMultiplier).toFixed(1)),
    quantity: Number((originalValues.quantity * portionMultiplier).toFixed(1)),
    liquid_ml: Math.round(originalValues.liquid_ml * portionMultiplier),
  }), [originalValues, portionMultiplier]);

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
        calories: calculatedValues.calories,
        protein: calculatedValues.protein,
        carbs: calculatedValues.carbs,
        fat: calculatedValues.fat,
        fiber: calculatedValues.fiber,
        sodium: calculatedValues.sodium,
        saturated_fat: calculatedValues.saturated_fat,
        trans_fat: calculatedValues.trans_fat,
        quantity: calculatedValues.quantity,
        consumed_at: originalDate.toISOString(),
        is_liquid: isLiquid,
        liquid_ml: isLiquid ? (liquidMl > 0 ? Math.round(liquidMl * portionMultiplier) : calculatedValues.quantity) : 0,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(entry.name);
    setEditTime(new Date(entry.consumed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    setPortionMultiplier(1);
    setIsLiquid(entry.is_liquid || false);
    setLiquidMl(entry.liquid_ml || 0);
    setIsEditing(false);
  };

  const handleOpenEdit = () => {
    setPortionMultiplier(1);
    setIsLiquid(entry.is_liquid || false);
    setLiquidMl(entry.liquid_ml || 0);
    setIsEditing(true);
  };

  const getPortionLabel = () => {
    const option = PORTION_OPTIONS.find(o => Math.abs(o.value - portionMultiplier) < 0.01);
    return option ? option.label : portionMultiplier.toFixed(2);
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
            {entry.is_liquid && (
              <span className="inline-flex items-center rounded-md bg-sky-500/10 px-1.5 py-0.5 text-xs font-medium text-sky-600">
                <Droplets className="h-3 w-3 mr-0.5" />
                {entry.liquid_ml}ml
              </span>
            )}
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
              onClick={handleOpenEdit}
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

            {/* Opção de líquido */}
            <div 
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                isLiquid 
                  ? 'border-sky-500 bg-sky-500/10' 
                  : 'border-muted hover:border-sky-500/50'
              }`}
              onClick={() => {
                setIsLiquid(!isLiquid);
                if (!isLiquid && liquidMl === 0) {
                  setLiquidMl(Number(entry.quantity) || 250);
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isLiquid ? 'border-sky-500 bg-sky-500' : 'border-muted-foreground'
                }`}>
                  {isLiquid && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Droplets className="h-4 w-4 text-sky-500" />
                    Este alimento é líquido
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Contabiliza no consumo diário de líquidos
                  </p>
                </div>
              </div>
              {isLiquid && (
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    type="number"
                    value={liquidMl > 0 ? liquidMl : calculatedValues.quantity}
                    onChange={(e) => setLiquidMl(Number(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    min={1}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">ml</span>
                </div>
              )}
            </div>

            {/* Seletor de porção */}
            <div className="border-t pt-4">
              <label className="text-sm font-medium mb-2 block">Quanto foi consumido?</label>
              
              {/* Porção atual e quantidade */}
              <div className="flex items-center justify-between mb-3 p-3 rounded-lg bg-accent/30">
                <div>
                  <span className="text-2xl font-bold">{getPortionLabel()}</span>
                  <span className="text-sm text-muted-foreground ml-2">porção</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold">{calculatedValues.quantity}</span>
                  <span className="text-sm text-muted-foreground ml-1">{entry.unit}</span>
                </div>
              </div>

              {/* Botões de porção rápida */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {PORTION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPortionMultiplier(option.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      Math.abs(portionMultiplier - option.value) < 0.01
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Ajuste fino */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPortionMultiplier(Math.max(0.1, portionMultiplier - 0.1))}
                  disabled={portionMultiplier <= 0.1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={portionMultiplier}
                    onChange={(e) => setPortionMultiplier(Math.max(0.1, Number(e.target.value)))}
                    className="text-center"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPortionMultiplier(portionMultiplier + 0.1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Valores nutricionais calculados */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Valores Nutricionais</p>
                {portionMultiplier !== 1 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    Recalculado
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Calorias</span>
                  <span className="font-medium">{calculatedValues.calories} kcal</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Proteína</span>
                  <span className="font-medium">{calculatedValues.protein}g</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Carboidratos</span>
                  <span className="font-medium">{calculatedValues.carbs}g</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Gorduras</span>
                  <span className="font-medium">{calculatedValues.fat}g</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Fibras</span>
                  <span className="font-medium">{calculatedValues.fiber}g</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Sódio</span>
                  <span className="font-medium">{calculatedValues.sodium}mg</span>
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
