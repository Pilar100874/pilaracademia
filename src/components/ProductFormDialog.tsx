import { useState, useRef, useEffect } from 'react';
import { FieldError } from '@/components/FieldError';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Package, Droplets, Image, Upload, Loader2, ScanLine, Check, UtensilsCrossed } from 'lucide-react';
import { useCustomProducts, CustomProduct } from '@/hooks/useCustomProducts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { WATER_IMAGE_URL } from '@/components/DefaultLiquidImage';
import { ZxingScanner } from '@/components/ZxingScanner';
import { fetchProductByBarcode, isLiquidProduct } from '@/lib/openFoodFacts';
import { toast } from 'sonner';
import { useFieldError, validateRequired } from '@/lib/formValidation';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBarcode?: string;
  initialData?: {
    name?: string;
    brand?: string;
    imageUrl?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
    saturatedFat?: number;
    transFat?: number;
    isLiquid?: boolean;
    packageWeight?: number;
    packageUnits?: number;
    packageVolume?: number;
    referenceQuantity?: number;
  };
  onProductSaved?: (product: CustomProduct) => void;
  title?: string;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  initialBarcode = '',
  initialData,
  onProductSaved,
  title = 'Cadastrar Produto',
}: ProductFormDialogProps) {
  const { user } = useAuth();
  const { saveProduct } = useCustomProducts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { errorOf, setError, clearError, clearIf } = useFieldError();
  
  // Form state
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
  const [formPackageWeight, setFormPackageWeight] = useState('');
  const [formPackageUnits, setFormPackageUnits] = useState('');
  const [formPackageVolume, setFormPackageVolume] = useState('');

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      setFormBarcode(initialBarcode);
      if (initialData) {
        setFormName(initialData.name || '');
        setFormBrand(initialData.brand || '');
        setFormCalories(initialData.calories?.toString() || '');
        setFormProtein(initialData.protein?.toString() || '');
        setFormCarbs(initialData.carbs?.toString() || '');
        setFormFat(initialData.fat?.toString() || '');
        setFormFiber(initialData.fiber?.toString() || '');
        setFormSodium(initialData.sodium?.toString() || '');
        setFormSaturatedFat(initialData.saturatedFat?.toString() || '');
        setFormTransFat(initialData.transFat?.toString() || '');
        setFormIsLiquid(initialData.isLiquid || false);
        setFormRefUnit(initialData.isLiquid ? 'ml' : 'g');
        setFormRefQuantity(initialData.referenceQuantity?.toString() || '100');
        setFormPackageWeight(initialData.packageWeight?.toString() || '');
        setFormPackageUnits(initialData.packageUnits?.toString() || '');
        setFormPackageVolume(initialData.packageVolume?.toString() || '');
        if (initialData.imageUrl) {
          setFormImageUrl(initialData.imageUrl);
          setImagePreview(initialData.imageUrl);
        }
      }
    }
  }, [open, initialBarcode, initialData]);

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

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
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

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

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

  const handleSave = async () => {
    const first = validateRequired([
      { key: 'name', ref: nameInputRef, valid: !!formName.trim(), message: 'Informe o nome do produto' },
    ]);
    if (first) {
      setError(first.key, first.message);
      return;
    }
    clearError();

    const barcode = formBarcode.trim() || `CUSTOM_${Date.now()}`;

    setIsSaving(true);
    try {
      const savedProduct = await saveProduct({
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
      
      toast.success('Produto salvo!');
      
      if (onProductSaved && savedProduct) {
        onProductSaved(savedProduct);
      }
      handleClose();
    } catch (err) {
      toast.error('Erro ao salvar produto');
      setIsSaving(false);
    }
  };

  const displayImageUrl = imagePreview || formImageUrl;

  if (showBarcodeScanner) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Escanear Código</DialogTitle>
          </DialogHeader>
          <ZxingScanner 
            onResult={(code) => handleBarcodeScanned(code)}
            onError={(error) => {
              toast.error(error);
              setShowBarcodeScanner(false);
            }}
          />
          <Button variant="outline" onClick={() => setShowBarcodeScanner(false)}>
            Cancelar
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Image upload */}
          <div className="flex items-center gap-4">
            <button
              type="button"
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

          {/* Barcode */}
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

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Nome *</label>
            <Input
              ref={nameInputRef}
              value={formName}
              onChange={(e) => { setFormName(e.target.value); clearIf('name'); }}
              placeholder="Nome do produto"
              aria-invalid={!!errorOf('name')}
            />
            <FieldError message={errorOf('name')} />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Marca</label>
            <Input value={formBrand} onChange={(e) => setFormBrand(e.target.value)} placeholder="Opcional" />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-sky-500/10">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-sky-500" />
              <Label htmlFor="is-liquid-form" className="text-sm">Produto líquido</Label>
            </div>
            <Switch 
              id="is-liquid-form" 
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
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {isSaving ? 'Salvando...' : 'Salvar e Continuar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
