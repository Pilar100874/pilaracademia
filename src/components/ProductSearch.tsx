import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Package, Plus, Minus, Droplets, Apple, Calculator, GlassWater } from 'lucide-react';
import { useCustomProducts, CustomProduct } from '@/hooks/useCustomProducts';
import { useFoodEntries } from '@/hooks/useFoodEntries';

interface ProductSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// Liquid fraction options
const LIQUID_FRACTIONS = [
  { label: '1/4', value: 0.25 },
  { label: '1/3', value: 0.33 },
  { label: '1/2', value: 0.5 },
  { label: '2/3', value: 0.67 },
  { label: '3/4', value: 0.75 },
  { label: 'Tudo', value: 1 },
];

export function ProductSearch({ isOpen, onClose }: ProductSearchProps) {
  const { products, isLoading } = useCustomProducts();
  const { addEntry } = useFoodEntries();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<CustomProduct | null>(null);
  
  // Consumption mode
  const [consumeMode, setConsumeMode] = useState<'units' | 'weight' | 'ml' | 'fraction'>('units');
  const [consumeValue, setConsumeValue] = useState('');
  const [selectedFraction, setSelectedFraction] = useState<number | null>(null);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedProduct(null);
      setConsumeValue('');
      setSelectedFraction(null);
    }
  }, [isOpen]);

  // Package info
  const packageInfo = useMemo(() => {
    if (!selectedProduct) return null;
    
    const isLiquid = selectedProduct.is_liquid;
    const totalVolume = selectedProduct.package_volume_ml;
    const totalWeight = selectedProduct.package_total_weight;
    const totalUnits = selectedProduct.package_total_units;
    const weightPerUnit = totalWeight && totalUnits ? totalWeight / totalUnits : null;
    
    return {
      isLiquid,
      totalVolume,
      totalWeight,
      totalUnits,
      weightPerUnit,
      hasPackageInfo: isLiquid ? !!totalVolume : (!!totalWeight || !!totalUnits),
    };
  }, [selectedProduct]);

  // Set default consume mode when product is selected
  useEffect(() => {
    if (selectedProduct && packageInfo) {
      setConsumeValue('');
      setSelectedFraction(null);
      
      if (packageInfo.isLiquid) {
        setConsumeMode(packageInfo.totalVolume ? 'fraction' : 'ml');
      } else if (packageInfo.totalUnits && packageInfo.weightPerUnit) {
        setConsumeMode('units');
      } else {
        setConsumeMode('weight');
      }
    }
  }, [selectedProduct, packageInfo]);

  // Calculate consumed quantity
  const consumedQuantity = useMemo(() => {
    if (!selectedProduct || !packageInfo) return { grams: 0, ml: 0, display: '' };
    
    if (packageInfo.isLiquid) {
      if (consumeMode === 'fraction' && selectedFraction !== null && packageInfo.totalVolume) {
        const ml = packageInfo.totalVolume * selectedFraction;
        const fractionLabel = LIQUID_FRACTIONS.find(f => f.value === selectedFraction)?.label || '';
        return { grams: 0, ml, display: `${fractionLabel} = ${Math.round(ml)}ml` };
      }
      if (consumeMode === 'ml') {
        const ml = parseFloat(consumeValue) || 0;
        return { grams: 0, ml, display: `${ml}ml` };
      }
    } else {
      if (consumeMode === 'units' && packageInfo.weightPerUnit) {
        const units = parseFloat(consumeValue) || 0;
        const grams = units * packageInfo.weightPerUnit;
        return { grams, ml: 0, display: `${units} un. = ${Math.round(grams)}g` };
      }
      if (consumeMode === 'weight') {
        const grams = parseFloat(consumeValue) || 0;
        return { grams, ml: 0, display: `${grams}g` };
      }
    }
    
    return { grams: 0, ml: 0, display: '' };
  }, [selectedProduct, packageInfo, consumeMode, consumeValue, selectedFraction]);

  // Calculate nutrition
  const calculatedNutrition = useMemo(() => {
    if (!selectedProduct) return null;
    
    const refQty = selectedProduct.reference_quantity || 100;
    const consumedQty = packageInfo?.isLiquid ? consumedQuantity.ml : consumedQuantity.grams;
    
    if (consumedQty === 0) return null;
    
    const factor = consumedQty / refQty;
    
    return {
      calories: Math.round(selectedProduct.calories * factor),
      protein: Number((selectedProduct.protein * factor).toFixed(1)),
      carbs: Number((selectedProduct.carbs * factor).toFixed(1)),
      fat: Number((selectedProduct.fat * factor).toFixed(1)),
      fiber: selectedProduct.fiber ? Number((selectedProduct.fiber * factor).toFixed(1)) : 0,
      saturatedFat: selectedProduct.saturated_fat ? Number((selectedProduct.saturated_fat * factor).toFixed(1)) : 0,
      transFat: selectedProduct.trans_fat ? Number((selectedProduct.trans_fat * factor).toFixed(1)) : 0,
      sodium: selectedProduct.sodium ? Math.round(selectedProduct.sodium * factor) : 0,
    };
  }, [selectedProduct, packageInfo, consumedQuantity]);

  const handleSelectProduct = (product: CustomProduct) => {
    setSelectedProduct(product);
  };

  const handleAddEntry = async () => {
    if (!selectedProduct || !calculatedNutrition || !packageInfo) return;

    try {
      const isLiquid = selectedProduct.is_liquid;
      const liquidMl = isLiquid ? consumedQuantity.ml : 0;
      const quantity = isLiquid ? consumedQuantity.ml : consumedQuantity.grams;
      
      await addEntry({
        name: selectedProduct.name,
        nutrition: calculatedNutrition,
        quantity: quantity || selectedProduct.reference_quantity,
        unit: isLiquid ? 'ml' : 'g',
        source: 'barcode',
        imageUrl: selectedProduct.image_url || undefined,
        isLiquid,
        liquidMl,
      });

      onClose();
    } catch (error) {
      console.error('Erro ao adicionar:', error);
    }
  };

  const canSubmit = consumedQuantity.grams > 0 || consumedQuantity.ml > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Produto
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Digite o nome do produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {!selectedProduct ? (
          <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="mt-3 text-sm font-medium">Aguarde, carregando produtos...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">
                  {search ? 'Nenhum produto encontrado' : 'Nenhum produto salvo'}
                </p>
                <p className="text-xs mt-1">
                  {search ? 'Tente outro termo' : 'Escaneie códigos de barras para salvar produtos'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((product) => {
                  // Build package display
                  let packageDisplay = '';
                  if (product.is_liquid && product.package_volume_ml) {
                    packageDisplay = `${product.package_volume_ml}ml`;
                  } else if (!product.is_liquid) {
                    if (product.package_total_weight && product.package_total_units) {
                      const perUnit = product.package_total_weight / product.package_total_units;
                      packageDisplay = `${product.package_total_units} un. (${perUnit.toFixed(0)}g/un)`;
                    } else if (product.package_total_weight) {
                      packageDisplay = `${product.package_total_weight}g`;
                    }
                  }
                  
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
                    >
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-12 w-12 rounded-lg object-cover bg-muted"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                          {product.is_liquid ? (
                            <Droplets className="h-6 w-6 text-sky-500" />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        {product.brand && (
                          <p className="text-xs text-muted-foreground truncate">{product.brand}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {product.calories} kcal/{product.reference_quantity}{product.reference_unit}
                          </span>
                          {packageDisplay && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 flex items-center gap-0.5">
                              <Package className="h-3 w-3" />
                              {packageDisplay}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Selected product info */}
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-accent/30">
              {selectedProduct.image_url ? (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="h-14 w-14 rounded-lg object-cover bg-muted"
                />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
                  {packageInfo?.isLiquid ? (
                    <Droplets className="h-7 w-7 text-sky-500" />
                  ) : (
                    <Package className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedProduct.name}</p>
                {selectedProduct.brand && (
                  <p className="text-sm text-muted-foreground truncate">{selectedProduct.brand}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProduct(null)}
              >
                Trocar
              </Button>
            </div>

            {/* Package info */}
            {packageInfo?.hasPackageInfo && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
                <p className="text-xs font-medium flex items-center gap-1 text-amber-600">
                  <Package className="h-3 w-3" />
                  Embalagem
                </p>
                {packageInfo.isLiquid && packageInfo.totalVolume && (
                  <p className="text-lg font-bold text-amber-600">{packageInfo.totalVolume}ml</p>
                )}
                {!packageInfo.isLiquid && packageInfo.totalWeight && (
                  <p className="text-sm">Peso total: <strong>{packageInfo.totalWeight}g</strong></p>
                )}
                {packageInfo.totalUnits && (
                  <p className="text-sm">
                    <strong>{packageInfo.totalUnits}</strong> unidades
                    {packageInfo.weightPerUnit && (
                      <span className="text-muted-foreground"> ({packageInfo.weightPerUnit.toFixed(0)}g cada)</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* LIQUID consumption options */}
            {packageInfo?.isLiquid && (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <GlassWater className="h-4 w-4 text-sky-500" />
                  Quanto você bebeu?
                </p>
                
                {/* Fraction options if package volume exists */}
                {packageInfo.totalVolume && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {LIQUID_FRACTIONS.map((fraction) => {
                        const ml = packageInfo.totalVolume! * fraction.value;
                        return (
                          <button
                            key={fraction.value}
                            onClick={() => {
                              setSelectedFraction(fraction.value);
                              setConsumeMode('fraction');
                              setConsumeValue('');
                            }}
                            className={`p-2 rounded-lg text-center transition-all border-2 ${
                              consumeMode === 'fraction' && selectedFraction === fraction.value
                                ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                                : 'border-muted bg-secondary/50 hover:border-sky-500/50'
                            }`}
                          >
                            <span className="text-sm font-medium">{fraction.label}</span>
                            <span className="block text-xs text-muted-foreground">{Math.round(ml)}ml</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-center text-xs text-muted-foreground">ou</div>
                  </>
                )}
                
                {/* Custom ml input */}
                <div 
                  className={`p-3 rounded-lg border-2 transition-all ${
                    consumeMode === 'ml' ? 'border-sky-500 bg-sky-500/10' : 'border-muted'
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
                      value={consumeMode === 'ml' ? consumeValue : ''}
                      onChange={(e) => {
                        setConsumeValue(e.target.value);
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
            )}

            {/* SOLID consumption options */}
            {!packageInfo?.isLiquid && (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Apple className="h-4 w-4 text-primary" />
                  Quanto você consumiu?
                </p>
                
                {/* Units option */}
                {packageInfo?.totalUnits && packageInfo?.weightPerUnit && (
                  <div 
                    className={`p-3 rounded-lg border-2 transition-all ${
                      consumeMode === 'units' ? 'border-primary bg-primary/10' : 'border-muted'
                    }`}
                    onClick={() => setConsumeMode('units')}
                  >
                    <p className="text-sm font-medium mb-1">Por unidades</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Cada unidade = {packageInfo.weightPerUnit.toFixed(0)}g
                    </p>
                    {consumeMode === 'units' && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            const current = parseFloat(consumeValue) || 0;
                            if (current > 1) setConsumeValue((current - 1).toString());
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={consumeValue}
                          onChange={(e) => setConsumeValue(e.target.value)}
                          placeholder="Ex: 3"
                          min="0"
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
                            const current = parseFloat(consumeValue) || 0;
                            setConsumeValue((current + 1).toString());
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">un.</span>
                      </div>
                    )}
                  </div>
                )}
                
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
                        value={consumeValue}
                        onChange={(e) => setConsumeValue(e.target.value)}
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
            {calculatedNutrition && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <p className="text-xs font-medium flex items-center gap-1 text-primary">
                  <Calculator className="h-3 w-3" />
                  Valores Calculados
                  <span className="text-muted-foreground ml-1">({consumedQuantity.display})</span>
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

            <Button onClick={handleAddEntry} className="w-full" disabled={!canSubmit}>
              Adicionar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}