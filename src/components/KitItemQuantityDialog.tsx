import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassWater, Package, Calculator } from 'lucide-react';
import { CustomProduct } from '@/hooks/useCustomProducts';

interface KitItemQuantityDialogProps {
  product: CustomProduct;
  currentQuantity: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (quantity: number, unit: string) => void;
}

const GLASS_SIZE = 200;

const LIQUID_PORTIONS = [
  { label: '½ copo', value: GLASS_SIZE * 0.5 },
  { label: '1 copo', value: GLASS_SIZE },
  { label: '1½ copo', value: GLASS_SIZE * 1.5 },
  { label: '2 copos', value: GLASS_SIZE * 2 },
];

const SOLID_UNIT_PRESETS = [
  { label: '1/4', value: 0.25 },
  { label: '1/3', value: 0.33 },
  { label: '1/2', value: 0.5 },
];

export function KitItemQuantityDialog({
  product,
  currentQuantity,
  open,
  onOpenChange,
  onConfirm,
}: KitItemQuantityDialogProps) {
  const [selectedMl, setSelectedMl] = useState<number | null>(null);
  const [customMl, setCustomMl] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  
  const [solidMode, setSolidMode] = useState<'all' | 'units' | 'weight'>('units');
  const [solidValue, setSolidValue] = useState('');
  const [selectedUnitPreset, setSelectedUnitPreset] = useState<number | null>(1);

  // Initialize with current quantity
  useState(() => {
    if (product.is_liquid) {
      const matchingPortion = LIQUID_PORTIONS.find(p => p.value === currentQuantity);
      if (matchingPortion) {
        setSelectedMl(currentQuantity);
      } else if (product.package_volume_ml === currentQuantity) {
        setSelectedMl(currentQuantity);
      } else {
        setIsCustom(true);
        setCustomMl(currentQuantity.toString());
      }
    }
  });

  const packageInfo = useMemo(() => {
    const isLiquid = product.is_liquid;
    const totalVolume = product.package_volume_ml;
    const totalWeight = product.package_total_weight;
    const totalUnits = product.package_total_units;
    const refQty = product.reference_quantity;
    const refUnit = product.reference_unit;
    
    const weightPerUnit = totalWeight && totalUnits ? totalWeight / totalUnits : null;
    const baseWeight = totalWeight || refQty;
    
    return {
      isLiquid,
      totalVolume,
      totalWeight,
      totalUnits,
      weightPerUnit,
      refQty,
      refUnit,
      baseWeight,
      hasPackageInfo: isLiquid ? !!totalVolume : (!!totalWeight || !!totalUnits),
    };
  }, [product]);

  const consumedMl = useMemo(() => {
    if (!packageInfo.isLiquid) return 0;
    if (isCustom) return parseFloat(customMl) || 0;
    return selectedMl || 0;
  }, [isCustom, customMl, selectedMl, packageInfo]);

  const consumedSolid = useMemo(() => {
    if (packageInfo.isLiquid) return { grams: 0, display: '' };
    
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
      const units = selectedUnitPreset !== null ? selectedUnitPreset : (parseFloat(solidValue) || 0);
      
      if (packageInfo.weightPerUnit) {
        const grams = units * packageInfo.weightPerUnit;
        return { grams, display: `${units} un. = ${grams.toFixed(0)}g` };
      } else {
        const grams = units * packageInfo.baseWeight;
        return { grams, display: `${units} porção = ${grams.toFixed(0)}g` };
      }
    }
    
    return { grams: 0, display: '' };
  }, [solidMode, solidValue, selectedUnitPreset, packageInfo]);

  const calculatedNutrition = useMemo(() => {
    const refQty = product.reference_quantity || 100;
    let consumedQty = packageInfo.isLiquid ? consumedMl : consumedSolid.grams;
    
    if (consumedQty === 0) return null;
    
    const multiplier = consumedQty / refQty;
    
    return {
      calories: Math.round(product.calories * multiplier),
      protein: Math.round(product.protein * multiplier * 10) / 10,
      carbs: Math.round(product.carbs * multiplier * 10) / 10,
      fat: Math.round(product.fat * multiplier * 10) / 10,
    };
  }, [product, packageInfo, consumedMl, consumedSolid]);

  const handleConfirm = () => {
    const quantity = packageInfo.isLiquid ? consumedMl : consumedSolid.grams;
    const unit = packageInfo.isLiquid ? 'ml' : 'g';
    onConfirm(quantity, unit);
    onOpenChange(false);
  };

  const canConfirm = packageInfo.isLiquid ? consumedMl > 0 : consumedSolid.grams > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Definir quantidade</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product info */}
          <div className={`p-3 rounded-lg border ${
            packageInfo.hasPackageInfo 
              ? 'bg-sky-500/10 border-sky-500/20' 
              : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            <p className="text-sm font-medium">{product.name}</p>
            <p className="text-xs text-muted-foreground">
              {packageInfo.isLiquid ? (
                packageInfo.totalVolume ? `Embalagem: ${packageInfo.totalVolume}ml` : `Ref: ${packageInfo.refQty}ml`
              ) : (
                packageInfo.totalWeight 
                  ? `Embalagem: ${packageInfo.totalWeight}g${packageInfo.totalUnits ? ` (${packageInfo.totalUnits} un.)` : ''}`
                  : `Ref: ${packageInfo.refQty}g`
              )}
            </p>
          </div>

          {/* LIQUID OPTIONS */}
          {packageInfo.isLiquid && (
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <GlassWater className="h-4 w-4 text-sky-500" />
                Quantidade
              </Label>
              
              <div className="grid grid-cols-2 gap-2">
                {LIQUID_PORTIONS.map((portion) => (
                  <button
                    key={portion.value}
                    onClick={() => {
                      setSelectedMl(portion.value);
                      setIsCustom(false);
                    }}
                    className={`p-2 rounded-lg text-sm font-medium transition-all border-2 ${
                      !isCustom && selectedMl === portion.value
                        ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                        : 'border-muted bg-secondary/50 hover:border-sky-500/50'
                    }`}
                  >
                    {portion.label}
                    <span className="block text-xs text-muted-foreground">{portion.value}ml</span>
                  </button>
                ))}
                
                {packageInfo.totalVolume && (
                  <button
                    onClick={() => {
                      setSelectedMl(packageInfo.totalVolume!);
                      setIsCustom(false);
                    }}
                    className={`p-2 rounded-lg text-sm font-medium transition-all border-2 ${
                      !isCustom && selectedMl === packageInfo.totalVolume
                        ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                        : 'border-muted bg-secondary/50 hover:border-sky-500/50'
                    }`}
                  >
                    Tudo
                    <span className="block text-xs text-muted-foreground">{packageInfo.totalVolume}ml</span>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setIsCustom(true);
                    setSelectedMl(null);
                  }}
                  className={`p-2 rounded-lg text-sm font-medium transition-all border-2 ${
                    isCustom
                      ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                      : 'border-muted bg-secondary/50 hover:border-sky-500/50'
                  }`}
                >
                  Outro
                  <span className="block text-xs text-muted-foreground">Digitar</span>
                </button>
              </div>
              
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
              <Label className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Quantidade
              </Label>
              
              <div className="grid grid-cols-3 gap-2">
                {SOLID_UNIT_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => {
                      setSolidMode('units');
                      setSelectedUnitPreset(preset.value);
                      setSolidValue('');
                    }}
                    className={`p-2 rounded-lg text-center font-medium transition-all border-2 ${
                      solidMode === 'units' && selectedUnitPreset === preset.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted bg-secondary/50 hover:border-primary/50'
                    }`}
                  >
                    <span className="text-base">{preset.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {packageInfo.weightPerUnit 
                        ? `${(preset.value * packageInfo.weightPerUnit).toFixed(0)}g`
                        : `${(preset.value * packageInfo.baseWeight).toFixed(0)}g`
                      }
                    </span>
                  </button>
                ))}
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSolidMode('units');
                    setSelectedUnitPreset(1);
                    setSolidValue('');
                  }}
                  className={`w-full p-2 rounded-lg text-left transition-all border-2 ${
                    solidMode === 'units' && selectedUnitPreset === 1
                      ? 'border-primary bg-primary/10'
                      : 'border-muted bg-secondary/50 hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium">1 unidade</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {packageInfo.weightPerUnit 
                      ? `${packageInfo.weightPerUnit.toFixed(0)}g`
                      : `${packageInfo.baseWeight}g`
                    }
                  </span>
                </button>

                <button
                  onClick={() => {
                    setSolidMode('all');
                    setSolidValue('');
                    setSelectedUnitPreset(null);
                  }}
                  className={`w-full p-2 rounded-lg text-left transition-all border-2 ${
                    solidMode === 'all'
                      ? 'border-primary bg-primary/10'
                      : 'border-muted bg-secondary/50 hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium">Tudo</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {packageInfo.totalWeight 
                      ? `${packageInfo.totalWeight}g`
                      : `${packageInfo.refQty}g`
                    }
                  </span>
                </button>
                
                <button
                  onClick={() => {
                    setSolidMode('units');
                    setSelectedUnitPreset(null);
                    setSolidValue('');
                  }}
                  className={`w-full p-2 rounded-lg text-left transition-all border-2 ${
                    solidMode === 'units' && selectedUnitPreset === null
                      ? 'border-primary bg-primary/10'
                      : 'border-muted bg-secondary/50 hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium">Outra quantidade</span>
                </button>
                
                <button
                  onClick={() => {
                    setSolidMode('weight');
                    setSelectedUnitPreset(null);
                    setSolidValue('');
                  }}
                  className={`w-full p-2 rounded-lg text-left transition-all border-2 ${
                    solidMode === 'weight'
                      ? 'border-primary bg-primary/10'
                      : 'border-muted bg-secondary/50 hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium">Por gramas</span>
                </button>
              </div>
              
              {(solidMode === 'weight' || (solidMode === 'units' && selectedUnitPreset === null)) && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={solidValue}
                    onChange={(e) => setSolidValue(e.target.value)}
                    placeholder={solidMode === 'units' ? 'Ex: 2' : 'Ex: 100'}
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

          {/* Nutrition preview */}
          {calculatedNutrition && (
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs font-medium flex items-center gap-1 text-primary mb-1">
                <Calculator className="h-3 w-3" />
                {packageInfo.isLiquid ? `${consumedMl}ml` : consumedSolid.display}
              </p>
              <div className="grid grid-cols-4 gap-1 text-center text-xs">
                <div>
                  <p className="font-bold text-primary">{calculatedNutrition.calories}</p>
                  <p className="text-muted-foreground">kcal</p>
                </div>
                <div>
                  <p className="font-bold">{calculatedNutrition.protein}g</p>
                  <p className="text-muted-foreground">prot</p>
                </div>
                <div>
                  <p className="font-bold">{calculatedNutrition.carbs}g</p>
                  <p className="text-muted-foreground">carb</p>
                </div>
                <div>
                  <p className="font-bold">{calculatedNutrition.fat}g</p>
                  <p className="text-muted-foreground">gord</p>
                </div>
              </div>
            </div>
          )}

          <Button
            variant="gradient"
            className="w-full"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
