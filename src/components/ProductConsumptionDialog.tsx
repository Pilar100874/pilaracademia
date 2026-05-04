import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Droplets, Apple, Calculator, Package, UtensilsCrossed, Check, GlassWater, ArrowLeft } from 'lucide-react';
import { CustomProduct } from '@/hooks/useCustomProducts';
import { useFoodEntries } from '@/hooks/useFoodEntries';
import { toast } from 'sonner';

interface ProductConsumptionDialogProps {
  product: CustomProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onBack?: () => void;
  selectedDate?: Date;
}

// Glass size in ml (standard glass)
const GLASS_SIZE = 200;

// Liquid portion presets
const LIQUID_PORTIONS = [
  { label: '½ copo', value: GLASS_SIZE * 0.5, icon: '🥛' },
  { label: '1 copo', value: GLASS_SIZE, icon: '🥛' },
  { label: '1½ copo', value: GLASS_SIZE * 1.5, icon: '🥛' },
  { label: '2 copos', value: GLASS_SIZE * 2, icon: '🥛' },
];

// Solid portion presets (fractions only)
const SOLID_UNIT_PRESETS = [
  { label: '1/4', value: 0.25 },
  { label: '1/3', value: 0.33 },
  { label: '1/2', value: 0.5 },
];

export function ProductConsumptionDialog({ 
  product, 
  open, 
  onOpenChange,
  onSuccess,
  onBack,
  selectedDate
}: ProductConsumptionDialogProps) {
  const { addEntry } = useFoodEntries(selectedDate);
  const [selectedMl, setSelectedMl] = useState<number | null>(null);
  const [customMl, setCustomMl] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // For solids
  const [solidMode, setSolidMode] = useState<'all' | 'units' | 'weight'>('units');
  const [solidValue, setSolidValue] = useState('');
  const [selectedUnitPreset, setSelectedUnitPreset] = useState<number | null>(1);

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedMl(null);
      setCustomMl('');
      setIsCustom(false);
      setSolidMode('units');
      setSolidValue('');
      setSelectedUnitPreset(1);
    }
    onOpenChange(newOpen);
  };

  // Calculate package info
  const packageInfo = useMemo(() => {
    if (!product) return null;
    
    // Treat as liquid if explicitly flagged OR if it has a package volume in ml
    // (covers legacy products saved without is_liquid=true).
    const isLiquid = product.is_liquid || (!!product.package_volume_ml && product.package_volume_ml > 0);
    const totalVolume = product.package_volume_ml;
    const totalWeight = product.package_total_weight;
    const totalUnits = product.package_total_units;
    const refQty = product.reference_quantity;
    const refUnit = product.reference_unit;
    
    const weightPerUnit = totalWeight && totalUnits ? totalWeight / totalUnits : null;
    
    // Base weight for fractions: use total weight if available, otherwise use reference quantity
    const baseWeight = totalWeight || refQty;
    
    return {
      isLiquid,
      totalVolume,
      totalWeight,
      totalUnits,
      weightPerUnit,
      refQty,
      refUnit,
      baseWeight, // This is what fractions should be based on
      hasPackageInfo: isLiquid ? !!totalVolume : (!!totalWeight || !!totalUnits),
    };
  }, [product]);

  // Get consumed ml for liquids
  const consumedMl = useMemo(() => {
    if (!packageInfo?.isLiquid) return 0;
    if (isCustom) return parseFloat(customMl) || 0;
    return selectedMl || 0;
  }, [isCustom, customMl, selectedMl, packageInfo]);

  // Get consumed grams/quantity for solids
  const consumedSolid = useMemo(() => {
    if (!packageInfo || packageInfo.isLiquid) return { grams: 0, display: '' };
    
    if (solidMode === 'all') {
      const grams = packageInfo.totalWeight || packageInfo.refQty;
      return { 
        grams, 
        display: packageInfo.totalWeight 
          ? `${packageInfo.totalWeight}g (tudo)` 
          : `${packageInfo.refQty}${packageInfo.refUnit}`
      };
    }
    
    if (solidMode === 'weight') {
      const grams = parseFloat(solidValue) || 0;
      return { grams, display: `${grams}g` };
    }
    
    if (solidMode === 'units') {
      // Use preset or custom value
      const units = selectedUnitPreset !== null ? selectedUnitPreset : (parseFloat(solidValue) || 0);
      
      if (packageInfo.weightPerUnit) {
        // If we have weight per unit, calculate based on that
        const grams = units * packageInfo.weightPerUnit;
        const unitLabel = units === 1 ? 'un.' : 'un.';
        return { grams, display: `${units} ${unitLabel} = ${grams.toFixed(0)}g` };
      } else {
        // Use base weight (total weight or reference quantity) for fractions
        const grams = units * packageInfo.baseWeight;
        const unitLabel = units === 1 ? 'porção' : 'porções';
        return { grams, display: `${units} ${unitLabel} = ${grams.toFixed(0)}g` };
      }
    }
    
    return { grams: 0, display: '' };
  }, [solidMode, solidValue, selectedUnitPreset, packageInfo]);

  // Calculate nutrition based on consumed quantity
  const calculatedNutrition = useMemo(() => {
    if (!product || !packageInfo) return null;
    
    const refQty = product.reference_quantity || 100;
    let consumedQty = packageInfo.isLiquid ? consumedMl : consumedSolid.grams;
    
    if (consumedQty === 0) return null;
    
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
  }, [product, consumedMl, consumedSolid, packageInfo]);

  const handleSubmit = async () => {
    if (!product || !calculatedNutrition || !packageInfo) return;
    
    setIsSubmitting(true);
    try {
      const isLiquid = product.is_liquid;
      const liquidMl = isLiquid ? consumedMl : 0;
      const quantity = isLiquid ? consumedMl : consumedSolid.grams;
      
      // Only pass productId if it's a valid UUID (not a natural product id like 'nat_banana')
      const isValidUuid = product.id && product.id.includes('-') && product.id.length === 36;
      
      await addEntry({
        name: product.name,
        nutrition: calculatedNutrition,
        imageUrl: product.image_url || undefined,
        quantity: quantity || product.reference_quantity,
        unit: isLiquid ? 'ml' : 'g',
        source: 'barcode',
        isLiquid,
        liquidMl,
        productId: isValidUuid ? product.id : undefined,
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

  const canSubmit = packageInfo.isLiquid 
    ? consumedMl > 0 
    : (solidMode === 'all' || 
       (solidMode === 'units' && selectedUnitPreset !== null) || 
       (solidValue && parseFloat(solidValue) > 0));

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
          <div className={`p-3 rounded-lg border space-y-1 ${
            packageInfo.hasPackageInfo 
              ? 'bg-sky-500/10 border-sky-500/20' 
              : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            <p className={`text-xs font-medium flex items-center gap-1 ${
              packageInfo.hasPackageInfo ? 'text-sky-600' : 'text-amber-600'
            }`}>
              <Package className="h-3 w-3" />
              {packageInfo.hasPackageInfo ? 'Embalagem' : 'Base para cálculo'}
            </p>
            {packageInfo.isLiquid ? (
              <p className="text-lg font-bold text-sky-600">
                {packageInfo.totalVolume || packageInfo.refQty}ml
              </p>
            ) : (
              <>
                {packageInfo.totalWeight ? (
                  <p className="text-sm">Peso total: <strong>{packageInfo.totalWeight}g</strong></p>
                ) : (
                  <p className="text-sm text-amber-600">
                    Usando referência nutricional: <strong>{packageInfo.refQty}g</strong>
                  </p>
                )}
              </>
            )}
            {packageInfo.totalUnits && (
              <p className="text-sm">
                <strong>{packageInfo.totalUnits}</strong> unidades
                {packageInfo.weightPerUnit && (
                  <span className="text-muted-foreground"> ({packageInfo.weightPerUnit.toFixed(0)}g cada)</span>
                )}
              </p>
            )}
            {!packageInfo.hasPackageInfo && !packageInfo.isLiquid && (
              <p className="text-xs text-amber-600/80">
                Cadastre o peso da embalagem para cálculos mais precisos
              </p>
            )}
          </div>

          {/* LIQUID OPTIONS */}
          {packageInfo.isLiquid && (
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <GlassWater className="h-4 w-4 text-sky-500" />
                Quanto você bebeu?
              </Label>
              
              {/* Quick portion buttons */}
              <div className="grid grid-cols-2 gap-2">
                {LIQUID_PORTIONS.map((portion) => (
                  <button
                    key={portion.value}
                    onClick={() => {
                      setSelectedMl(portion.value);
                      setIsCustom(false);
                    }}
                    className={`p-3 rounded-lg text-sm font-medium transition-all border-2 ${
                      !isCustom && selectedMl === portion.value
                        ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                        : 'border-muted bg-secondary/50 hover:border-sky-500/50'
                    }`}
                  >
                    <span className="text-lg mr-1">{portion.icon}</span>
                    {portion.label}
                    <span className="block text-xs text-muted-foreground">{portion.value}ml</span>
                  </button>
                ))}
                
                {/* "Tudo" option if package info exists */}
                {packageInfo.totalVolume && (
                  <button
                    onClick={() => {
                      setSelectedMl(packageInfo.totalVolume!);
                      setIsCustom(false);
                    }}
                    className={`p-3 rounded-lg text-sm font-medium transition-all border-2 ${
                      !isCustom && selectedMl === packageInfo.totalVolume
                        ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                        : 'border-muted bg-secondary/50 hover:border-sky-500/50'
                    }`}
                  >
                    <span className="text-lg mr-1">🍾</span>
                    Tudo
                    <span className="block text-xs text-muted-foreground">{packageInfo.totalVolume}ml</span>
                  </button>
                )}
                
                {/* Custom option */}
                <button
                  onClick={() => {
                    setIsCustom(true);
                    setSelectedMl(null);
                  }}
                  className={`p-3 rounded-lg text-sm font-medium transition-all border-2 ${
                    isCustom
                      ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                      : 'border-muted bg-secondary/50 hover:border-sky-500/50'
                  }`}
                >
                  <span className="text-lg mr-1">✏️</span>
                  Outro
                  <span className="block text-xs text-muted-foreground">Digitar ml</span>
                </button>
              </div>
              
              {/* Custom ml input */}
              {isCustom && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={customMl}
                    onChange={(e) => setCustomMl(e.target.value)}
                    placeholder="Ex: 350"
                    min="0"
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">ml</span>
                </div>
              )}
            </div>
          )}

          {/* SOLID OPTIONS */}
          {!packageInfo.isLiquid && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Quanto você consumiu?</Label>
              
              {/* Fraction presets */}
              <div className="grid grid-cols-3 gap-2">
                {SOLID_UNIT_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => {
                      setSolidMode('units');
                      setSelectedUnitPreset(preset.value);
                      setSolidValue('');
                    }}
                    className={`p-3 rounded-lg text-center font-medium transition-all border-2 ${
                      solidMode === 'units' && selectedUnitPreset === preset.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted bg-secondary/50 hover:border-primary/50'
                    }`}
                  >
                    <span className="text-lg">{preset.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {packageInfo.weightPerUnit 
                        ? `${(preset.value * packageInfo.weightPerUnit).toFixed(0)}g`
                        : `${(preset.value * packageInfo.baseWeight).toFixed(0)}g`
                      }
                    </span>
                  </button>
                ))}
              </div>
              
              {/* Additional options */}
              <div className="space-y-2">
                {/* All option */}
                <button
                  onClick={() => {
                    setSolidMode('all');
                    setSolidValue('');
                    setSelectedUnitPreset(null);
                  }}
                  className={`w-full p-3 rounded-lg text-left transition-all border-2 ${
                    solidMode === 'all'
                      ? 'border-primary bg-primary/10'
                      : 'border-muted bg-secondary/50 hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium">Tudo</span>
                  <p className="text-xs text-muted-foreground">
                    {packageInfo.totalWeight 
                      ? `${packageInfo.totalWeight}g${packageInfo.totalUnits ? ` (${packageInfo.totalUnits} unidades)` : ''}`
                      : `${packageInfo.refQty}${packageInfo.refUnit}`
                    }
                  </p>
                </button>
                
                {/* Custom units option */}
                <button
                  onClick={() => {
                    setSolidMode('units');
                    setSelectedUnitPreset(null);
                    setSolidValue('');
                  }}
                  className={`w-full p-3 rounded-lg text-left transition-all border-2 ${
                    solidMode === 'units' && selectedUnitPreset === null
                      ? 'border-primary bg-primary/10'
                      : 'border-muted bg-secondary/50 hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium">Outra quantidade</span>
                  <p className="text-xs text-muted-foreground">Digitar unidades</p>
                </button>
                
                {/* Weight option */}
                <button
                  onClick={() => {
                    setSolidMode('weight');
                    setSelectedUnitPreset(null);
                    setSolidValue('');
                  }}
                  className={`w-full p-3 rounded-lg text-left transition-all border-2 ${
                    solidMode === 'weight'
                      ? 'border-primary bg-primary/10'
                      : 'border-muted bg-secondary/50 hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium">Por gramas</span>
                  <p className="text-xs text-muted-foreground">Informar peso consumido</p>
                </button>
              </div>
              
              {/* Input for custom units or weight */}
              {(solidMode === 'weight' || (solidMode === 'units' && selectedUnitPreset === null)) && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={solidValue}
                    onChange={(e) => setSolidValue(e.target.value)}
                    placeholder={solidMode === 'units' ? 'Ex: 2.5' : 'Ex: 100'}
                    min="0"
                    step="any"
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">
                    {solidMode === 'units' ? 'un.' : 'g'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Calculated nutrition preview */}
          {calculatedNutrition && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
              <p className="text-xs font-medium flex items-center gap-1 text-primary">
                <Calculator className="h-3 w-3" />
                Valores Calculados
                <span className="text-muted-foreground ml-1">
                  ({packageInfo.isLiquid ? `${consumedMl}ml` : consumedSolid.display})
                </span>
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

          {/* Action buttons */}
          <div className="flex gap-2">
            {onBack && (
              <Button 
                variant="outline"
                onClick={onBack}
                disabled={isSubmitting}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            )}
            <Button 
              className="flex-1" 
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
            >
              <Check className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Registrando...' : 'Confirmar Consumo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}