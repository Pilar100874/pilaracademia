import { useState } from 'react';
import { Package, Search, Pencil, Trash2, ChevronLeft, Barcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BottomNav } from '@/components/BottomNav';
import { useCustomProducts, CustomProduct } from '@/hooks/useCustomProducts';

import { useNavigate } from 'react-router-dom';

export function ProductsPage() {
  const navigate = useNavigate();
  const { products, isLoading, updateProduct, deleteProduct } = useCustomProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<CustomProduct | null>(null);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editCalories, setEditCalories] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editFat, setEditFat] = useState('');
  const [editFiber, setEditFiber] = useState('');
  const [editSodium, setEditSodium] = useState('');
  const [editSaturatedFat, setEditSaturatedFat] = useState('');
  const [editTransFat, setEditTransFat] = useState('');

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.includes(searchTerm) ||
    (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEdit = (product: CustomProduct) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditBrand(product.brand || '');
    setEditCalories(product.calories.toString());
    setEditProtein(product.protein.toString());
    setEditCarbs(product.carbs.toString());
    setEditFat(product.fat.toString());
    setEditFiber((product.fiber || 0).toString());
    setEditSodium((product.sodium || 0).toString());
    setEditSaturatedFat((product.saturated_fat || 0).toString());
    setEditTransFat((product.trans_fat || 0).toString());
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    try {
      await updateProduct(editingProduct.id, {
        name: editName,
        brand: editBrand || null,
        calories: Number(editCalories) || 0,
        protein: Number(editProtein) || 0,
        carbs: Number(editCarbs) || 0,
        fat: Number(editFat) || 0,
        fiber: Number(editFiber) || 0,
        sodium: Number(editSodium) || 0,
        saturated_fat: Number(editSaturatedFat) || 0,
        trans_fat: Number(editTransFat) || 0,
      });
      setEditingProduct(null);
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <header className="sticky top-0 z-30 glass border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Meus Produtos
            </h1>
            <p className="text-xs text-muted-foreground">{products.length} produto(s) salvos</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, marca ou código..."
            className="pl-10"
          />
        </div>

        {/* Lista de produtos */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Barcode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto salvo ainda'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Ao escanear um código de barras e ajustar os valores, o produto será salvo aqui
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => (
              <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl bg-card shadow-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary overflow-hidden flex-shrink-0">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <Barcode className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  {product.brand && (
                    <p className="text-xs text-muted-foreground truncate">{product.brand}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {product.calories} kcal
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      /{product.reference_quantity}{product.reference_unit}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => handleEdit(product)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog para editar */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Produto
            </DialogTitle>
          </DialogHeader>
          
          {editingProduct && (
            <div className="space-y-4 pt-2">
              <div className="p-2 rounded-lg bg-secondary/50 text-center">
                <p className="text-xs text-muted-foreground">Código de barras</p>
                <p className="font-mono text-sm">{editingProduct.barcode}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nome</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Marca</label>
                <Input value={editBrand} onChange={(e) => setEditBrand(e.target.value)} placeholder="Opcional" />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-1">Informações Nutricionais</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Por {editingProduct.reference_quantity}{editingProduct.reference_unit}
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Calorias</label>
                    <Input type="number" value={editCalories} onChange={(e) => setEditCalories(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Proteína (g)</label>
                    <Input type="number" value={editProtein} onChange={(e) => setEditProtein(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Carboidratos (g)</label>
                    <Input type="number" value={editCarbs} onChange={(e) => setEditCarbs(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Gorduras (g)</label>
                    <Input type="number" value={editFat} onChange={(e) => setEditFat(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Fibras (g)</label>
                    <Input type="number" value={editFiber} onChange={(e) => setEditFiber(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Sódio (mg)</label>
                    <Input type="number" value={editSodium} onChange={(e) => setEditSodium(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">G. Saturada (g)</label>
                    <Input type="number" value={editSaturatedFat} onChange={(e) => setEditSaturatedFat(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">G. Trans (g)</label>
                    <Input type="number" value={editTransFat} onChange={(e) => setEditTransFat(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingProduct(null)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSaveEdit}>
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
