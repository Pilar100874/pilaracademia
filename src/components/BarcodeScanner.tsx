import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Camera, Loader2, Check, Star } from 'lucide-react';
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

export function BarcodeScanner({ onProductFound, onClose }: BarcodeScannerProps) {
  const { getProductByBarcode, saveProduct } = useCustomProducts();
  const [barcode, setBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [portionGrams, setPortionGrams] = useState(100);
  const [calculatedNutrition, setCalculatedNutrition] = useState<NutritionData | null>(null);
  const [isLiquid, setIsLiquid] = useState(false);
  const [liquidVolumeMl, setLiquidVolumeMl] = useState(0);
  const [showLiquidDialog, setShowLiquidDialog] = useState(false);
  const [saveForFuture, setSaveForFuture] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (product) {
      setCalculatedNutrition(calculateNutritionForPortion(product.nutrition, portionGrams));
    }
  }, [product, portionGrams]);

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
        
        setProduct({
          code: customProduct.barcode,
          name: customProduct.name,
          brand: customProduct.brand || undefined,
          imageUrl: customProduct.image_url || undefined,
          nutrition,
          servingSize: `${customProduct.reference_quantity}${customProduct.reference_unit}`,
        });
        setIsCustomProduct(true);
        setPortionGrams(customProduct.reference_quantity);
        toast.success('Produto encontrado (salvo)!', { icon: '⭐' });
      } else {
        // Buscar do OpenFoodFacts
        const result = await fetchProductByBarcode(barcode.trim());
        if (result) {
          setProduct(result);
          setIsCustomProduct(false);
          
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
          reference_quantity: 100,
          reference_unit: 'g',
        });
        toast.success('Produto salvo para próximas vezes!', { icon: '⭐' });
      } catch (err) {
        console.error('Erro ao salvar produto:', err);
        toast.error('Erro ao salvar produto');
      }
    }
    
    onProductFound({ ...product, nutrition: calculatedNutrition }, portionGrams, false, 0);
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
