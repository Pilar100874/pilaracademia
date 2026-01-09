import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, Droplets, Boxes, Plus, Play, Trash2, Edit, Loader2 } from 'lucide-react';
import { useCustomProducts, CustomProduct } from '@/hooks/useCustomProducts';
import { useFoodKits, FoodKit } from '@/hooks/useFoodKits';
import { ProductConsumptionDialog } from './ProductConsumptionDialog';
import { KitFormDialog } from './KitFormDialog';
import { toast } from 'sonner';

interface ProductSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProductSearch({ isOpen, onClose }: ProductSearchProps) {
  const { products, isLoading } = useCustomProducts();
  const { kits, isLoading: isLoadingKits, launchKit, deleteKit, refetch: refetchKits } = useFoodKits();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<CustomProduct | null>(null);
  const [showConsumption, setShowConsumption] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'kits'>('products');
  const [showKitForm, setShowKitForm] = useState(false);
  const [editingKit, setEditingKit] = useState<FoodKit | null>(null);
  const [launchingKitId, setLaunchingKitId] = useState<string | null>(null);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredKits = kits.filter((k) =>
    k.name.toLowerCase().includes(search.toLowerCase()) ||
    (k.description && k.description.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedProduct(null);
      setShowConsumption(false);
      setActiveTab('products');
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

  const handleLaunchKit = async (kitId: string) => {
    setLaunchingKitId(kitId);
    try {
      await launchKit(kitId);
      onClose();
    } catch (error) {
      console.error('Error launching kit:', error);
    } finally {
      setLaunchingKitId(null);
    }
  };

  const handleDeleteKit = async (kit: FoodKit) => {
    if (confirm(`Excluir kit "${kit.name}"?`)) {
      await deleteKit.mutateAsync(kit.id);
    }
  };

  const handleEditKit = (kit: FoodKit) => {
    setEditingKit(kit);
    setShowKitForm(true);
  };

  const handleKitFormClose = () => {
    setShowKitForm(false);
    setEditingKit(null);
    refetchKits();
  };

  return (
    <>
      <Dialog open={isOpen && !showConsumption && !showKitForm} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'products' | 'kits')} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="products" className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                Produtos
              </TabsTrigger>
              <TabsTrigger value="kits" className="flex items-center gap-1">
                <Boxes className="h-4 w-4" />
                Kits
              </TabsTrigger>
            </TabsList>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === 'products' ? "Buscar produto..." : "Buscar kit..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            <TabsContent value="products" className="flex-1 overflow-y-auto mt-4 min-h-[200px] max-h-[400px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm font-medium">Carregando produtos...</p>
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
            </TabsContent>

            <TabsContent value="kits" className="flex-1 overflow-y-auto mt-4 min-h-[200px] max-h-[400px]">
              <div className="mb-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEditingKit(null);
                    setShowKitForm(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Novo Kit
                </Button>
              </div>

              {isLoadingKits ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm font-medium">Carregando kits...</p>
                </div>
              ) : filteredKits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Boxes className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">
                    {search ? 'Nenhum kit encontrado' : 'Nenhum kit criado'}
                  </p>
                  <p className="text-xs mt-1">
                    Crie kits para lançar múltiplos alimentos de uma vez
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredKits.map((kit) => (
                    <div
                      key={kit.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Boxes className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{kit.name}</p>
                        {kit.description && (
                          <p className="text-xs text-muted-foreground truncate">{kit.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditKit(kit)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteKit(kit)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleLaunchKit(kit.id)}
                          disabled={launchingKitId === kit.id}
                        >
                          {launchingKitId === kit.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="h-3 w-3" />
                              Lançar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ProductConsumptionDialog
        product={selectedProduct}
        open={showConsumption}
        onOpenChange={handleConsumptionClose}
        onSuccess={handleConsumptionSuccess}
      />

      <KitFormDialog
        open={showKitForm}
        onOpenChange={handleKitFormClose}
        editingKit={editingKit}
        onSaved={handleKitFormClose}
      />
    </>
  );
}
