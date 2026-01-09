import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Camera, Loader2, Package, ScanLine, Keyboard, ImagePlus } from 'lucide-react';
import { BarcodeProduct } from '@/types/nutrition';
import { fetchProductByBarcode, isLiquidProduct, getLiquidVolumeMl } from '@/lib/openFoodFacts';
import { useCustomProducts, CustomProduct } from '@/hooks/useCustomProducts';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ZxingScanner } from './ZxingScanner';
import { ProductFormDialog } from './ProductFormDialog';
import { ProductConsumptionDialog } from './ProductConsumptionDialog';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onProductFound: (product: BarcodeProduct, portionGrams: number, isLiquid?: boolean, liquidMl?: number) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onProductFound, onClose }: BarcodeScannerProps) {
  const { getProductByBarcode, saveProduct, products } = useCustomProducts();
  const [barcode, setBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Scanner mode
  const [scanMode, setScanMode] = useState<'camera' | 'photo' | 'manual'>('camera');
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
  } | null>(null);

  // Handle photo file scan
  const handlePhotoScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setScanError(null);

    try {
      const html5QrCode = new Html5Qrcode('photo-scanner-temp', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      });

      const decodedText = await html5QrCode.scanFile(file, true);
      setBarcode(decodedText);
      handleSearchWithBarcode(decodedText);
    } catch (err) {
      setScanError('Não foi possível ler o código de barras na foto.');
    } finally {
      setIsLoading(false);
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

  // Reset error when changing mode
  useEffect(() => {
    setScanError(null);
  }, [scanMode]);

  const handleSearchWithBarcode = async (barcodeValue: string) => {
    if (!barcodeValue.trim()) return;

    setIsLoading(true);
    setScannedBarcode(barcodeValue.trim());
    
    try {
      // First check local database
      const customProduct = await getProductByBarcode(barcodeValue.trim());
      
      if (customProduct) {
        // Product found in local DB - go directly to consumption dialog
        setFoundProduct(customProduct);
        setShowConsumptionDialog(true);
        setIsLoading(false);
        return;
      }
      
      // Not found locally, try OpenFoodFacts
      const result = await fetchProductByBarcode(barcodeValue.trim());
      
      if (result) {
        // Found in OpenFoodFacts - show product form for user to review/edit
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
      
      // Product not found anywhere - show registration form
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

  // If showing product form
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

  // If showing consumption dialog
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
              variant={scanMode === 'camera' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setScanMode('camera')}
            >
              <ScanLine className="h-4 w-4 mr-1" />
              Câmera
            </Button>
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

          {/* Hidden temp div for photo scanning */}
          <div id="photo-scanner-temp" className="hidden" />
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoScan}
            className="hidden"
          />

          {scanMode === 'camera' ? (
            <div className="space-y-3">
              {isLoading ? (
                <div className="rounded-xl bg-primary/10 p-8 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                  <p className="mt-4 text-sm font-medium">Aguarde, pesquisando produto...</p>
                  <p className="text-xs text-muted-foreground mt-1">Código: {barcode}</p>
                </div>
              ) : scanError ? (
                <div className="rounded-xl bg-destructive/10 p-4 text-center">
                  <p className="text-sm text-destructive">{scanError}</p>
                  <div className="flex gap-2 justify-center mt-2">
                    <Button variant="outline" size="sm" onClick={() => setScanMode('photo')}>
                      Tirar foto
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setScanMode('manual')}>
                      Digitar código
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <ZxingScanner 
                    onResult={(code) => {
                      setBarcode(code);
                      handleSearchWithBarcode(code);
                    }}
                    onError={(error) => setScanError(error)}
                  />
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Aponte a câmera para o código de barras
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : scanMode === 'photo' ? (
            <div className="space-y-4">
              {isLoading ? (
                <div className="rounded-xl bg-primary/10 p-8 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                  <p className="mt-4 text-sm font-medium">Aguarde, pesquisando produto...</p>
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
                  <p className="mt-4 text-sm font-medium">Aguarde, pesquisando produto...</p>
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
