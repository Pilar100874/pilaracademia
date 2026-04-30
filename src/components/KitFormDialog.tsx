import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Plus, Trash2, Search, Loader2, Edit2, Leaf } from 'lucide-react';
import { useFoodKits, FoodKit, FoodKitItem } from '@/hooks/useFoodKits';
import { useCustomProducts, CustomProduct } from '@/hooks/useCustomProducts';
import { DefaultProductImage } from '@/components/DefaultProductImage';
import { KitItemQuantityDialog } from '@/components/KitItemQuantityDialog';
import { NATURAL_PRODUCTS, naturalToCustomProduct, getCategoryInfo, NATURAL_PRODUCT_CATEGORIES } from '@/data/naturalProducts';
import { toast } from 'sonner';
import { FieldError } from '@/components/FieldError';
import { useFieldError, validateRequired } from '@/lib/formValidation';

interface KitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingKit?: FoodKit | null;
  onSaved?: () => void;
}

interface KitItemDraft {
  id?: string;
  product: CustomProduct;
  quantity: number;
  unit: string;
}

export function KitFormDialog({ open, onOpenChange, editingKit, onSaved }: KitFormDialogProps) {
  const { createKit, updateKit, addItemToKit, removeItemFromKit, updateKitItem, getKitWithItems } = useFoodKits();
  const { products } = useCustomProducts();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<KitItemDraft[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchTab, setProductSearchTab] = useState<'custom' | 'natural'>('custom');
  const [selectedNaturalCategory, setSelectedNaturalCategory] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingKit, setIsLoadingKit] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const { errorOf, setError, clearError, clearIf } = useFieldError();

  // Load existing kit data
  useEffect(() => {
    if (open && editingKit) {
      setIsLoadingKit(true);
      setName(editingKit.name);
      setDescription(editingKit.description || '');
      
      getKitWithItems(editingKit.id).then(kitWithItems => {
        if (kitWithItems) {
          const draftItems: KitItemDraft[] = kitWithItems.items
            .filter(item => item.product)
            .map(item => ({
              id: item.id,
              product: item.product!,
              quantity: item.quantity,
              unit: item.unit,
            }));
          setItems(draftItems);
        }
        setIsLoadingKit(false);
      }).catch(() => {
        setIsLoadingKit(false);
      });
    } else if (open) {
      setName('');
      setDescription('');
      setItems([]);
    }
  }, [open, editingKit]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNaturalProducts = useMemo(() => {
    let filtered = NATURAL_PRODUCTS;
    
    if (selectedNaturalCategory) {
      filtered = filtered.filter(p => p.category === selectedNaturalCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [searchQuery, selectedNaturalCategory]);

  const handleAddNaturalProduct = (naturalProduct: typeof NATURAL_PRODUCTS[0]) => {
    const converted = naturalToCustomProduct(naturalProduct);
    
    // Check if already in kit
    const existing = items.find(item => item.product.id === converted.id);
    if (existing) {
      toast.info('Alimento já está no kit');
      return;
    }

    setItems([...items, {
      product: converted,
      quantity: 100,
      unit: converted.is_liquid ? 'ml' : 'g',
    }]);
    setShowProductSearch(false);
    setSearchQuery('');
  };

  const handleAddProduct = (product: CustomProduct) => {
    const existing = items.find(item => item.product.id === product.id);
    if (existing) {
      toast.info('Produto já está no kit');
      return;
    }

    // Use package weight as default quantity (same logic as ProductConsumptionDialog)
    let defaultQuantity: number;
    if (product.is_liquid) {
      defaultQuantity = product.package_volume_ml || product.reference_quantity || 100;
    } else {
      defaultQuantity = product.package_total_weight || product.reference_quantity || 100;
    }

    setItems([...items, {
      product,
      quantity: defaultQuantity,
      unit: product.is_liquid ? 'ml' : 'g',
    }]);
    setShowProductSearch(false);
    setSearchQuery('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, quantity: number, unit: string) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    newItems[index].unit = unit;
    setItems(newItems);
  };

  const handleEditItemQuantity = (index: number) => {
    setEditingItemIndex(index);
  };

  const handleQuantityConfirm = (quantity: number, unit: string) => {
    if (editingItemIndex !== null) {
      handleUpdateQuantity(editingItemIndex, quantity, unit);
      setEditingItemIndex(null);
    }
  };

  const handleSave = async () => {
    const first = validateRequired([
      { key: 'name', ref: nameRef, valid: !!name.trim(), message: 'Informe o nome do kit' },
      { key: 'items', ref: itemsRef, valid: items.length > 0, message: 'Adicione pelo menos um produto ao kit' },
    ]);
    if (first) {
      setError(first.key, first.message);
      return;
    }
    clearError();

    setIsSaving(true);

    try {
      if (editingKit) {
        // Update existing kit
        await updateKit.mutateAsync({
          id: editingKit.id,
          name: name.trim(),
          description: description.trim(),
        });

        // Get current items from DB
        const currentKit = await getKitWithItems(editingKit.id);
        const currentItemIds = currentKit?.items.map(i => i.id) || [];
        const newItemIds = items.filter(i => i.id).map(i => i.id!);

        // Remove items that were deleted
        for (const itemId of currentItemIds) {
          if (!newItemIds.includes(itemId)) {
            await removeItemFromKit.mutateAsync(itemId);
          }
        }

        // Update or add items
        for (const item of items) {
          if (item.id) {
            await updateKitItem.mutateAsync({
              itemId: item.id,
              quantity: item.quantity,
              unit: item.unit,
            });
          } else {
            await addItemToKit.mutateAsync({
              kitId: editingKit.id,
              productId: item.product.id,
              quantity: item.quantity,
              unit: item.unit,
            });
          }
        }
      } else {
        // Create new kit
        const newKit = await createKit.mutateAsync({
          name: name.trim(),
          description: description.trim(),
        });

        // Add items
        for (const item of items) {
          await addItemToKit.mutateAsync({
            kitId: newKit.id,
            productId: item.product.id,
            quantity: item.quantity,
            unit: item.unit,
          });
        }
      }

      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving kit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate totals
  const totals = items.reduce((acc, item) => {
    const product = item.product;
    const refQty = product.reference_quantity || 100;
    const multiplier = item.quantity / refQty;

    return {
      calories: acc.calories + (product.calories * multiplier),
      protein: acc.protein + (product.protein * multiplier),
      carbs: acc.carbs + (product.carbs * multiplier),
      fat: acc.fat + (product.fat * multiplier),
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {editingKit ? 'Editar Kit' : 'Criar Kit de Alimentos'}
          </DialogTitle>
        </DialogHeader>

        {isLoadingKit ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome do Kit *</label>
              <Input
                ref={nameRef}
                value={name}
                onChange={(e) => { setName(e.target.value); clearIf('name'); }}
                placeholder="Ex: Café da manhã, Lanche da tarde..."
                aria-invalid={!!errorOf('name')}
              />
              <FieldError message={errorOf('name')} />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Descrição</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
                rows={2}
              />
            </div>

            <div className="border-t pt-4" ref={itemsRef}>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Produtos do Kit</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowProductSearch(!showProductSearch); clearIf('items'); }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              <FieldError message={errorOf('items')} className="mb-2" />

              {showProductSearch && (
                <div className="mb-4 p-3 bg-secondary/50 rounded-lg space-y-3">
                  <Tabs value={productSearchTab} onValueChange={(v) => setProductSearchTab(v as 'custom' | 'natural')}>
                    <TabsList className="grid w-full grid-cols-2 h-8">
                      <TabsTrigger value="custom" className="text-xs gap-1">
                        <Package className="h-3 w-3" />
                        Produtos
                      </TabsTrigger>
                      <TabsTrigger value="natural" className="text-xs gap-1">
                        <Leaf className="h-3 w-3" />
                        Naturais
                      </TabsTrigger>
                    </TabsList>

                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={productSearchTab === 'custom' ? "Buscar produto..." : "Buscar alimento natural..."}
                        className="pl-9 h-9"
                      />
                    </div>

                    <TabsContent value="custom" className="mt-2">
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {filteredProducts.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            {products.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'}
                          </p>
                        ) : (
                          filteredProducts.slice(0, 10).map(product => (
                            <button
                              key={product.id}
                              onClick={() => handleAddProduct(product)}
                              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-background transition-colors text-left"
                            >
                              <div className="h-8 w-8 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                                {product.image_url ? (
                                  <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <DefaultProductImage isLiquid={product.is_liquid} className="h-8 w-8" iconClassName="h-4 w-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {product.calories} kcal / {product.reference_quantity}{product.is_liquid ? 'ml' : 'g'}
                                </p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="natural" className="mt-2">
                      {/* Category filter */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        <button
                          onClick={() => setSelectedNaturalCategory(null)}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            selectedNaturalCategory === null 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-background hover:bg-background/80'
                          }`}
                        >
                          Todos
                        </button>
                        {NATURAL_PRODUCT_CATEGORIES.slice(0, 5).map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedNaturalCategory(cat.id)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                              selectedNaturalCategory === cat.id 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-background hover:bg-background/80'
                            }`}
                          >
                            {cat.emoji}
                          </button>
                        ))}
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {filteredNaturalProducts.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Nenhum alimento encontrado
                          </p>
                        ) : (
                          filteredNaturalProducts.slice(0, 10).map(natural => {
                            const categoryInfo = getCategoryInfo(natural.category);
                            return (
                              <button
                                key={natural.id}
                                onClick={() => handleAddNaturalProduct(natural)}
                                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-background transition-colors text-left"
                              >
                                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-lg flex-shrink-0">
                                  {categoryInfo?.emoji || '🍽️'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{natural.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {natural.calories} kcal / 100{natural.is_liquid ? 'ml' : 'g'}
                                  </p>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {items.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum produto adicionado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg"
                    >
                      <div className="h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                        {item.product.image_url ? (
                          <img src={item.product.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <DefaultProductImage isLiquid={item.product.is_liquid} className="h-10 w-10" iconClassName="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(item.product.calories * (item.quantity / (item.product.reference_quantity || 100)))} kcal
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 gap-1"
                        onClick={() => handleEditItemQuantity(index)}
                      >
                        <span className="font-medium">{item.quantity}</span>
                        <span className="text-muted-foreground">{item.unit}</span>
                        <Edit2 className="h-3 w-3 ml-1" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {items.length > 0 && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium mb-2">Total do Kit:</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-primary">{Math.round(totals.calories)}</p>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{Math.round(totals.protein)}g</p>
                      <p className="text-xs text-muted-foreground">prot</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{Math.round(totals.carbs)}g</p>
                      <p className="text-xs text-muted-foreground">carb</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{Math.round(totals.fat)}g</p>
                      <p className="text-xs text-muted-foreground">gord</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                variant="gradient"
                className="flex-1"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  editingKit ? 'Salvar' : 'Criar Kit'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Quantity edit dialog */}
    {editingItemIndex !== null && items[editingItemIndex] && (
      <KitItemQuantityDialog
        product={items[editingItemIndex].product}
        currentQuantity={items[editingItemIndex].quantity}
        open={editingItemIndex !== null}
        onOpenChange={(open) => !open && setEditingItemIndex(null)}
        onConfirm={handleQuantityConfirm}
      />
    )}
  </>
  );
}
