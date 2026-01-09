import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Droplets, Apple, Calculator, Package, UtensilsCrossed, Check } from 'lucide-react';
import { CustomProduct } from '@/hooks/useCustomProducts';
import { useFoodEntries } from '@/hooks/useFoodEntries';
import { toast } from 'sonner';

interface ProductConsumptionDialogProps {
  product: CustomProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ConsumptionMode = 'all' | 'partial_ml' | 'partial_units' | 'partial_weight';

export function ProductConsumptionDialog({ 
  product, 
  open, 
  onOpenChange,
  onSuccess 
}: ProductConsumptionDialogProps) {
  const { addEntry } = useFoodEntries();
  const [mode, setMode] = useState<ConsumptionMode>('all');
  const [partialValue, setPartialValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when product changes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMode('all');
      setPartialValue('');
    }
    onOpenChange(newOpen);
  };

  // Calculate package info
  const packageInfo = useMemo(() => {
    if (!product) return null;
    
    const isLiquid = product.is_liquid;
    const totalVolume = product.package_volume_ml;
    const totalWeight = product.package_total_weight;
    const totalUnits = product.package_total_units;
    const refQty = product.reference_quantity;
    const refUnit = product.reference_unit;
    
    // Calculate weight per unit if both are available
    const weightPerUnit = totalWeight && totalUnits ? totalWeight / totalUnits : null;
    
    return {
      isLiquid,
      totalVolume,
      totalWeight,
      totalUnits,
      weightPerUnit,
      refQty,
      refUnit,
      hasPackageInfo: isLiquid ? !!totalVolume : (!!totalWeight || !!totalUnits),
    };
  }, [product]);

  // Calculate consumed quantity based on mode
  const consumedQuantity = useMemo(() => {
    if (!product || !packageInfo) return { grams: 0, ml: 0, display: '' };
    
    const partial = parseFloat(partialValue) || 0;
    
    if (mode === 'all') {
      if (packageInfo.isLiquid && packageInfo.totalVolume) {
        return { 
          grams: 0, 
          ml: packageInfo.totalVolume, 
          display: `${packageInfo.totalVolume}ml (pacote inteiro)` 
        };
      } else if (packageInfo.totalWeight) {
        return { 
          grams: packageInfo.totalWeight, 
          ml: 0, 
          display: `${packageInfo.totalWeight}g (pacote inteiro)` 
        };
      } else {
        // No package info, use reference quantity
        return { 
          grams: packageInfo.isLiquid ? 0 : packageInfo.refQty, 
          ml: packageInfo.isLiquid ? packageInfo.refQty : 0, 
          display: `${packageInfo.refQty}${packageInfo.refUnit}` 
        };
      }
    }
    
    if (mode === 'partial_ml') {
      return { grams: 0, ml: partial, display: `${partial}ml` };
    }
    
    if (mode === 'partial_weight') {
      return { grams: partial, ml: 0, display: `${partial}g` };
    }
    
    if (mode === 'partial_units' && packageInfo.weightPerUnit) {
      const grams = partial * packageInfo.weightPerUnit;
      return { 
        grams, 
        ml: 0, 
        display: `${partial} unidade(s) = ${grams.toFixed(0)}g` 
      };
    }
    
    return { grams: 0, ml: 0, display: '' };
  }, [mode, partialValue, product, packageInfo]);

  // Calculate nutrition based on consumed quantity
  const calculatedNutrition = useMemo(() => {
    if (!product) return null;
    
    const refQty = product.reference_quantity || 100;
    let consumedQty = packageInfo?.isLiquid ? consumedQuantity.ml : consumedQuantity.grams;
    
    // If no quantity calculated, use reference quantity
    if (consumedQty === 0 && mode === 'all') {
      consumedQty = refQty;
    }
    
    const factor = consumedQty / refQty;
    
    return {
      calories: Math.round(product.calories * factor),
      protein: Number((product.protein * factor).toFixed(1)),
      carbs: Number((product.carbs * factor).toFixed(1)),
      fat: Number((product.fat * factor).toFixed(1)),
      saturatedFat: Number(((product.saturated_fat || 0) * factor).toFixed(1)),
      transFat: Number(((product.trans_fat || 0) * factor).toFixed(1)),
      fiber: Number(((product.fiber || 0) * factor).toFixed(1)),
      sodium: Number(((product.sodium || 0) * factor).toFixed(1)),
    };
  }, [product, consumedQuantity, packageInfo, mode]);

  const handleSubmit = async () => {
    if (!product || !calculatedNutrition) return;
    
    setIsSubmitting(true);
    try {
      const isLiquid = product.is_liquid;
      const liquidMl = isLiquid ? consumedQuantity.ml : 0;
      const quantity = isLiquid ? consumedQuantity.ml : consumedQuantity.grams;
      
      await addEntry({
        name: product.name,
        nutrition: calculatedNutrition,
        imageUrl: product.image_url || undefined,
        quantity: quantity || product.reference_quantity,
        unit: isLiquid ? 'ml' : 'g',
        source: 'barcode',
        isLiquid,
        liquidMl,
      });
      
      toast.success('Consumo registrado!', {
        description: `${product.name} - ${calculatedNutrition.calories} kcal`,
      });
      
      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Erro ao registrar consumo');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product || !packageInfo) return null;

  // Determine available options based on product type
  const showMlOption = packageInfo.isLiquid;
  const showWeightOption = !packageInfo.isLiquid;
  const showUnitsOption = !packageInfo.isLiquid && !!packageInfo.totalUnits && !!packageInfo.weightPerUnit;
  const hasAllOption = packageInfo.hasPackageInfo;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            Registrar Consumo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary overflow-hidden flex-shrink-0">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
              ) : packageInfo.isLiquid ? (
                <Droplets className="h-5 w-5 text-sky-500" />
              ) : (
                <Apple className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{product.name}</p>
              {product.brand && (
                <p className="text-xs text-muted-foreground truncate">{product.brand}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {product.calories} kcal/{product.reference_quantity}{product.reference_unit}
                </span>
              </div>
            </div>
          </div>

          {/* Package info display */}
          {packageInfo.hasPackageInfo && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <p className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
                <Package className="h-3 w-3" />
                Informações da Embalagem
              </p>
              {packageInfo.isLiquid && packageInfo.totalVolume && (
                <p className="text-sm">Volume total: <strong>{packageInfo.totalVolume}ml</strong></p>
              )}
              {!packageInfo.isLiquid && packageInfo.totalWeight && (
                <p className="text-sm">Peso total: <strong>{packageInfo.totalWeight}g</strong></p>
              )}
              {packageInfo.totalUnits && (
                <p className="text-sm">
                  Unidades: <strong>{packageInfo.totalUnits}</strong>
                  {packageInfo.weightPerUnit && (
                    <span className="text-muted-foreground"> ({packageInfo.weightPerUnit.toFixed(0)}g cada)</span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Consumption mode selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quanto você consumiu?</Label>
            <RadioGroup 
              value={mode} 
              onValueChange={(v) => {
                setMode(v as ConsumptionMode);
                setPartialValue('');
              }}
              className="space-y-2"
            >
              {hasAllOption && (
                <label className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary/80 transition-colors">
                  <RadioGroupItem value="all" id="all" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">Tudo</span>
                    <p className="text-xs text-muted-foreground">
                      {packageInfo.isLiquid 
                        ? `${packageInfo.totalVolume}ml` 
                        : `${packageInfo.totalWeight}g${packageInfo.totalUnits ? ` (${packageInfo.totalUnits} unidades)` : ''}`
                      }
                    </p>
                  </div>
                </label>
              )}

              {showMlOption && (
                <label className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary/80 transition-colors">
                  <RadioGroupItem value="partial_ml" id="partial_ml" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">Quantidade em ml</span>
                    <p className="text-xs text-muted-foreground">Informar quanto bebi</p>
                  </div>
                </label>
              )}

              {showWeightOption && (
                <label className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary/80 transition-colors">
                  <RadioGroupItem value="partial_weight" id="partial_weight" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">Quantidade em gramas</span>
                    <p className="text-xs text-muted-foreground">Informar peso consumido</p>
                  </div>
                </label>
              )}

              {showUnitsOption && (
                <label className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary/80 transition-colors">
                  <RadioGroupItem value="partial_units" id="partial_units" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">Quantidade de unidades</span>
                    <p className="text-xs text-muted-foreground">
                      Cada unidade = {packageInfo.weightPerUnit?.toFixed(0)}g
                    </p>
                  </div>
                </label>
              )}
            </RadioGroup>
          </div>

          {/* Partial value input */}
          {mode !== 'all' && (
            <div className="space-y-2">
              <Label htmlFor="partial-value" className="text-sm">
                {mode === 'partial_ml' && 'Quantidade (ml)'}
                {mode === 'partial_weight' && 'Quantidade (g)'}
                {mode === 'partial_units' && 'Número de unidades'}
              </Label>
              <Input
                id="partial-value"
                type="number"
                value={partialValue}
                onChange={(e) => setPartialValue(e.target.value)}
                placeholder={mode === 'partial_units' ? 'Ex: 2' : 'Ex: 100'}
                min="0"
                step={mode === 'partial_units' ? '1' : 'any'}
              />
            </div>
          )}

          {/* Calculated nutrition preview */}
          {calculatedNutrition && (consumedQuantity.grams > 0 || consumedQuantity.ml > 0 || mode === 'all') && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
              <p className="text-xs font-medium flex items-center gap-1 text-primary">
                <Calculator className="h-3 w-3" />
                Valores Calculados
                {consumedQuantity.display && (
                  <span className="text-muted-foreground ml-1">({consumedQuantity.display})</span>
                )}
              </p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-primary">{calculatedNutrition.calories}</p>
                  <p className="text-xs text-muted-foreground">kcal</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-500">{calculatedNutrition.protein}g</p>
                  <p className="text-xs text-muted-foreground">prot</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-500">{calculatedNutrition.carbs}g</p>
                  <p className="text-xs text-muted-foreground">carb</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-rose-500">{calculatedNutrition.fat}g</p>
                  <p className="text-xs text-muted-foreground">gord</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit button */}
          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={isSubmitting || (mode !== 'all' && !partialValue)}
          >
            <Check className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Registrando...' : 'Confirmar Consumo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}