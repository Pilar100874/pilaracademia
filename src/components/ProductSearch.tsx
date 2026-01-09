import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Package, Plus, Minus } from 'lucide-react';
import { useCustomProducts, CustomProduct } from '@/hooks/useCustomProducts';
import { useFoodEntries } from '@/hooks/useFoodEntries';


interface ProductSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProductSearch({ isOpen, onClose }: ProductSearchProps) {
  const { products, isLoading } = useCustomProducts();
  const { addEntry } = useFoodEntries();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<CustomProduct | null>(null);
  const [quantity, setQuantity] = useState(1);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedProduct(null);
      setQuantity(1);
    }
  }, [isOpen]);

  const handleSelectProduct = (product: CustomProduct) => {
    setSelectedProduct(product);
    setQuantity(1);
  };

  const handleAddEntry = async () => {
    if (!selectedProduct) return;

    try {
      const multiplier = quantity;
      await addEntry({
        name: selectedProduct.name,
        nutrition: {
          calories: Math.round(selectedProduct.calories * multiplier),
          protein: Number((selectedProduct.protein * multiplier).toFixed(1)),
          carbs: Number((selectedProduct.carbs * multiplier).toFixed(1)),
          fat: Number((selectedProduct.fat * multiplier).toFixed(1)),
          fiber: selectedProduct.fiber ? Number((selectedProduct.fiber * multiplier).toFixed(1)) : undefined,
          saturatedFat: selectedProduct.saturated_fat ? Number((selectedProduct.saturated_fat * multiplier).toFixed(1)) : undefined,
          transFat: selectedProduct.trans_fat ? Number((selectedProduct.trans_fat * multiplier).toFixed(1)) : undefined,
          sodium: selectedProduct.sodium ? Math.round(selectedProduct.sodium * multiplier) : undefined,
        },
        quantity: selectedProduct.reference_quantity * multiplier,
        unit: selectedProduct.reference_unit,
        source: 'barcode',
        imageUrl: selectedProduct.image_url || undefined,
      });

      onClose();
    } catch (error) {
      console.error('Erro ao adicionar:', error);
    }
  };

  const getNutritionForQuantity = (value: number | null) => {
    if (value === null) return null;
    return Number((value * quantity).toFixed(1));
  };

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
                {filteredProducts.map((product) => (
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
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      {product.brand && (
                        <p className="text-xs text-muted-foreground truncate">{product.brand}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {product.calories} kcal / {product.reference_quantity}{product.reference_unit}
                      </p>
                    </div>
                  </button>
                ))}
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
                  <Package className="h-7 w-7 text-muted-foreground" />
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

            {/* Quantity selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantidade (porções)</label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(0.5, quantity - 0.5))}
                  disabled={quantity <= 0.5}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-bold">{quantity}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    × {selectedProduct.reference_quantity}{selectedProduct.reference_unit}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 0.5)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Total: {selectedProduct.reference_quantity * quantity}{selectedProduct.reference_unit}
              </p>
            </div>

            {/* Nutrition preview */}
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-sm font-medium mb-2">Informações Nutricionais</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calorias</span>
                  <span className="font-medium">{Math.round(selectedProduct.calories * quantity)} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Proteína</span>
                  <span className="font-medium">{getNutritionForQuantity(selectedProduct.protein)}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carboidratos</span>
                  <span className="font-medium">{getNutritionForQuantity(selectedProduct.carbs)}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gordura</span>
                  <span className="font-medium">{getNutritionForQuantity(selectedProduct.fat)}g</span>
                </div>
              </div>
            </div>

            <Button onClick={handleAddEntry} className="w-full">
              Adicionar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
