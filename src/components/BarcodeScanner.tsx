import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Camera, Loader2 } from 'lucide-react';
import { BarcodeProduct } from '@/types/nutrition';
import { fetchProductByBarcode, calculateNutritionForPortion } from '@/lib/openFoodFacts';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onProductFound: (product: BarcodeProduct, portionGrams: number) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onProductFound, onClose }: BarcodeScannerProps) {
  const [barcode, setBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [portionGrams, setPortionGrams] = useState(100);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async () => {
    if (!barcode.trim()) return;

    setIsLoading(true);
    try {
      const result = await fetchProductByBarcode(barcode.trim());
      if (result) {
        setProduct(result);
        toast.success('Produto encontrado!');
      } else {
        toast.error('Produto não encontrado');
      }
    } catch {
      toast.error('Erro ao buscar produto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = () => {
    if (!product) return;

    const adjustedNutrition = calculateNutritionForPortion(
      product.nutrition,
      portionGrams
    );

    onProductFound(
      { ...product, nutrition: adjustedNutrition },
      portionGrams
    );
  };

  const calculatedNutrition = product
    ? calculateNutritionForPortion(product.nutrition, portionGrams)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm animate-scale-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card p-6 shadow-elevated animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Escanear Código de Barras</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {!product ? (
          <>
            {/* Barcode Input */}
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
                <Button
                  onClick={handleSearch}
                  disabled={isLoading || !barcode.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Buscar'
                  )}
                </Button>
              </div>

              <div className="rounded-2xl border-2 border-dashed border-muted p-8 text-center">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Digite o código de barras do produto para buscar informações nutricionais
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Product Found */}
            <div className="space-y-4">
              {/* Product Info */}
              <div className="flex gap-4">
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{product.name}</h3>
                  {product.brand && (
                    <p className="text-sm text-muted-foreground">{product.brand}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Valores por 100g
                  </p>
                </div>
              </div>

              {/* Portion Input */}
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

              {/* Calculated Nutrition */}
              {calculatedNutrition && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-primary/10 p-3 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {calculatedNutrition.calories}
                    </p>
                    <p className="text-xs text-muted-foreground">kcal</p>
                  </div>
                  <div className="rounded-xl bg-accent/10 p-3 text-center">
                    <p className="text-2xl font-bold text-accent">
                      {calculatedNutrition.protein}g
                    </p>
                    <p className="text-xs text-muted-foreground">proteína</p>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {calculatedNutrition.carbs}g
                    </p>
                    <p className="text-xs text-muted-foreground">carboidratos</p>
                  </div>
                  <div className="rounded-xl bg-pink-500/10 p-3 text-center">
                    <p className="text-2xl font-bold text-pink-600">
                      {calculatedNutrition.fat}g
                    </p>
                    <p className="text-xs text-muted-foreground">gordura</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setProduct(null)}
                >
                  Voltar
                </Button>
                <Button
                  variant="gradient"
                  className="flex-1"
                  onClick={handleAddProduct}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
