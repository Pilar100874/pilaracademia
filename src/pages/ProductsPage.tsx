import { useState, useMemo, useCallback } from 'react';
import { Package, Search, Pencil, Trash2, ChevronLeft, Barcode, Plus, Droplets, Apple, Filter, Loader2, ScanLine, UtensilsCrossed, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BottomNav } from '@/components/BottomNav';
import { useCustomProducts, CustomProduct } from '@/hooks/useCustomProducts';
import { useNavigate } from 'react-router-dom';
import { ImageZoomDialog } from '@/components/ImageZoomDialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ZxingScanner } from '@/components/ZxingScanner';
import { fetchProductByBarcode, isLiquidProduct } from '@/lib/openFoodFacts';
import { toast } from 'sonner';
import { NATURAL_PRODUCTS, NATURAL_PRODUCT_CATEGORIES, getCategoryInfo, NaturalProduct } from '@/data/naturalProducts';
import { ProductForm } from '@/components/ProductForm';

type FilterType = 'all' | 'solid' | 'liquid';
type ActiveTab = 'custom' | 'natural';

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
  const [activeTab, setActiveTab] = useState<ActiveTab>('custom');
  const [selectedNaturalCategory, setSelectedNaturalCategory] = useState<string | null>(null);
  
  const [showAddNaturalDialog, setShowAddNaturalDialog] = useState(false);
  const [formNaturalCategory, setFormNaturalCategory] = useState('frutas');
  const [deletingProduct, setDeletingProduct] = useState<CustomProduct | null>(null);
  const [deletingNaturalId, setDeletingNaturalId] = useState<{ id: string; name: string } | null>(null);
  
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

  // Separate custom products and user-created natural products
  const customProducts = products.filter(p => !p.is_natural);
  const userNaturalProducts = products.filter(p => p.is_natural);

  // Filter custom products by search and type
  const filteredProducts = customProducts.filter((p) => {
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

  // Filter natural products (static + user-created)
  const filteredNaturalProducts = useMemo(() => {
    // Convert user natural products to NaturalProduct format
    const userNaturals: NaturalProduct[] = userNaturalProducts.map(p => ({
      id: p.id,
      name: p.name,
      category: p.brand || 'outros', // Using brand field for category
      calories: p.calories,
      protein: p.protein,
      carbs: p.carbs,
      fat: p.fat,
      fiber: p.fiber || 0,
      sodium: p.sodium || 0,
      saturated_fat: p.saturated_fat || 0,
      trans_fat: p.trans_fat || 0,
      reference_quantity: p.reference_quantity,
      reference_unit: p.reference_unit,
      is_liquid: p.is_liquid,
      is_natural: true as const,
      is_user_created: true,
    }));

    let filtered = [...NATURAL_PRODUCTS, ...userNaturals];
    
    if (selectedNaturalCategory) {
      filtered = filtered.filter(p => p.category === selectedNaturalCategory);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [searchTerm, selectedNaturalCategory, userNaturalProducts]);

  // Group natural products by category
  const naturalProductsByCategory = useMemo(() => {
    const grouped: Record<string, (NaturalProduct & { is_user_created?: boolean })[]> = {};
    filteredNaturalProducts.forEach(p => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });
    return grouped;
  }, [filteredNaturalProducts]);


  const handleOpenAddNatural = () => {
    resetForm();
    setFormNaturalCategory('frutas');
    setShowAddNaturalDialog(true);
  };

  const handleSaveAddNatural = async () => {
    if (!formName.trim()) return;
    
    const barcode = `NATURAL_${Date.now()}`;
    
    try {
      await saveProduct({
        barcode,
        name: formName.trim(),
        brand: formNaturalCategory, // Store category in brand field
        image_url: null,
        calories: Number(formCalories) || 0,
        protein: Number(formProtein) || 0,
        carbs: Number(formCarbs) || 0,
        fat: Number(formFat) || 0,
        fiber: Number(formFiber) || 0,
        sodium: Number(formSodium) || 0,
        saturated_fat: Number(formSaturatedFat) || 0,
        trans_fat: Number(formTransFat) || 0,
        reference_quantity: 100,
        reference_unit: formIsLiquid ? 'ml' : 'g',
        is_liquid: formIsLiquid,
        is_natural: true,
        package_total_weight: null,
        package_total_units: null,
        package_volume_ml: null,
      });
      setShowAddNaturalDialog(false);
      resetForm();
      toast.success('Alimento natural criado!');
    } catch {
      toast.error('Erro ao salvar alimento');
    }
  };

  const handleDeleteNatural = async (id: string) => {
    try {
      await deleteProduct(id);
      toast.success('Alimento removido');
    } catch {
      toast.error('Erro ao remover alimento');
    }
  };

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
        is_natural: false,
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

  const handleDelete = async (product: CustomProduct) => {
    setDeletingProduct(product);
  };

  const confirmDelete = async () => {
    if (deletingProduct) {
      try {
        await deleteProduct(deletingProduct.id);
        setDeletingProduct(null);
      } catch {
        // silently fail
      }
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
            onClick={() => handleDelete(product)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const handleCancelAdd = useCallback(() => {
    setShowAddDialog(false);
    resetForm();
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingProduct(null);
    resetForm();
  }, []);
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
                Produtos
              </h1>
              <p className="text-xs text-muted-foreground">
                {activeTab === 'custom' ? `${products.length} produto(s) salvos` : `${NATURAL_PRODUCTS.length} alimentos naturais`}
              </p>
            </div>
          </div>
          {activeTab === 'custom' && (
            <Button size="sm" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Novo
            </Button>
          )}
          {activeTab === 'natural' && (
            <Button size="sm" onClick={handleOpenAddNatural}>
              <Plus className="h-4 w-4 mr-1" />
              Novo
            </Button>
          )}
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="custom" className="flex items-center gap-1.5">
              <Package className="h-4 w-4" />
              Meus Produtos
            </TabsTrigger>
            <TabsTrigger value="natural" className="flex items-center gap-1.5">
              <Leaf className="h-4 w-4" />
              Naturais
            </TabsTrigger>
          </TabsList>

          {/* Busca */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'custom' ? "Buscar por nome, marca ou código..." : "Buscar alimento natural..."}
              className="pl-10"
            />
          </div>

          {/* CUSTOM PRODUCTS TAB */}
          <TabsContent value="custom" className="mt-4 space-y-4">
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
          </TabsContent>

          {/* NATURAL PRODUCTS TAB */}
          <TabsContent value="natural" className="mt-4 space-y-4">
            {/* Category filter */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedNaturalCategory(null)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedNaturalCategory === null 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                Todos
              </button>
              {NATURAL_PRODUCT_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedNaturalCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedNaturalCategory === cat.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </div>

            {/* Natural products list */}
            {filteredNaturalProducts.length === 0 ? (
              <div className="text-center py-12">
                <Leaf className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum alimento encontrado</p>
              </div>
            ) : selectedNaturalCategory ? (
              <div className="space-y-2">
                {filteredNaturalProducts.map((natural) => {
                  const categoryInfo = getCategoryInfo(natural.category);
                  const isUserCreated = 'is_user_created' in natural && natural.is_user_created;
                  return (
                    <div
                      key={natural.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card shadow-card"
                    >
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${isUserCreated ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                        {categoryInfo?.emoji || '🍽️'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="font-medium text-sm truncate">{natural.name}</p>
                          {isUserCreated && (
                            <span className="text-xs px-1 py-0.5 rounded bg-amber-500/20 text-amber-600">Meu</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{categoryInfo?.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                            {natural.calories} kcal
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                            /100{natural.is_liquid ? 'ml' : 'g'}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">
                            P:{natural.protein}g
                          </span>
                        </div>
                      </div>
                      {isUserCreated && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteNatural(natural.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(naturalProductsByCategory).map(([categoryId, naturals]) => {
                  const categoryInfo = getCategoryInfo(categoryId);
                  return (
                    <div key={categoryId}>
                      <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <span>{categoryInfo?.emoji}</span>
                        {categoryInfo?.name || categoryId} ({naturals.length})
                      </h2>
                      <div className="space-y-2">
                        {naturals.map((natural) => {
                          const isUserCreated = 'is_user_created' in natural && natural.is_user_created;
                          return (
                            <div
                              key={natural.id}
                              className="flex items-center gap-3 p-3 rounded-xl bg-card shadow-card"
                            >
                              <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${isUserCreated ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                                {categoryInfo?.emoji || '🍽️'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="font-medium text-sm truncate">{natural.name}</p>
                                  {isUserCreated && (
                                    <span className="text-xs px-1 py-0.5 rounded bg-amber-500/20 text-amber-600">Meu</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                                    {natural.calories} kcal
                                  </span>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                    /100{natural.is_liquid ? 'ml' : 'g'}
                                  </span>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">
                                    P:{natural.protein}g
                                  </span>
                                </div>
                              </div>
                              {isUserCreated && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteNatural(natural.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog para adicionar */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent 
          className="max-w-sm max-h-[90vh] overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Novo Produto
            </DialogTitle>
          </DialogHeader>
          <ProductForm 
            isEdit={false}
            editingProduct={null}
            formName={formName}
            setFormName={setFormName}
            formBrand={formBrand}
            setFormBrand={setFormBrand}
            formBarcode={formBarcode}
            setFormBarcode={setFormBarcode}
            formCalories={formCalories}
            setFormCalories={setFormCalories}
            formProtein={formProtein}
            setFormProtein={setFormProtein}
            formCarbs={formCarbs}
            setFormCarbs={setFormCarbs}
            formFat={formFat}
            setFormFat={setFormFat}
            formFiber={formFiber}
            setFormFiber={setFormFiber}
            formSodium={formSodium}
            setFormSodium={setFormSodium}
            formSaturatedFat={formSaturatedFat}
            setFormSaturatedFat={setFormSaturatedFat}
            formTransFat={formTransFat}
            setFormTransFat={setFormTransFat}
            formRefQuantity={formRefQuantity}
            setFormRefQuantity={setFormRefQuantity}
            formRefUnit={formRefUnit}
            setFormRefUnit={setFormRefUnit}
            formIsLiquid={formIsLiquid}
            setFormIsLiquid={setFormIsLiquid}
            formImageUrl={formImageUrl}
            formPackageWeight={formPackageWeight}
            setFormPackageWeight={setFormPackageWeight}
            formPackageUnits={formPackageUnits}
            setFormPackageUnits={setFormPackageUnits}
            formPackageVolume={formPackageVolume}
            setFormPackageVolume={setFormPackageVolume}
            imagePreview={imagePreview}
            isUploading={isUploading}
            isSearchingBarcode={isSearchingBarcode}
            onFileChange={handleFileChange}
            onOpenBarcodeScanner={() => setShowBarcodeScanner(true)}
            onZoomImage={(url) => setZoomImage(url)}
            onCancel={handleCancelAdd}
            onSave={handleSaveAdd}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para editar */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent 
          className="max-w-sm max-h-[90vh] overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Produto
            </DialogTitle>
          </DialogHeader>
          <ProductForm 
            isEdit={true}
            editingProduct={editingProduct}
            formName={formName}
            setFormName={setFormName}
            formBrand={formBrand}
            setFormBrand={setFormBrand}
            formBarcode={formBarcode}
            setFormBarcode={setFormBarcode}
            formCalories={formCalories}
            setFormCalories={setFormCalories}
            formProtein={formProtein}
            setFormProtein={setFormProtein}
            formCarbs={formCarbs}
            setFormCarbs={setFormCarbs}
            formFat={formFat}
            setFormFat={setFormFat}
            formFiber={formFiber}
            setFormFiber={setFormFiber}
            formSodium={formSodium}
            setFormSodium={setFormSodium}
            formSaturatedFat={formSaturatedFat}
            setFormSaturatedFat={setFormSaturatedFat}
            formTransFat={formTransFat}
            setFormTransFat={setFormTransFat}
            formRefQuantity={formRefQuantity}
            setFormRefQuantity={setFormRefQuantity}
            formRefUnit={formRefUnit}
            setFormRefUnit={setFormRefUnit}
            formIsLiquid={formIsLiquid}
            setFormIsLiquid={setFormIsLiquid}
            formImageUrl={formImageUrl}
            formPackageWeight={formPackageWeight}
            setFormPackageWeight={setFormPackageWeight}
            formPackageUnits={formPackageUnits}
            setFormPackageUnits={setFormPackageUnits}
            formPackageVolume={formPackageVolume}
            setFormPackageVolume={setFormPackageVolume}
            imagePreview={imagePreview}
            isUploading={isUploading}
            isSearchingBarcode={isSearchingBarcode}
            onFileChange={handleFileChange}
            onOpenBarcodeScanner={() => setShowBarcodeScanner(true)}
            onZoomImage={(url) => setZoomImage(url)}
            onCancel={handleCancelEdit}
            onSave={handleSaveEdit}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de zoom */}
      <ImageZoomDialog 
        images={zoomImage ? [zoomImage] : []} 
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

      {/* Dialog para adicionar alimento natural */}
      <Dialog open={showAddNaturalDialog} onOpenChange={setShowAddNaturalDialog}>
        <DialogContent 
          className="max-w-sm max-h-[90vh] overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-500" />
              Novo Alimento Natural
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome *</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome do alimento" />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Categoria</label>
              <div className="flex flex-wrap gap-1.5">
                {NATURAL_PRODUCT_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormNaturalCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      formNaturalCategory === cat.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    {cat.emoji} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-sky-500/10">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-sky-500" />
                <Label htmlFor="is-liquid-natural" className="text-sm">Alimento líquido</Label>
              </div>
              <Switch 
                id="is-liquid-natural" 
                checked={formIsLiquid} 
                onCheckedChange={setFormIsLiquid} 
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-1">Informações Nutricionais por 100{formIsLiquid ? 'ml' : 'g'}</p>
              
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Calorias *</label>
                  <Input inputMode="decimal" pattern="[0-9]*" value={formCalories} onChange={(e) => setFormCalories(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Proteína (g)</label>
                  <Input inputMode="decimal" pattern="[0-9]*" value={formProtein} onChange={(e) => setFormProtein(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Carboidratos (g)</label>
                  <Input inputMode="decimal" pattern="[0-9]*" value={formCarbs} onChange={(e) => setFormCarbs(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Gorduras (g)</label>
                  <Input inputMode="decimal" pattern="[0-9]*" value={formFat} onChange={(e) => setFormFat(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fibras (g)</label>
                  <Input inputMode="decimal" pattern="[0-9]*" value={formFiber} onChange={(e) => setFormFiber(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Sódio (mg)</label>
                  <Input inputMode="decimal" pattern="[0-9]*" value={formSodium} onChange={(e) => setFormSodium(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setShowAddNaturalDialog(false);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSaveAddNatural}>
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        itemName={deletingProduct?.name}
        onConfirm={confirmDelete}
      />

      <BottomNav />
    </div>
  );
}
