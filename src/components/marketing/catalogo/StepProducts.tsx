import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Search, Package, X, LayoutGrid, Grid2X2, Grid3X3, List, Loader2, Layers } from 'lucide-react';
import { CatalogProduct, CatalogPage, LAYOUT_OPTIONS, ProductGroup } from './types';
import { useCatalogProducts } from './useCatalogProducts';
import { cn } from '@/lib/utils';

interface StepProductsProps {
  page: CatalogPage;
  onChange: (page: CatalogPage) => void;
  estabelecimentoId: string | null;
  showPrices: boolean;
  showCodes: boolean;
}

export const StepProducts: React.FC<StepProductsProps> = ({
  page,
  onChange,
  estabelecimentoId,
  showPrices,
  showCodes,
}) => {
  const {
    products,
    categories,
    groups,
    loading,
    selectedCategory,
    setSelectedCategory,
    selectedGroup,
    setSelectedGroup,
    searchTerm,
    setSearchTerm,
  } = useCatalogProducts(estabelecimentoId);

  const selectedProducts = page.products || [];
  const selectedIds = new Set(selectedProducts.map((p) => p.id));
  const groupByCategory = page.groupByCategory ?? true;

  const toggleProduct = (product: CatalogProduct) => {
    if (selectedIds.has(product.id)) {
      onChange({
        ...page,
        products: selectedProducts.filter((p) => p.id !== product.id),
      });
    } else {
      onChange({
        ...page,
        products: [...selectedProducts, product],
      });
    }
  };

  const removeProduct = (productId: string) => {
    onChange({
      ...page,
      products: selectedProducts.filter((p) => p.id !== productId),
    });
  };

  const selectAll = () => {
    const allProducts = [...selectedProducts];
    products.forEach((p) => {
      if (!selectedIds.has(p.id)) {
        allProducts.push(p);
      }
    });
    onChange({ ...page, products: allProducts });
  };

  const clearSelection = () => {
    onChange({ ...page, products: [] });
  };

  const formatPrice = (price?: number) => {
    if (!price) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getLayoutIcon = (layout: string) => {
    switch (layout) {
      case 'grid-2': return Grid2X2;
      case 'grid-3': return Grid3X3;
      case 'grid-4': return LayoutGrid;
      case 'list': return List;
      default: return Grid3X3;
    }
  };

  // Group selected products by grupo_nome
  const getGroupedProducts = (): ProductGroup[] => {
    const groupMap = new Map<string, { products: CatalogProduct[]; descritivo_catalogo?: string }>();
    
    selectedProducts.forEach(product => {
      const groupName = product.grupo_nome || 'Outros';
      const groupId = product.grupo_id || 'outros';
      const key = `${groupId}__${groupName}`;
      
      if (!groupMap.has(key)) {
        groupMap.set(key, { 
          products: [], 
          descritivo_catalogo: product.grupo_descritivo_catalogo 
        });
      }
      groupMap.get(key)!.products.push(product);
    });

    return Array.from(groupMap.entries()).map(([key, data]) => {
      const [id, nome] = key.split('__');
      return { 
        id, 
        nome, 
        products: data.products,
        descritivo_catalogo: data.descritivo_catalogo
      };
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  };

  const groupedProducts = getGroupedProducts();
  const LayoutIcon = getLayoutIcon(page.layout || 'grid-3');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Product Selection */}
      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Selecionar Produtos</h3>
          <p className="text-sm text-muted-foreground">
            Escolha os produtos para incluir no catálogo
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar produtos..."
            className="pl-11 h-11 rounded-xl"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select
            value={selectedCategory || 'all'}
            onValueChange={(v) => setSelectedCategory(v === 'all' ? null : v)}
          >
            <SelectTrigger className="flex-1 h-10 rounded-lg">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedGroup || 'all'}
            onValueChange={(v) => setSelectedGroup(v === 'all' ? null : v)}
          >
            <SelectTrigger className="flex-1 h-10 rounded-lg">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos grupos</SelectItem>
              {groups.map((grp) => (
                <SelectItem key={grp.id} value={grp.id}>
                  {grp.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll} className="rounded-lg text-xs">
            Selecionar visíveis
          </Button>
          <Button variant="outline" size="sm" onClick={clearSelection} className="rounded-lg text-xs">
            Limpar seleção
          </Button>
        </div>

        {/* Product List */}
        <ScrollArea className="h-[420px] rounded-xl border bg-muted/20">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all",
                    selectedIds.has(product.id)
                      ? "bg-primary/10 ring-1 ring-primary/30"
                      : "bg-background hover:bg-muted"
                  )}
                  onClick={() => toggleProduct(product)}
                >
                  <Checkbox
                    checked={selectedIds.has(product.id)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  {product.foto_url ? (
                    <img
                      src={product.foto_url}
                      alt={product.nome}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {product.grupo_nome && (
                        <span className="text-xs text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
                          {product.grupo_nome}
                        </span>
                      )}
                      {showCodes && product.codigo && (
                        <span className="text-xs text-muted-foreground">{product.codigo}</span>
                      )}
                      {showPrices && product.preco_tabela && (
                        <span className="text-xs font-semibold text-primary">
                          {formatPrice(product.preco_tabela)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Selected Products & Layout */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">Selecionados</h3>
            <p className="text-sm text-muted-foreground">
              {selectedProducts.length} produto{selectedProducts.length !== 1 ? 's' : ''} em {groupedProducts.length} grupo{groupedProducts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Select
            value={page.layout || 'grid-3'}
            onValueChange={(v) => onChange({ ...page, layout: v as CatalogPage['layout'] })}
          >
            <SelectTrigger className="w-[140px] h-10 rounded-lg">
              <div className="flex items-center gap-2">
                <LayoutIcon className="h-4 w-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {LAYOUT_OPTIONS.map((opt) => {
                const Icon = getLayoutIcon(opt.value);
                return (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {opt.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Group by Category Toggle */}
        <div 
          className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
          onClick={() => onChange({ ...page, groupByCategory: !groupByCategory })}
        >
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Separar por grupos</p>
              <p className="text-xs text-muted-foreground">Organiza produtos por grupos no PDF</p>
            </div>
          </div>
          <Switch
            checked={groupByCategory}
            onCheckedChange={(v) => onChange({ ...page, groupByCategory: v })}
          />
        </div>

        {/* Grouped Selected Products */}
        <ScrollArea className="h-[340px] rounded-xl border bg-muted/20">
          {selectedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Selecione produtos à esquerda</p>
            </div>
          ) : (
            <div className="p-3 space-y-4">
              {groupedProducts.map((group) => (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center gap-2 px-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {group.nome}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({group.products.length})
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-1">
                    {group.products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-2 bg-background rounded-lg group"
                      >
                        {product.foto_url ? (
                          <img
                            src={product.foto_url}
                            alt={product.nome}
                            className="w-9 h-9 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="flex-1 text-sm truncate">{product.nome}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => removeProduct(product.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Layout Preview */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Preview do Layout
          </Label>
          <div className="rounded-xl border bg-background p-4">
            <div
              className={cn(
                "grid gap-2",
                page.layout === 'grid-2' && "grid-cols-2",
                page.layout === 'grid-3' && "grid-cols-3",
                page.layout === 'grid-4' && "grid-cols-4",
                page.layout === 'list' && "grid-cols-1"
              )}
            >
              {Array.from({ length: Math.min(selectedProducts.length || 6, 6) }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "bg-muted rounded-lg flex items-center justify-center",
                    page.layout === 'list' ? "h-12" : "aspect-square"
                  )}
                >
                  <Package className="h-4 w-4 text-muted-foreground/50" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
