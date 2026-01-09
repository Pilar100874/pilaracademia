import { useState, useEffect, useMemo } from 'react';
import { FoodEntryDB } from '@/types/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Barcode, Edit3, Trash2, Pencil, Check, Clock, Minus, Plus, Droplets, Apple, GlassWater, Calculator, Package } from 'lucide-react';
import { ImageZoomDialog } from '@/components/ImageZoomDialog';
import { WATER_IMAGE_URL } from '@/components/DefaultLiquidImage';

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

// Fraction options for consumption
const FRACTION_OPTIONS = [
  { label: '1/4', value: 0.25 },
  { label: '1/3', value: 0.33 },
  { label: '1/2', value: 0.5 },
  { label: '2/3', value: 0.67 },
  { label: '3/4', value: 0.75 },
  { label: 'Tudo', value: 1 },
];

// Quick ml options for liquids
const QUICK_ML_OPTIONS = [
  { label: '250ml', value: 250 },
  { label: '300ml', value: 300 },
  { label: '350ml', value: 350 },
  { label: '500ml', value: 500 },
];

export function FoodEntryItemDB({ entry, onUpdate, onDelete }: FoodEntryItemDBProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(entry.name);
  const [editTime, setEditTime] = useState(
    new Date(entry.consumed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', ':')
  );
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  
  // Consumption mode and values
  const [consumeMode, setConsumeMode] = useState<'fraction' | 'units' | 'weight' | 'ml'>('fraction');
  const [selectedFraction, setSelectedFraction] = useState<number | null>(1); // Default to "Tudo"
  const [customValue, setCustomValue] = useState('');
  const [unitsCount, setUnitsCount] = useState(1);
  
  // Get image URL for entry
  const getEntryImageUrl = () => {
    if (entry.image_url) return entry.image_url;
    if (entry.is_liquid) return WATER_IMAGE_URL;
    return null;
  };
  
  // Determine if entry is liquid
  const isLiquid = entry.is_liquid || false;
  
  // Original values (base for calculations)
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
    unit: entry.unit,
  }), [entry]);

  // Calculate portion multiplier based on mode
  const portionMultiplier = useMemo(() => {
    if (consumeMode === 'fraction' && selectedFraction !== null) {
      return selectedFraction;
    }
    if (consumeMode === 'weight' && customValue) {
      const grams = parseFloat(customValue) || 0;
      return grams / originalValues.quantity;
    }
    if (consumeMode === 'ml' && customValue) {
      const ml = parseFloat(customValue) || 0;
      return ml / (originalValues.liquid_ml || originalValues.quantity);
    }
    if (consumeMode === 'units') {
      // Assuming 1 unit = original quantity
      return unitsCount;
    }
    return 1;
  }, [consumeMode, selectedFraction, customValue, unitsCount, originalValues]);

  // Calculated values based on portion
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
    liquid_ml: Math.round((originalValues.liquid_ml || originalValues.quantity) * portionMultiplier),
  }), [originalValues, portionMultiplier]);

  // Display text for consumption
  const displayText = useMemo(() => {
    if (consumeMode === 'fraction' && selectedFraction !== null) {
      const label = FRACTION_OPTIONS.find(f => f.value === selectedFraction)?.label || '';
      if (isLiquid) {
        return `${label} = ${calculatedValues.liquid_ml}ml`;
      }
      return `${label} = ${calculatedValues.quantity}${originalValues.unit}`;
    }
    if (consumeMode === 'weight') {
      return `${customValue || 0}g`;
    }
    if (consumeMode === 'ml') {
      return `${customValue || 0}ml`;
    }
    if (consumeMode === 'units') {
      return `${unitsCount} un.`;
    }
    return '';
  }, [consumeMode, selectedFraction, customValue, unitsCount, calculatedValues, originalValues, isLiquid]);

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
    if (onUpdate && portionMultiplier > 0) {
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
        liquid_ml: isLiquid ? calculatedValues.liquid_ml : 0,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(entry.name);
    setEditTime(new Date(entry.consumed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    resetConsumeState();
    setIsEditing(false);
  };

  const resetConsumeState = () => {
    setSelectedFraction(1);
    setConsumeMode('fraction');
    setCustomValue('');
    setUnitsCount(1);
  };

  const handleOpenEdit = () => {
    resetConsumeState();
    setIsEditing(true);
  };

  const handleFractionSelect = (value: number) => {
    setConsumeMode('fraction');
    setSelectedFraction(value);
    setCustomValue('');
  };

  const handleQuickMlSelect = (value: number) => {
    setConsumeMode('ml');
    setSelectedFraction(null);
    setCustomValue(value.toString());
  };

  const canSubmit = portionMultiplier > 0;

  return (
    <>
      <div className="group flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card transition-all duration-200 hover:shadow-soft animate-scale-in overflow-hidden">
        {/* Image or Icon - clickable for zoom */}
        <button 
          onClick={() => {
            const imageUrl = getEntryImageUrl();
            if (imageUrl) setZoomImage(imageUrl);
          }}
          className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
        >
          {getEntryImageUrl() ? (
            <img
              src={getEntryImageUrl()!}
              alt={entry.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

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
              {isLiquid ? (
                <Droplets className="h-5 w-5 text-sky-500" />
              ) : (
                <Pencil className="h-5 w-5 text-primary" />
              )}
              Editar {isLiquid ? 'Líquido' : 'Alimento'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {/* Entry info card */}
            <div className={`flex items-center gap-3 p-3 rounded-xl ${isLiquid ? 'bg-sky-500/10' : 'bg-accent/30'}`}>
              {getEntryImageUrl() ? (
                <img
                  src={getEntryImageUrl()!}
                  alt={entry.name}
                  className="h-14 w-14 rounded-xl object-cover bg-muted"
                />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
                  {isLiquid ? (
                    <Droplets className="h-7 w-7 text-sky-500" />
                  ) : (
                    <Apple className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="font-medium border-none bg-transparent p-0 h-auto text-sm focus-visible:ring-0"
                  placeholder="Nome do alimento"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Registro: <strong>{originalValues.quantity}{originalValues.unit}</strong>
                  {isLiquid && originalValues.liquid_ml > 0 && (
                    <span className="ml-1">({originalValues.liquid_ml}ml)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{date}</span>
              <Input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="flex-1 h-8"
              />
            </div>

            {/* LIQUID consumption options */}
            {isLiquid ? (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <GlassWater className="h-4 w-4 text-sky-500" />
                  Quanto você bebeu?
                </p>

                {/* Fraction options */}
                <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/20">
                  <p className="text-xs font-medium text-sky-600 mb-2">
                    Fração do registro ({originalValues.liquid_ml || originalValues.quantity}ml)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {FRACTION_OPTIONS.map((fraction) => {
                      const ml = Math.round((originalValues.liquid_ml || originalValues.quantity) * fraction.value);
                      return (
                        <button
                          key={fraction.value}
                          onClick={() => handleFractionSelect(fraction.value)}
                          className={`p-2 rounded-lg text-center transition-all border-2 ${
                            consumeMode === 'fraction' && selectedFraction === fraction.value
                              ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                              : 'border-muted bg-secondary/50 hover:border-sky-500/50'
                          }`}
                        >
                          <span className="text-sm font-medium">{fraction.label}</span>
                          <span className="block text-xs text-muted-foreground">{ml}ml</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-center text-xs text-muted-foreground">ou</div>

                {/* Quick ML options */}
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_ML_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleQuickMlSelect(option.value)}
                      className={`p-2 rounded-lg text-xs font-medium transition-all border-2 ${
                        consumeMode === 'ml' && parseFloat(customValue) === option.value
                          ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                          : 'border-muted bg-secondary/50 hover:border-sky-500/50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Custom ml input */}
                <div 
                  className={`p-3 rounded-lg border-2 transition-all ${
                    consumeMode === 'ml' && !QUICK_ML_OPTIONS.some(o => o.value === parseFloat(customValue))
                      ? 'border-sky-500 bg-sky-500/10' 
                      : 'border-muted'
                  }`}
                  onClick={() => {
                    setConsumeMode('ml');
                    setSelectedFraction(null);
                  }}
                >
                  <p className="text-sm font-medium mb-2">Digitar quantidade (ml)</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={consumeMode === 'ml' ? customValue : ''}
                      onChange={(e) => {
                        setCustomValue(e.target.value);
                        setConsumeMode('ml');
                        setSelectedFraction(null);
                      }}
                      placeholder="Ex: 200"
                      min="0"
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">ml</span>
                  </div>
                </div>
              </div>
            ) : (
              /* SOLID consumption options */
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Apple className="h-4 w-4 text-primary" />
                  Quanto você consumiu?
                </p>

                {/* Fraction options */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs font-medium text-primary mb-2">
                    Fração do registro ({originalValues.quantity}{originalValues.unit})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {FRACTION_OPTIONS.map((fraction) => {
                      const qty = Number((originalValues.quantity * fraction.value).toFixed(1));
                      return (
                        <button
                          key={fraction.value}
                          onClick={() => handleFractionSelect(fraction.value)}
                          className={`p-2 rounded-lg text-center transition-all border-2 ${
                            consumeMode === 'fraction' && selectedFraction === fraction.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-muted bg-secondary/50 hover:border-primary/50'
                          }`}
                        >
                          <span className="text-sm font-medium">{fraction.label}</span>
                          <span className="block text-xs text-muted-foreground">{qty}{originalValues.unit}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-center text-xs text-muted-foreground">ou</div>

                {/* Units option */}
                <div 
                  className={`p-3 rounded-lg border-2 transition-all ${
                    consumeMode === 'units' ? 'border-primary bg-primary/10' : 'border-muted'
                  }`}
                  onClick={() => setConsumeMode('units')}
                >
                  <p className="text-sm font-medium mb-1">Por unidades/porções</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Cada unidade = {originalValues.quantity}{originalValues.unit}
                  </p>
                  {consumeMode === 'units' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (unitsCount > 1) setUnitsCount(unitsCount - 1);
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={unitsCount}
                        onChange={(e) => setUnitsCount(Math.max(1, parseInt(e.target.value) || 1))}
                        placeholder="Ex: 3"
                        min="1"
                        step="1"
                        className="flex-1 text-center"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUnitsCount(unitsCount + 1);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">un.</span>
                    </div>
                  )}
                </div>

                {/* Weight option */}
                <div 
                  className={`p-3 rounded-lg border-2 transition-all ${
                    consumeMode === 'weight' ? 'border-primary bg-primary/10' : 'border-muted'
                  }`}
                  onClick={() => setConsumeMode('weight')}
                >
                  <p className="text-sm font-medium mb-1">Por gramas</p>
                  <p className="text-xs text-muted-foreground mb-2">Informar peso consumido</p>
                  {consumeMode === 'weight' && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        placeholder="Ex: 50"
                        min="0"
                        className="flex-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm text-muted-foreground">g</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Nutrition preview */}
            {canSubmit && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <p className="text-xs font-medium flex items-center gap-1 text-primary">
                  <Calculator className="h-3 w-3" />
                  Valores Calculados
                  <span className="text-muted-foreground ml-1">({displayText})</span>
                </p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-primary">{calculatedValues.calories}</p>
                    <p className="text-xs text-muted-foreground">kcal</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-500">{calculatedValues.protein}g</p>
                    <p className="text-xs text-muted-foreground">prot</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-500">{calculatedValues.carbs}g</p>
                    <p className="text-xs text-muted-foreground">carb</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-rose-500">{calculatedValues.fat}g</p>
                    <p className="text-xs text-muted-foreground">gord</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={!canSubmit}>
                <Check className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Zoom Dialog */}
      <ImageZoomDialog 
        imageUrl={zoomImage} 
        alt={entry.name}
        open={!!zoomImage} 
        onOpenChange={(open) => !open && setZoomImage(null)} 
      />
    </>
  );
}
