import { useState, useRef } from 'react';
import { Package, Search, Pencil, Trash2, ChevronLeft, Barcode, Plus, Droplets, Apple, Image, Filter, Upload, Loader2, ScanLine, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BottomNav } from '@/components/BottomNav';
import { useCustomProducts, CustomProduct } from '@/hooks/useCustomProducts';
import { useNavigate } from 'react-router-dom';
import { ImageZoomDialog } from '@/components/ImageZoomDialog';
import { WATER_IMAGE_URL } from '@/components/DefaultLiquidImage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ZxingScanner } from '@/components/ZxingScanner';
import { fetchProductByBarcode, isLiquidProduct } from '@/lib/openFoodFacts';
import { toast } from 'sonner';
import { ProductConsumptionDialog } from '@/components/ProductConsumptionDialog';

type FilterType = 'all' | 'solid' | 'liquid';

export function ProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, isLoading, saveProduct, updateProduct, deleteProduct } = useCustomProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<CustomProduct | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [consumingProduct, setConsumingProduct] = useState<CustomProduct | null>(null);
  
  // Form state (shared for add/edit)
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCalories, setFormCalories] = useState('');
  const [formProtein, setFormProtein] = useState('');
  const [formCarbs, setFormCarbs] = useState('');
  const [formFat, setFormFat] = useState('');
  const [formFiber, setFormFiber] = useState('');
  const [formSodium, setFormSodium] = useState('');
  const [formSaturatedFat, setFormSaturatedFat] = useState('');
  const [formTransFat, setFormTransFat] = useState('');
  const [formRefQuantity, setFormRefQuantity] = useState('100');
  const [formRefUnit, setFormRefUnit] = useState('g');
  const [formIsLiquid, setFormIsLiquid] = useState(false);
  const [formImageUrl, setFormImageUrl] = useState('');
  // Package info fields
  const [formPackageWeight, setFormPackageWeight] = useState('');
  const [formPackageUnits, setFormPackageUnits] = useState('');
  const [formPackageVolume, setFormPackageVolume] = useState('');

  // Filter products by search and type
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm) ||
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterType === 'all') return matchesSearch;
    if (filterType === 'liquid') return matchesSearch && p.is_liquid;
    if (filterType === 'solid') return matchesSearch && !p.is_liquid;
    return matchesSearch;
  });

  // Group products by type (only when filter is 'all')
  const solidProducts = filteredProducts.filter(p => !p.is_liquid);
  const liquidProducts = filteredProducts.filter(p => p.is_liquid);

  const resetForm = () => {
    setFormName('');
    setFormBrand('');
    setFormBarcode('');
    setFormCalories('');
    setFormProtein('');
    setFormCarbs('');
    setFormFat('');
    setFormFiber('');
    setFormSodium('');
    setFormSaturatedFat('');
    setFormTransFat('');
    setFormRefQuantity('100');
    setFormRefUnit('g');
    setFormIsLiquid(false);
    setFormImageUrl('');
    setImagePreview(null);
    setFormPackageWeight('');
    setFormPackageUnits('');
    setFormPackageVolume('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to storage
    const url = await handleImageUpload(file);
    if (url) {
      setFormImageUrl(url);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setShowBarcodeScanner(false);
    setIsSearchingBarcode(true);
    setFormBarcode(barcode);
    
    try {
      const product = await fetchProductByBarcode(barcode);
      
      if (product) {
        setFormName(product.name);
        setFormBrand(product.brand || '');
        setFormCalories(product.nutrition.calories.toString());
        setFormProtein(product.nutrition.protein.toString());
        setFormCarbs(product.nutrition.carbs.toString());
        setFormFat(product.nutrition.fat.toString());
        setFormFiber((product.nutrition.fiber || 0).toString());
        setFormSodium((product.nutrition.sodium || 0).toString());
        setFormSaturatedFat((product.nutrition.saturatedFat || 0).toString());
        setFormTransFat((product.nutrition.transFat || 0).toString());
        setFormRefQuantity('100');
        
        const isLiquid = isLiquidProduct(product);
        setFormIsLiquid(isLiquid);
        setFormRefUnit(isLiquid ? 'ml' : 'g');
        
        if (product.imageUrl) {
          setFormImageUrl(product.imageUrl);
          setImagePreview(product.imageUrl);
        }
        
        toast.success('Produto encontrado!', { description: product.name });
      } else {
        toast.error('Produto não encontrado', { description: 'Preencha os dados manualmente' });
      }
    } catch {
      toast.error('Erro ao buscar produto');
    } finally {
      setIsSearchingBarcode(false);
    }
  };

  const handleEdit = (product: CustomProduct) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormBrand(product.brand || '');
    setFormBarcode(product.barcode);
    setFormCalories(product.calories.toString());
    setFormProtein(product.protein.toString());
    setFormCarbs(product.carbs.toString());
    setFormFat(product.fat.toString());
    setFormFiber((product.fiber || 0).toString());
    setFormSodium((product.sodium || 0).toString());
    setFormSaturatedFat((product.saturated_fat || 0).toString());
    setFormTransFat((product.trans_fat || 0).toString());
    setFormRefQuantity(product.reference_quantity.toString());
    setFormRefUnit(product.reference_unit);
    setFormIsLiquid(product.is_liquid || false);
    setFormImageUrl(product.image_url || '');
    setFormPackageWeight(product.package_total_weight?.toString() || '');
    setFormPackageUnits(product.package_total_units?.toString() || '');
    setFormPackageVolume(product.package_volume_ml?.toString() || '');
  };

  const getProductImageUrl = (product: CustomProduct) => {
    return product.image_url || null;
  };

  const handleSaveAdd = async () => {
    if (!formName.trim()) return;
    
    // Generate barcode if not provided
    const barcode = formBarcode.trim() || `CUSTOM_${Date.now()}`;
    
    try {
      await saveProduct({
        barcode,
        name: formName.trim(),
        brand: formBrand.trim() || null,
        image_url: formImageUrl.trim() || null,
        calories: Number(formCalories) || 0,
        protein: Number(formProtein) || 0,
        carbs: Number(formCarbs) || 0,
        fat: Number(formFat) || 0,
        fiber: Number(formFiber) || 0,
        sodium: Number(formSodium) || 0,
        saturated_fat: Number(formSaturatedFat) || 0,
        trans_fat: Number(formTransFat) || 0,
        reference_quantity: Number(formRefQuantity) || 100,
        reference_unit: formIsLiquid ? 'ml' : formRefUnit,
        is_liquid: formIsLiquid,
        package_total_weight: formPackageWeight ? Number(formPackageWeight) : null,
        package_total_units: formPackageUnits ? Number(formPackageUnits) : null,
        package_volume_ml: formPackageVolume ? Number(formPackageVolume) : null,
      });
      setShowAddDialog(false);
      resetForm();
    } catch {
      // silently fail
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    try {
      await updateProduct(editingProduct.id, {
        name: formName,
        brand: formBrand || null,
        image_url: formImageUrl.trim() || null,
        calories: Number(formCalories) || 0,
        protein: Number(formProtein) || 0,
        carbs: Number(formCarbs) || 0,
        fat: Number(formFat) || 0,
        fiber: Number(formFiber) || 0,
        sodium: Number(formSodium) || 0,
        saturated_fat: Number(formSaturatedFat) || 0,
        trans_fat: Number(formTransFat) || 0,
        reference_quantity: Number(formRefQuantity) || 100,
        reference_unit: formIsLiquid ? 'ml' : formRefUnit,
        is_liquid: formIsLiquid,
        package_total_weight: formPackageWeight ? Number(formPackageWeight) : null,
        package_total_units: formPackageUnits ? Number(formPackageUnits) : null,
        package_volume_ml: formPackageVolume ? Number(formPackageVolume) : null,
      });
      setEditingProduct(null);
      resetForm();
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

  const handleImageClick = (product: CustomProduct) => {
    const imageUrl = getProductImageUrl(product);
    if (imageUrl) {
      setZoomImage(imageUrl);
    }
  };

  const ProductCard = ({ product }: { product: CustomProduct }) => {
    const imageUrl = getProductImageUrl(product);
    
    // Build package info display
    const getPackageDisplay = () => {
      if (product.is_liquid && product.package_volume_ml) {
        return `${product.package_volume_ml}ml`;
      }
      if (!product.is_liquid) {
        // If has both weight and units, show weight per unit
        if (product.package_total_weight && product.package_total_units) {
          const weightPerUnit = product.package_total_weight / product.package_total_units;
          return `${product.package_total_units} un. (${weightPerUnit.toFixed(0)}g/un)`;
        }
        // If only weight
        if (product.package_total_weight) {
          return `${product.package_total_weight}g`;
        }
        // If only units
        if (product.package_total_units) {
          return `${product.package_total_units} un.`;
        }
      }
      return null;
    };
    
    const packageDisplay = getPackageDisplay();
    
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-card shadow-card">
        <button 
          onClick={() => handleImageClick(product)}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
        >
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : product.is_liquid ? (
            <Droplets className="h-5 w-5 text-sky-500" />
          ) : (
            <UtensilsCrossed className="h-5 w-5 text-primary" />
          )}
        </button>
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
            {packageDisplay && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 flex items-center gap-0.5">
                <Package className="h-3 w-3" />
                {packageDisplay}
              </span>
            )}
            {product.is_liquid && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500">
                <Droplets className="h-3 w-3 inline" />
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="default"
            className="h-8 w-8 p-0"
            onClick={() => setConsumingProduct(product)}
          >
            <UtensilsCrossed className="h-4 w-4" />
          </Button>
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
    );
  };

  const ProductForm = ({ isEdit }: { isEdit: boolean }) => {
    const displayImageUrl = imagePreview || formImageUrl;
    
    return (
      <div className="space-y-4 pt-2">
        {/* Image upload */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => displayImageUrl && setZoomImage(displayImageUrl)}
            className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all relative"
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            ) : displayImageUrl ? (
              <img src={displayImageUrl} alt="Preview" className="h-full w-full object-cover" />
            ) : formIsLiquid ? (
              <Droplets className="h-6 w-6 text-sky-500" />
            ) : (
              <UtensilsCrossed className="h-6 w-6 text-primary" />
            )}
          </button>
          <div className="flex-1">
            <label className="text-sm text-muted-foreground mb-1 block">Imagem do produto</label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {formImageUrl || imagePreview ? 'Trocar imagem' : 'Selecionar imagem'}
                </>
              )}
            </Button>
          </div>
        </div>

        {isEdit && editingProduct && (
          <div className="p-2 rounded-lg bg-secondary/50 text-center">
            <p className="text-xs text-muted-foreground">Código de barras</p>
            <p className="font-mono text-sm">{editingProduct.barcode}</p>
          </div>
        )}

        {!isEdit && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground block">Código de barras</label>
            <div className="flex gap-2">
              <Input 
                value={formBarcode} 
                onChange={(e) => setFormBarcode(e.target.value)} 
                placeholder="Deixe em branco para gerar"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowBarcodeScanner(true)}
                disabled={isSearchingBarcode}
              >
                {isSearchingBarcode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ScanLine className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Escaneie para preencher automaticamente
            </p>
          </div>
        )}

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Nome *</label>
          <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome do produto" />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Marca</label>
          <Input value={formBrand} onChange={(e) => setFormBrand(e.target.value)} placeholder="Opcional" />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-sky-500/10">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-sky-500" />
            <Label htmlFor="is-liquid" className="text-sm">Produto líquido</Label>
          </div>
          <Switch 
            id="is-liquid" 
            checked={formIsLiquid} 
            onCheckedChange={(checked) => {
              setFormIsLiquid(checked);
              if (checked) setFormRefUnit('ml');
              else setFormRefUnit('g');
            }} 
          />
        </div>

        {/* Package info section */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Informações da Embalagem
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Preencha para calcular consumo por porção ou unidade
          </p>
          
          {formIsLiquid ? (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Volume total (ml)</label>
              <Input 
                type="number" 
                value={formPackageVolume} 
                onChange={(e) => setFormPackageVolume(e.target.value)} 
                placeholder="Ex: 350"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Peso total (g)</label>
                <Input 
                  type="number" 
                  value={formPackageWeight} 
                  onChange={(e) => setFormPackageWeight(e.target.value)} 
                  placeholder="Ex: 500"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Unidades</label>
                <Input 
                  type="number" 
                  value={formPackageUnits} 
                  onChange={(e) => setFormPackageUnits(e.target.value)} 
                  placeholder="Ex: 10"
                />
              </div>
              {formPackageWeight && formPackageUnits && Number(formPackageUnits) > 0 && (
                <div className="col-span-2 text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                  Cada unidade: <strong>{(Number(formPackageWeight) / Number(formPackageUnits)).toFixed(0)}g</strong>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-1">Informações Nutricionais</p>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground">Por</span>
            <Input 
              type="number" 
              value={formRefQuantity} 
              onChange={(e) => setFormRefQuantity(e.target.value)} 
              className="w-20 h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">{formIsLiquid ? 'ml' : 'g'}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Calorias</label>
              <Input type="number" value={formCalories} onChange={(e) => setFormCalories(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Proteína (g)</label>
              <Input type="number" value={formProtein} onChange={(e) => setFormProtein(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Carboidratos (g)</label>
              <Input type="number" value={formCarbs} onChange={(e) => setFormCarbs(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Gorduras (g)</label>
              <Input type="number" value={formFat} onChange={(e) => setFormFat(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fibras (g)</label>
              <Input type="number" value={formFiber} onChange={(e) => setFormFiber(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sódio (mg)</label>
              <Input type="number" value={formSodium} onChange={(e) => setFormSodium(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">G. Saturada (g)</label>
              <Input type="number" value={formSaturatedFat} onChange={(e) => setFormSaturatedFat(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">G. Trans (g)</label>
              <Input type="number" value={formTransFat} onChange={(e) => setFormTransFat(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => {
            if (isEdit) setEditingProduct(null);
            else setShowAddDialog(false);
            resetForm();
          }}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={isEdit ? handleSaveEdit : handleSaveAdd}>
            Salvar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <header className="sticky top-0 z-30 glass border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
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
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
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

        {/* Filtros */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterType('all')}
            className="flex-1"
          >
            <Filter className="h-3 w-3 mr-1" />
            Todos
          </Button>
          <Button
            size="sm"
            variant={filterType === 'solid' ? 'default' : 'outline'}
            onClick={() => setFilterType('solid')}
            className="flex-1"
          >
            <Apple className="h-3 w-3 mr-1" />
            Alimentos
          </Button>
          <Button
            size="sm"
            variant={filterType === 'liquid' ? 'default' : 'outline'}
            onClick={() => setFilterType('liquid')}
            className="flex-1"
          >
            <Droplets className="h-3 w-3 mr-1" />
            Bebidas
          </Button>
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
              Clique em "Novo" para cadastrar um produto
            </p>
          </div>
        ) : filterType === 'all' ? (
          <div className="space-y-6">
            {/* Alimentos */}
            {solidProducts.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Apple className="h-4 w-4 text-primary" />
                  Alimentos ({solidProducts.length})
                </h2>
                <div className="space-y-2">
                  {solidProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}

            {/* Líquidos */}
            {liquidProducts.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-sky-500" />
                  Bebidas ({liquidProducts.length})
                </h2>
                <div className="space-y-2">
                  {liquidProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Dialog para adicionar */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Novo Produto
            </DialogTitle>
          </DialogHeader>
          <ProductForm isEdit={false} />
        </DialogContent>
      </Dialog>

      {/* Dialog para editar */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Produto
            </DialogTitle>
          </DialogHeader>
          <ProductForm isEdit={true} />
        </DialogContent>
      </Dialog>

      {/* Dialog de zoom */}
      <ImageZoomDialog 
        imageUrl={zoomImage} 
        open={!!zoomImage} 
        onOpenChange={(open) => !open && setZoomImage(null)} 
      />

      {/* Barcode Scanner Dialog */}
      <Dialog open={showBarcodeScanner} onOpenChange={setShowBarcodeScanner}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              Escanear Código de Barras
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4">
            <ZxingScanner onResult={handleBarcodeScanned} />
            <Button 
              variant="outline" 
              className="w-full mt-4" 
              onClick={() => setShowBarcodeScanner(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Consumption Dialog */}
      <ProductConsumptionDialog
        product={consumingProduct}
        open={!!consumingProduct}
        onOpenChange={(open) => !open && setConsumingProduct(null)}
      />

      <BottomNav />
    </div>
  );
}
