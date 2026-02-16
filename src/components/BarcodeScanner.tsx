import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Camera, Loader2, Keyboard, Upload, CircleDot } from 'lucide-react';
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
  
  const [scanMode, setScanMode] = useState<'photo' | 'manual'>('photo');
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
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

  // Process a file from gallery
  const processFile = useCallback(async (file: File) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      await processBarcodeImage(base64Data);
    } catch (err) {
      console.error('BarcodeScanner: processFile error:', err);
      setIsLoading(false);
      setScanError('Erro ao processar a foto. Tente novamente.');
      toast.error('Erro ao processar foto', { description: 'Tente novamente ou use o modo manual.' });
    } finally {
      processingRef.current = false;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const processBarcodeImage = async (base64Data: string) => {
    setIsLoading(true);
    setLoadingMessage('Lendo código de barras...');
    setScanError(null);

    try {
      const { data, error } = await supabase.functions.invoke('read-barcode', {
        body: { imageBase64: base64Data },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao ler código de barras');
      }

      if (!data?.success || !data?.data?.found || !data?.data?.barcode) {
        setIsLoading(false);
        setScanError('Não foi possível identificar um código de barras na foto. Tente novamente ou digite manualmente.');
        toast.warning('Código não reconhecido', { description: 'Tente tirar a foto mais próxima do código de barras ou digite manualmente.' });
        return;
      }

      const decodedBarcode = data.data.barcode;
      setBarcode(decodedBarcode);
      setLoadingMessage('Buscando produto...');
      handleSearchWithBarcode(decodedBarcode);
    } catch (err) {
      console.error('BarcodeScanner: processBarcodeImage error:', err);
      setIsLoading(false);
      setScanError('Erro ao ler o código de barras. Tente novamente ou digite manualmente.');
      toast.error('Erro na leitura', { description: 'Não foi possível processar a imagem. Tente novamente.' });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const openGallery = () => {
    fileInputRef.current?.click();
  };

  // In-browser camera using getUserMedia
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error('Camera access error:', err);
      toast.error('Não foi possível acessar a câmera', {
        description: 'Verifique as permissões ou use a opção Galeria.'
      });
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const base64Data = canvas.toDataURL('image/jpeg', 0.8);
    stopCamera();
    await processBarcodeImage(base64Data);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

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
          <Button variant="ghost" size="icon" onClick={() => { stopCamera(); onClose(); }}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={scanMode === 'photo' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => { stopCamera(); setScanMode('photo'); }}
            >
              <Camera className="h-4 w-4 mr-1" />
              Foto
            </Button>
            <Button
              variant={scanMode === 'manual' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => { stopCamera(); setScanMode('manual'); }}
            >
              <Keyboard className="h-4 w-4 mr-1" />
              Manual
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
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
                  
                  {showCamera ? (
                    <div className="relative rounded-2xl overflow-hidden bg-black">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-2xl" />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                        <Button size="lg" variant="secondary" onClick={stopCamera} className="rounded-full">
                          <X className="h-5 w-5" />
                        </Button>
                        <Button size="lg" onClick={capturePhoto} className="rounded-full h-16 w-16">
                          <CircleDot className="h-8 w-8" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div 
                        className="rounded-2xl border-2 border-dashed border-primary/50 p-6 text-center cursor-pointer hover:bg-primary/5 transition-colors"
                        onClick={openCamera}
                      >
                        <Camera className="mx-auto h-10 w-10 text-primary" />
                        <p className="mt-2 text-sm font-medium">Abrir Câmera</p>
                      </div>
                      <div 
                        className="rounded-2xl border-2 border-dashed border-muted-foreground/30 p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={openGallery}
                      >
                        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="mt-2 text-sm font-medium text-muted-foreground">Escolher da Galeria</p>
                      </div>
                    </div>
                  )}
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

