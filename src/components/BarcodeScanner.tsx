import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Camera, Loader2, Keyboard, ImagePlus } from 'lucide-react';
import { BarcodeProduct } from '@/types/nutrition';
import { fetchProductByBarcode, isLiquidProduct, getLiquidVolumeMl } from '@/lib/openFoodFacts';
import { useCustomProducts, CustomProduct } from '@/hooks/useCustomProducts';
import { supabase } from '@/integrations/supabase/client';
import { ProductFormDialog } from './ProductFormDialog';
import { ProductConsumptionDialog } from './ProductConsumptionDialog';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onProductFound: (product: BarcodeProduct, portionGrams: number, isLiquid?: boolean, liquidMl?: number) => void;
  onClose: () => void;
  selectedDate?: Date;
}

export function BarcodeScanner({ onProductFound, onClose, selectedDate }: BarcodeScannerProps) {
  const { getProductByBarcode, saveProduct, products } = useCustomProducts();
  const [barcode, setBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Aguarde...');
  
  // Scanner mode - default to photo
  const [scanMode, setScanMode] = useState<'photo' | 'manual'>('photo');
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Flow states
  const [showProductForm, setShowProductForm] = useState(false);
  const [showConsumptionDialog, setShowConsumptionDialog] = useState(false);
  const [foundProduct, setFoundProduct] = useState<CustomProduct | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [pendingProductData, setPendingProductData] = useState<{
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
  } | null>(null);

  // On mount, check for pending barcode photo from before page unload
  useEffect(() => {
    const pendingFile = sessionStorage.getItem('pendingBarcodeImage');
    console.log('BarcodeScanner: mounted, pendingFile exists:', !!pendingFile, 'length:', pendingFile?.length);
    if (pendingFile) {
      console.log('BarcodeScanner: Found pending image, starting AI barcode reading...');
      sessionStorage.removeItem('pendingBarcodeImage');
      // Small delay to ensure component is fully rendered
      setTimeout(() => {
        processBarcodeImage(pendingFile);
      }, 200);
    }
  }, []);

  const processBarcodeImage = async (base64Data: string) => {
    setIsLoading(true);
    setLoadingMessage('Lendo código de barras...');
    setScanError(null);

    try {
      console.log('BarcodeScanner: sending image to AI for barcode reading');
      
      const { data, error } = await supabase.functions.invoke('read-barcode', {
        body: { imageBase64: base64Data },
      });

      if (error) {
        console.error('BarcodeScanner: edge function error:', error);
        throw new Error(error.message || 'Erro ao ler código de barras');
      }

      if (!data.success || !data.data?.found || !data.data?.barcode) {
        setIsLoading(false);
        setScanError('Não foi possível identificar um código de barras na foto. Tente novamente ou digite manualmente.');
        return;
      }

      const decodedBarcode = data.data.barcode;
      console.log('BarcodeScanner: AI decoded barcode:', decodedBarcode);
      setBarcode(decodedBarcode);
      setLoadingMessage('Buscando produto...');
      handleSearchWithBarcode(decodedBarcode);
    } catch (err) {
      console.error('BarcodeScanner: processBarcodeImage error:', err);
      setIsLoading(false);
      setScanError('Erro ao ler o código de barras. Tente novamente ou digite manualmente.');
    }
  };

  // Handle photo file scan
  const handlePhotoScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;
      
      try {
        sessionStorage.setItem('pendingBarcodeImage', base64Data);
      } catch (e) {
        console.warn('BarcodeScanner: Could not save to sessionStorage');
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await processBarcodeImage(base64Data);
      sessionStorage.removeItem('pendingBarcodeImage');
    } catch (err) {
      sessionStorage.removeItem('pendingBarcodeImage');
      setIsLoading(false);
      setScanError('Erro ao processar a foto. Tente novamente.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    if (scanMode === 'manual') {
      inputRef.current?.focus();
    }
  }, [scanMode]);

  useEffect(() => {
    setScanError(null);
  }, [scanMode]);

  const handleSearchWithBarcode = async (barcodeValue: string) => {
    if (!barcodeValue.trim()) return;

    setIsLoading(true);
    setLoadingMessage('Buscando produto...');
    setScannedBarcode(barcodeValue.trim());
    
    try {
      const customProduct = await getProductByBarcode(barcodeValue.trim());
      
      if (customProduct) {
        setFoundProduct(customProduct);
        setPendingProductData({
          name: customProduct.name,
          brand: customProduct.brand || undefined,
          imageUrl: customProduct.image_url || undefined,
          calories: customProduct.calories,
          protein: customProduct.protein,
          carbs: customProduct.carbs,
          fat: customProduct.fat,
          fiber: customProduct.fiber || undefined,
          sodium: customProduct.sodium || undefined,
          saturatedFat: customProduct.saturated_fat || undefined,
          transFat: customProduct.trans_fat || undefined,
          isLiquid: customProduct.is_liquid,
        });
        setShowProductForm(true);
        setIsLoading(false);
        toast.info('Produto encontrado', { description: 'Revise as informações antes de registrar consumo' });
        return;
      }
      
      const result = await fetchProductByBarcode(barcodeValue.trim());
      
      if (result) {
        const isLiquid = isLiquidProduct(result);
        const volumeMl = isLiquid ? getLiquidVolumeMl(result) : null;
        
        toast.info('Produto encontrado online', { description: 'Revise as informações antes de salvar' });
        
        setPendingProductData({
          name: result.name,
          brand: result.brand || undefined,
          imageUrl: result.imageUrl || undefined,
          calories: result.nutrition.calories,
          protein: result.nutrition.protein,
          carbs: result.nutrition.carbs,
          fat: result.nutrition.fat,
          fiber: result.nutrition.fiber,
          sodium: result.nutrition.sodium,
          saturatedFat: result.nutrition.saturatedFat,
          transFat: result.nutrition.transFat,
          isLiquid: isLiquid,
        });
        setShowProductForm(true);
        setIsLoading(false);
        return;
      }
      
      toast.info('Produto não encontrado', { description: 'Cadastre as informações do produto' });
      setPendingProductData(null);
      setShowProductForm(true);
      
    } catch (err) {
      console.error('Error searching product:', err);
      toast.error('Erro ao buscar produto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    handleSearchWithBarcode(barcode);
  };

  const handleProductSaved = (product: CustomProduct) => {
    setFoundProduct(product);
    setShowProductForm(false);
    setShowConsumptionDialog(true);
  };

  const handleConsumptionSuccess = () => {
    setShowConsumptionDialog(false);
    setFoundProduct(null);
    onClose();
  };

  if (showProductForm) {
    return (
      <ProductFormDialog
        open={showProductForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowProductForm(false);
            setScannedBarcode('');
          }
        }}
        initialBarcode={scannedBarcode}
        initialData={pendingProductData || undefined}
        onProductSaved={handleProductSaved}
        title="Cadastrar Produto"
      />
    );
  }

  if (showConsumptionDialog && foundProduct) {
    return (
      <ProductConsumptionDialog
        product={foundProduct}
        open={showConsumptionDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowConsumptionDialog(false);
            setFoundProduct(null);
          }
        }}
        onSuccess={handleConsumptionSuccess}
        onBack={() => {
          setPendingProductData({
            name: foundProduct.name,
            brand: foundProduct.brand || undefined,
            imageUrl: foundProduct.image_url || undefined,
            calories: foundProduct.calories,
            protein: foundProduct.protein,
            carbs: foundProduct.carbs,
            fat: foundProduct.fat,
            fiber: foundProduct.fiber || undefined,
            sodium: foundProduct.sodium || undefined,
            saturatedFat: foundProduct.saturated_fat || undefined,
            transFat: foundProduct.trans_fat || undefined,
            isLiquid: foundProduct.is_liquid,
            packageWeight: foundProduct.package_total_weight || undefined,
            packageUnits: foundProduct.package_total_units || undefined,
            packageVolume: foundProduct.package_volume_ml || undefined,
            referenceQuantity: foundProduct.reference_quantity,
          });
          setScannedBarcode(foundProduct.barcode);
          setShowConsumptionDialog(false);
          setFoundProduct(null);
          setShowProductForm(true);
        }}
        selectedDate={selectedDate}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm animate-scale-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card p-6 shadow-elevated animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Escanear Código de Barras</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={scanMode === 'photo' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setScanMode('photo')}
            >
              <ImagePlus className="h-4 w-4 mr-1" />
              Foto
            </Button>
            <Button
              variant={scanMode === 'manual' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setScanMode('manual')}
            >
              <Keyboard className="h-4 w-4 mr-1" />
              Manual
            </Button>
          </div>

          {/* Hidden file input for photo mode */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoScan}
            className="hidden"
          />

          {scanMode === 'photo' ? (
            <div className="space-y-4">
              {isLoading ? (
                <div className="rounded-xl bg-primary/10 p-8 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                  <p className="mt-4 text-sm font-medium">{loadingMessage}</p>
                </div>
              ) : (
                <>
                  {scanError && (
                    <div className="rounded-xl bg-destructive/10 p-4 text-center">
                      <p className="text-sm text-destructive">{scanError}</p>
                    </div>
                  )}
                  
                  <div 
                    className="rounded-2xl border-2 border-dashed border-primary/50 p-8 text-center cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="mx-auto h-12 w-12 text-primary" />
                    <p className="mt-3 text-sm font-medium">
                      Toque para tirar foto do código de barras
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {isLoading ? (
                <div className="rounded-xl bg-primary/10 p-8 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                  <p className="mt-4 text-sm font-medium">{loadingMessage}</p>
                </div>
              ) : (
                <>
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
                    <Button onClick={handleSearch} disabled={isLoading || !barcode.trim()}>
                      Buscar
                    </Button>
                  </div>

                  <div className="rounded-2xl border-2 border-dashed border-muted p-6 text-center">
                    <Keyboard className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      Digite o código de barras do produto
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
