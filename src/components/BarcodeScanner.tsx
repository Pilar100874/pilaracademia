import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Camera, Loader2, Check, Star, Minus, Plus } from 'lucide-react';
import { BarcodeProduct, NutritionData } from '@/types/nutrition';
import { NutritionDisplay } from '@/components/NutritionDisplay';
import { LiquidConsumptionDialog } from '@/components/LiquidConsumptionDialog';
import { fetchProductByBarcode, calculateNutritionForPortion, isLiquidProduct, getLiquidVolumeMl } from '@/lib/openFoodFacts';
import { useCustomProducts } from '@/hooks/useCustomProducts';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onProductFound: (product: BarcodeProduct, portionGrams: number, isLiquid?: boolean, liquidMl?: number) => void;
  onClose: () => void;
}

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

export function BarcodeScanner({ onProductFound, onClose }: BarcodeScannerProps) {
  const { getProductByBarcode, saveProduct } = useCustomProducts();
  const [barcode, setBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [totalProductWeight, setTotalProductWeight] = useState<number | null>(null);
  const [inputMode, setInputMode] = useState<'grams' | 'proportion'>('grams');
  const [portionGrams, setPortionGrams] = useState(100);
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  const [calculatedNutrition, setCalculatedNutrition] = useState<NutritionData | null>(null);
  const [isLiquid, setIsLiquid] = useState(false);
  const [liquidVolumeMl, setLiquidVolumeMl] = useState(0);
  const [showLiquidDialog, setShowLiquidDialog] = useState(false);
  const [saveForFuture, setSaveForFuture] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Calcular gramas efetivas baseado no modo
  const effectiveGrams = useMemo(() => {
    if (inputMode === 'proportion' && totalProductWeight) {
      return Math.round(totalProductWeight * portionMultiplier);
    }
    return portionGrams;
  }, [inputMode, totalProductWeight, portionMultiplier, portionGrams]);

  useEffect(() => {
    if (product) {
      setCalculatedNutrition(calculateNutritionForPortion(product.nutrition, effectiveGrams));
    }
  }, [product, effectiveGrams]);

  // Extrair peso do produto do servingSize
  const extractWeightFromServing = (servingSize?: string): number | null => {
    if (!servingSize) return null;
    const match = servingSize.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)/i);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
    return null;
  };

  const handleSearch = async () => {
    if (!barcode.trim()) return;

    setIsLoading(true);
    try {
      // Primeiro, verificar se temos o produto salvo localmente
      const customProduct = await getProductByBarcode(barcode.trim());
      
      if (customProduct) {
        // Usar produto personalizado
        const nutrition: NutritionData = {
          calories: customProduct.calories,
          protein: customProduct.protein,
          carbs: customProduct.carbs,
          fat: customProduct.fat,
          saturatedFat: customProduct.saturated_fat || 0,
          transFat: customProduct.trans_fat || 0,
          fiber: customProduct.fiber || 0,
          sodium: customProduct.sodium || 0,
        };
        
        const servingSize = `${customProduct.reference_quantity}${customProduct.reference_unit}`;
        const weight = customProduct.reference_quantity;
        
        setProduct({
          code: customProduct.barcode,
          name: customProduct.name,
          brand: customProduct.brand || undefined,
          imageUrl: customProduct.image_url || undefined,
          nutrition,
          servingSize,
        });
        setIsCustomProduct(true);
        setTotalProductWeight(weight);
        setPortionGrams(weight);
        setInputMode('proportion');
        setPortionMultiplier(1);
        toast.success('Produto encontrado (salvo)!', { icon: '⭐' });
      } else {
        // Buscar do OpenFoodFacts
        const result = await fetchProductByBarcode(barcode.trim());
        if (result) {
          setProduct(result);
          setIsCustomProduct(false);
          
          // Tentar extrair peso do produto
          const weight = extractWeightFromServing(result.servingSize);
          setTotalProductWeight(weight);
          if (weight) {
            setInputMode('proportion');
            setPortionMultiplier(1);
            setPortionGrams(weight);
          } else {
            setInputMode('grams');
            setPortionGrams(100);
          }
          
          const liquid = isLiquidProduct(result);
          setIsLiquid(liquid);
          
          if (liquid) {
            const volumeMl = getLiquidVolumeMl(result);
            setLiquidVolumeMl(volumeMl);
            setShowLiquidDialog(true);
          }
          
          toast.success('Produto encontrado!');
        } else {
          toast.error('Produto não encontrado');
        }
      }
    } catch {
      toast.error('Erro ao buscar produto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!product || !calculatedNutrition) return;
    
    // Salvar produto para uso futuro se marcado
    if (saveForFuture && !isCustomProduct) {
      try {
        await saveProduct({
          barcode: product.code,
          name: product.name,
          brand: product.brand || null,
          image_url: product.imageUrl || null,
          calories: product.nutrition.calories,
          protein: product.nutrition.protein,
          carbs: product.nutrition.carbs,
          fat: product.nutrition.fat,
          saturated_fat: product.nutrition.saturatedFat || 0,
          trans_fat: product.nutrition.transFat || 0,
          fiber: product.nutrition.fiber || 0,
          sodium: product.nutrition.sodium || 0,
          reference_quantity: totalProductWeight || 100,
          reference_unit: 'g',
        });
        toast.success('Produto salvo para próximas vezes!', { icon: '⭐' });
      } catch (err) {
        console.error('Erro ao salvar produto:', err);
        toast.error('Erro ao salvar produto');
      }
    }
    
    onProductFound({ ...product, nutrition: calculatedNutrition }, effectiveGrams, false, 0);
  };

  const getPortionLabel = () => {
    const option = PORTION_OPTIONS.find(o => Math.abs(o.value - portionMultiplier) < 0.01);
    return option ? option.label : portionMultiplier.toFixed(2);
  };

  const handleLiquidConfirm = async (mlConsumed: number) => {
    if (!product) return;
    
    const nutritionForVolume = calculateNutritionForPortion(product.nutrition, mlConsumed);
    
    // Salvar produto líquido
    if (saveForFuture && !isCustomProduct) {
      try {
        await saveProduct({
          barcode: product.code,
          name: product.name,
          brand: product.brand || null,
          image_url: product.imageUrl || null,
          calories: product.nutrition.calories,
          protein: product.nutrition.protein,
          carbs: product.nutrition.carbs,
          fat: product.nutrition.fat,
          saturated_fat: product.nutrition.saturatedFat || 0,
          trans_fat: product.nutrition.transFat || 0,
          fiber: product.nutrition.fiber || 0,
          sodium: product.nutrition.sodium || 0,
          reference_quantity: 100,
          reference_unit: 'ml',
        });
        toast.success('Produto salvo!', { icon: '⭐' });
      } catch (err) {
        console.error('Erro ao salvar produto:', err);
      }
    }
    
    onProductFound({ ...product, nutrition: nutritionForVolume }, mlConsumed, true, mlConsumed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm animate-scale-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card p-6 shadow-elevated animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Escanear Código de Barras</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {!product ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                placeholder="Digite o código de barras"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isLoading || !barcode.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
              </Button>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-muted p-8 text-center">
              <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Digite o código de barras para buscar informações nutricionais
              </p>
            </div>
          </div>
        ) : showLiquidDialog ? (
          <LiquidConsumptionDialog
            productName={product.name}
            defaultMl={liquidVolumeMl}
            onConfirm={handleLiquidConfirm}
            onCancel={() => setShowLiquidDialog(false)}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              {product.imageUrl && (
                <img src={product.imageUrl} alt={product.name} className="h-20 w-20 rounded-xl object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{product.name}</h3>
                  {isCustomProduct && <Star className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                </div>
                {product.brand && <p className="text-sm text-muted-foreground truncate">{product.brand}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {isCustomProduct ? 'Produto salvo' : 'Valores por 100g'}
                  {totalProductWeight && ` • Peso total: ${totalProductWeight}g`}
                </p>
              </div>
            </div>

            {isLiquid && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowLiquidDialog(true)}
              >
                🥤 É uma bebida - Informar quantidade consumida
              </Button>
            )}

            {!isLiquid && (
              <div className="space-y-3">
                {/* Toggle modo de entrada se temos peso total */}
                {totalProductWeight && (
                  <div className="flex gap-2">
                    <Button
                      variant={inputMode === 'proportion' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setInputMode('proportion')}
                    >
                      Por porção
                    </Button>
                    <Button
                      variant={inputMode === 'grams' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setInputMode('grams')}
                    >
                      Em gramas
                    </Button>
                  </div>
                )}

                {inputMode === 'proportion' && totalProductWeight ? (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Quanto consumiu do produto?</label>
                    
                    {/* Mostra porção e peso calculado */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                      <div>
                        <span className="text-2xl font-bold">{getPortionLabel()}</span>
                        <span className="text-sm text-muted-foreground ml-2">do produto</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold">{effectiveGrams}</span>
                        <span className="text-sm text-muted-foreground ml-1">g</span>
                      </div>
                    </div>

                    {/* Botões de porção rápida */}
                    <div className="flex flex-wrap gap-1.5">
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

                    <p className="text-xs text-center text-muted-foreground">
                      Peso total do produto: {totalProductWeight}g
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantidade consumida (g)</label>
                    <Input
                      type="number"
                      value={portionGrams}
                      onChange={(e) => setPortionGrams(Number(e.target.value))}
                      min={1}
                      max={2000}
                    />
                  </div>
                )}
              </div>
            )}

            {calculatedNutrition && (
              <NutritionDisplay nutrition={calculatedNutrition} showAll />
            )}

            {!isCustomProduct && (
              <label className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveForFuture}
                  onChange={(e) => setSaveForFuture(e.target.checked)}
                  className="rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Salvar para próximas vezes</p>
                  <p className="text-xs text-muted-foreground">O produto será lembrado com esses valores</p>
                </div>
                <Star className="h-4 w-4 text-amber-500" />
              </label>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setProduct(null)}>
                Voltar
              </Button>
              <Button variant="gradient" className="flex-1" onClick={handleAddProduct}>
                <Check className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
