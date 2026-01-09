import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Package, Droplets } from 'lucide-react';
import { useCustomProducts, CustomProduct } from '@/hooks/useCustomProducts';
import { ProductConsumptionDialog } from './ProductConsumptionDialog';

interface ProductSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProductSearch({ isOpen, onClose }: ProductSearchProps) {
  const { products, isLoading } = useCustomProducts();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<CustomProduct | null>(null);
  const [showConsumption, setShowConsumption] = useState(false);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedProduct(null);
      setShowConsumption(false);
    }
  }, [isOpen]);

  const handleSelectProduct = (product: CustomProduct) => {
    setSelectedProduct(product);
    setShowConsumption(true);
  };

  const handleConsumptionClose = (open: boolean) => {
    if (!open) {
      setShowConsumption(false);
      setSelectedProduct(null);
    }
  };

  const handleConsumptionSuccess = () => {
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen && !showConsumption} onOpenChange={(open) => !open && onClose()}>
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
        </DialogContent>
      </Dialog>

      <ProductConsumptionDialog
        product={selectedProduct}
        open={showConsumption}
        onOpenChange={handleConsumptionClose}
        onSuccess={handleConsumptionSuccess}
      />
    </>
  );
}