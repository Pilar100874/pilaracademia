import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Camera, Loader2, Check, Star, Minus, Plus, Package, ScanLine, Keyboard, ImagePlus } from 'lucide-react';
import { BarcodeProduct, NutritionData } from '@/types/nutrition';
import { NutritionDisplay } from '@/components/NutritionDisplay';
import { LiquidConsumptionDialog } from '@/components/LiquidConsumptionDialog';
import { fetchProductByBarcode, calculateNutritionForPortion, isLiquidProduct, getLiquidVolumeMl } from '@/lib/openFoodFacts';
import { useCustomProducts } from '@/hooks/useCustomProducts';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ZxingScanner } from './ZxingScanner';

interface BarcodeScannerProps {
  onProductFound: (product: BarcodeProduct, portionGrams: number, isLiquid?: boolean, liquidMl?: number) => void;
  onClose: () => void;
}

// Porções predefinidas
const PORTION_OPTIONS = [
  { label: '1/4', value: 0.25 },
  { label: '1/3', value: 0.33 },
  { label: '1/2', value: 0.5 },
  { label: '2/3', value: 0.67 },
  { label: '3/4', value: 0.75 },
  { label: '1', value: 1 },
  { label: '1.5', value: 1.5 },
  { label: '2', value: 2 },
];

export function BarcodeScanner({ onProductFound, onClose }: BarcodeScannerProps) {
  const { getProductByBarcode, saveProduct } = useCustomProducts();
  const [barcode, setBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  
  // Scanner mode
  const [scanMode, setScanMode] = useState<'camera' | 'photo' | 'manual'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerId = 'barcode-scanner-container';
  
  // Package info
  const [showPackageInfo, setShowPackageInfo] = useState(false);
  const [packageWeight, setPackageWeight] = useState('');
  const [itemsInPackage, setItemsInPackage] = useState('');
  
  // Consumption mode
  const [consumptionMode, setConsumptionMode] = useState<'grams' | 'proportion' | 'items'>('grams');
  const [portionGrams, setPortionGrams] = useState(100);
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  const [consumedItems, setConsumedItems] = useState(1);
  
  const [calculatedNutrition, setCalculatedNutrition] = useState<NutritionData | null>(null);
  const [isLiquid, setIsLiquid] = useState(false);
  const [liquidVolumeMl, setLiquidVolumeMl] = useState(0);
  const [showLiquidDialog, setShowLiquidDialog] = useState(false);
  const [saveForFuture, setSaveForFuture] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Start camera scanner
  const startScanner = async () => {
    setScanError(null);
    
    // Wait a bit more for container to be in DOM
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const container = document.getElementById(scannerContainerId);
    if (!container) {
      console.error('Scanner container not found');
      setScanError('Erro ao inicializar o scanner. Tente o modo manual.');
      return;
    }
    
    // Clear any existing content in container
    container.innerHTML = '';
    
    try {
      // Request camera permission explicitly first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setScanError('Câmera não suportada neste navegador.');
        return;
      }
      
      // Get the back camera with high resolution
      const videoConstraints = {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920, min: 1280 },
        height: { ideal: 1080, min: 720 },
      } as MediaTrackConstraints;
      
      // Try to get camera access first with optimal settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: videoConstraints 
      });
      
      // Apply advanced constraints for autofocus if supported
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.() as any;
        const advancedConstraints: any = {};
        
        if (capabilities?.focusMode?.includes('continuous')) {
          advancedConstraints.focusMode = 'continuous';
        }
        if (capabilities?.focusDistance) {
          // Set focus for close-up (barcode scanning typically 10-30cm)
          advancedConstraints.focusDistance = capabilities.focusDistance.min + 
            (capabilities.focusDistance.max - capabilities.focusDistance.min) * 0.2;
        }
        
        if (Object.keys(advancedConstraints).length > 0) {
          try {
            await videoTrack.applyConstraints({ advanced: [advancedConstraints] });
          } catch (e) {
            console.log('Could not apply advanced constraints:', e);
          }
        }
      }
      
      // Stop the stream, we just needed to set up permissions and get camera info
      stream.getTracks().forEach(track => track.stop());

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ],
        verbose: false,
      });
      
      scannerRef.current = html5QrCode;
      
      // Get container dimensions for responsive qrbox
      const containerWidth = container.offsetWidth || 300;
      const qrboxWidth = Math.min(containerWidth - 40, 280);
      const qrboxHeight = Math.round(qrboxWidth * 0.35);
      
      const config = {
        fps: 10,
        qrbox: { width: qrboxWidth, height: qrboxHeight },
        aspectRatio: 1.0,
        disableFlip: false,
        videoConstraints: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };
      
      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // On successful scan
          console.log('Barcode detected:', decodedText);
          setBarcode(decodedText);
          stopScanner();
          handleSearchWithBarcode(decodedText);
        },
        () => {
          // QR code scanning in progress - ignore errors
        }
      );
      
      setIsScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      
      // Try fallback with any camera
      try {
        const container = document.getElementById(scannerContainerId);
        if (container) container.innerHTML = '';
        
        const html5QrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
          verbose: false,
        });
        
        scannerRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 100 } },
          (decodedText) => {
            console.log('Barcode detected (fallback):', decodedText);
            setBarcode(decodedText);
            stopScanner();
            handleSearchWithBarcode(decodedText);
          },
          () => {}
        );
        
        setIsScanning(true);
        return;
      } catch (fallbackErr) {
        console.error('Fallback scanner also failed:', fallbackErr);
      }
      
      let errorMessage = 'Não foi possível acessar a câmera.';
      
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        errorMessage = 'Permissão de câmera negada. Toque em "Permitir" quando solicitado.';
      } else if (err.name === 'NotFoundError' || err.message?.includes('not found')) {
        errorMessage = 'Nenhuma câmera encontrada no dispositivo.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Câmera em uso por outro aplicativo.';
      } else if (err.message?.includes('insecure') || err.name === 'SecurityError') {
        errorMessage = 'A câmera requer conexão segura (HTTPS).';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Câmera traseira não disponível.';
      }
      
      setScanError(errorMessage);
    }
  };

  // Stop camera scanner
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

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
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ],
        verbose: false,
      });

      const decodedText = await html5QrCode.scanFile(file, true);
      console.log('Barcode from photo:', decodedText);
      setBarcode(decodedText);
      handleSearchWithBarcode(decodedText);
    } catch (err) {
      console.error('Error scanning photo:', err);
      setScanError('Não foi possível ler o código de barras na foto. Tente tirar uma foto mais nítida ou use o modo manual.');
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  // Start scanner when in camera mode and no product
  useEffect(() => {
    let mounted = true;
    
    if (scanMode === 'camera' && !product && !isLoading) {
      // Longer delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (mounted) {
          startScanner();
        }
      }, 300);
      return () => {
        mounted = false;
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
    
    return () => {
      mounted = false;
    };
  }, [scanMode, product, isLoading]);

  useEffect(() => {
    if (scanMode === 'manual') {
      inputRef.current?.focus();
    }
  }, [scanMode]);

  // Peso por item
  const weightPerItem = useMemo(() => {
    const pkgWeight = Number(packageWeight);
    const items = Number(itemsInPackage);
    if (pkgWeight > 0 && items > 0) {
      return pkgWeight / items;
    }
    return null;
  }, [packageWeight, itemsInPackage]);

  // Total product weight
  const totalProductWeight = useMemo(() => {
    return Number(packageWeight) || null;
  }, [packageWeight]);

  // Calcular gramas efetivas baseado no modo
  const effectiveGrams = useMemo(() => {
    if (consumptionMode === 'items' && weightPerItem) {
      return Math.round(weightPerItem * consumedItems);
    }
    if (consumptionMode === 'proportion' && totalProductWeight) {
      return Math.round(totalProductWeight * portionMultiplier);
    }
    return portionGrams;
  }, [consumptionMode, weightPerItem, consumedItems, totalProductWeight, portionMultiplier, portionGrams]);

  useEffect(() => {
    if (product) {
      setCalculatedNutrition(calculateNutritionForPortion(product.nutrition, effectiveGrams));
    }
  }, [product, effectiveGrams]);

  const handleSearchWithBarcode = async (barcodeValue: string) => {
    if (!barcodeValue.trim()) return;

    setIsLoading(true);
    try {
      const customProduct = await getProductByBarcode(barcodeValue.trim());
      
      if (customProduct) {
        const nutrition: NutritionData = {
          calories: customProduct.calories,
          protein: customProduct.protein,
          carbs: customProduct.carbs,
          fat: customProduct.fat,
          saturatedFat: customProduct.saturated_fat || 0,
          transFat: customProduct.trans_fat || 0,
          fiber: customProduct.fiber || 0,
          sodium: customProduct.sodium || 0,
        };
        
        setProduct({
          code: customProduct.barcode,
          name: customProduct.name,
          brand: customProduct.brand || undefined,
          imageUrl: customProduct.image_url || undefined,
          nutrition,
          servingSize: `${customProduct.reference_quantity}${customProduct.reference_unit}`,
        });
        setIsCustomProduct(true);
        setPackageWeight(customProduct.reference_quantity.toString());
        setShowPackageInfo(true);
      } else {
        const result = await fetchProductByBarcode(barcode.trim());
        if (result) {
          setProduct(result);
          setIsCustomProduct(false);
          setShowPackageInfo(true);
          
          // Try to extract weight from serving size
          const match = result.servingSize?.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)/i);
          if (match) {
            setPackageWeight(match[1].replace(',', '.'));
          }
          
          const liquid = isLiquidProduct(result);
          setIsLiquid(liquid);
          
          if (liquid) {
            const volumeMl = getLiquidVolumeMl(result);
            setLiquidVolumeMl(volumeMl);
            setShowLiquidDialog(true);
          }
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    handleSearchWithBarcode(barcode);
  };

  const handleAddProduct = async () => {
    if (!product || !calculatedNutrition) return;
    
    // Validate package info
    if (!packageWeight || Number(packageWeight) <= 0) return;
    if (!itemsInPackage || Number(itemsInPackage) <= 0) return;
    
    if (saveForFuture && !isCustomProduct) {
      try {
        await saveProduct({
          barcode: product.code,
          name: product.name,
          brand: product.brand || null,
          image_url: product.imageUrl || null,
          calories: product.nutrition.calories,
          protein: product.nutrition.protein,
          carbs: product.nutrition.carbs,
          fat: product.nutrition.fat,
          saturated_fat: product.nutrition.saturatedFat || 0,
          trans_fat: product.nutrition.transFat || 0,
          fiber: product.nutrition.fiber || 0,
          sodium: product.nutrition.sodium || 0,
          reference_quantity: Number(packageWeight),
          reference_unit: 'g',
        });
      } catch (err) {
        console.error('Erro ao salvar produto:', err);
      }
    }
    
    onProductFound({ ...product, nutrition: calculatedNutrition }, effectiveGrams, false, 0);
  };

  const getPortionLabel = () => {
    const option = PORTION_OPTIONS.find(o => Math.abs(o.value - portionMultiplier) < 0.01);
    return option ? option.label : portionMultiplier.toFixed(2);
  };

  const handleLiquidConfirm = async (mlConsumed: number) => {
    if (!product) return;
    
    const nutritionForVolume = calculateNutritionForPortion(product.nutrition, mlConsumed);
    
    if (saveForFuture && !isCustomProduct) {
      try {
        await saveProduct({
          barcode: product.code,
          name: product.name,
          brand: product.brand || null,
          image_url: product.imageUrl || null,
          calories: product.nutrition.calories,
          protein: product.nutrition.protein,
          carbs: product.nutrition.carbs,
          fat: product.nutrition.fat,
          saturated_fat: product.nutrition.saturatedFat || 0,
          trans_fat: product.nutrition.transFat || 0,
          fiber: product.nutrition.fiber || 0,
          sodium: product.nutrition.sodium || 0,
          reference_quantity: 100,
          reference_unit: 'ml',
        });
      } catch (err) {
        console.error('Erro ao salvar produto:', err);
      }
    }
    
    onProductFound({ ...product, nutrition: nutritionForVolume }, mlConsumed, true, mlConsumed);
  };

  // Check if package info is complete
  const isPackageInfoComplete = Number(packageWeight) > 0 && Number(itemsInPackage) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm animate-scale-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card p-6 shadow-elevated animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Escanear Código de Barras</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {!product ? (
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
                {scanError ? (
                  <div className="rounded-xl bg-destructive/10 p-4 text-center">
                    <p className="text-sm text-destructive">{scanError}</p>
                    <div className="flex gap-2 justify-center mt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setScanMode('photo')}
                      >
                        Tirar foto
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setScanMode('manual')}
                      >
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
                      <p className="text-xs text-muted-foreground">
                        Toque na tela para focar
                      </p>
                      <Button 
                        variant="link" 
                        size="sm"
                        className="text-xs"
                        onClick={() => setScanMode('photo')}
                      >
                        Câmera não foca? Tire uma foto
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : scanMode === 'photo' ? (
              <div className="space-y-4">
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    O celular vai focar automaticamente na foto
                  </p>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  💡 Dica: Aproxime o celular do código de barras e espere focar antes de tirar a foto
                </p>
              </div>
            ) : (
              <div className="space-y-4">
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
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                  </Button>
                </div>

                <div className="rounded-2xl border-2 border-dashed border-muted p-6 text-center">
                  <Keyboard className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Digite o código de barras do produto
                  </p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm">Buscando produto...</span>
              </div>
            )}
          </div>
        ) : showLiquidDialog ? (
          <LiquidConsumptionDialog
            productName={product.name}
            defaultMl={liquidVolumeMl}
            onConfirm={handleLiquidConfirm}
            onCancel={() => setShowLiquidDialog(false)}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              {product.imageUrl && (
                <img src={product.imageUrl} alt={product.name} className="h-20 w-20 rounded-xl object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{product.name}</h3>
                  {isCustomProduct && <Star className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                </div>
                {product.brand && <p className="text-sm text-muted-foreground truncate">{product.brand}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Valores por 100g
                </p>
              </div>
            </div>

            {isLiquid && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowLiquidDialog(true)}
              >
                🥤 É uma bebida - Informar quantidade consumida
              </Button>
            )}

            {!isLiquid && (
              <>
                {/* Informações da embalagem - obrigatório */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium">Informações da Embalagem *</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Informe o peso total e quantidade de itens
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Peso total (g)</label>
                      <Input
                        type="number"
                        value={packageWeight}
                        onChange={(e) => setPackageWeight(e.target.value)}
                        placeholder="Ex: 200"
                        min="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Qtd de itens</label>
                      <Input
                        type="number"
                        value={itemsInPackage}
                        onChange={(e) => setItemsInPackage(e.target.value)}
                        placeholder="Ex: 20"
                        min="1"
                      />
                    </div>
                  </div>
                  {weightPerItem && (
                    <p className="mt-2 text-xs text-center text-amber-600 font-medium">
                      ≈ {weightPerItem.toFixed(1)}g por unidade
                    </p>
                  )}
                </div>

                {/* Modo de consumo - só aparece se tiver info da embalagem */}
                {isPackageInfoComplete && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Quanto você consumiu?</p>
                    
                    {/* Toggle modo de consumo */}
                    <div className="flex gap-1.5">
                      <Button
                        variant={consumptionMode === 'items' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setConsumptionMode('items')}
                      >
                        Unidades
                      </Button>
                      <Button
                        variant={consumptionMode === 'proportion' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setConsumptionMode('proportion')}
                      >
                        Porção
                      </Button>
                      <Button
                        variant={consumptionMode === 'grams' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setConsumptionMode('grams')}
                      >
                        Gramas
                      </Button>
                    </div>

                    {consumptionMode === 'items' && weightPerItem ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                          <div>
                            <span className="text-2xl font-bold">{consumedItems}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {consumedItems === 1 ? 'unidade' : 'unidades'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-semibold">{effectiveGrams}</span>
                            <span className="text-sm text-muted-foreground ml-1">g</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setConsumedItems(Math.max(1, consumedItems - 1))}
                            disabled={consumedItems <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="flex-1">
                            <Input
                              type="number"
                              min="1"
                              value={consumedItems}
                              onChange={(e) => setConsumedItems(Math.max(1, Number(e.target.value)))}
                              className="text-center"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setConsumedItems(consumedItems + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : consumptionMode === 'proportion' && totalProductWeight ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                          <div>
                            <span className="text-2xl font-bold">{getPortionLabel()}</span>
                            <span className="text-sm text-muted-foreground ml-2">do produto</span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-semibold">{effectiveGrams}</span>
                            <span className="text-sm text-muted-foreground ml-1">g</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {PORTION_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setPortionMultiplier(option.value)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                Math.abs(portionMultiplier - option.value) < 0.01
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary hover:bg-secondary/80'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setPortionMultiplier(Math.max(0.1, portionMultiplier - 0.1))}
                            disabled={portionMultiplier <= 0.1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="flex-1">
                            <Input
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={portionMultiplier}
                              onChange={(e) => setPortionMultiplier(Math.max(0.1, Number(e.target.value)))}
                              className="text-center"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setPortionMultiplier(portionMultiplier + 0.1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          type="number"
                          value={portionGrams}
                          onChange={(e) => setPortionGrams(Number(e.target.value))}
                          min={1}
                          max={2000}
                          placeholder="Quantidade em gramas"
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {calculatedNutrition && isPackageInfoComplete && (
              <NutritionDisplay nutrition={calculatedNutrition} showAll />
            )}

            {!isCustomProduct && (
              <label className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveForFuture}
                  onChange={(e) => setSaveForFuture(e.target.checked)}
                  className="rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Salvar para próximas vezes</p>
                  <p className="text-xs text-muted-foreground">O produto será lembrado com esses valores</p>
                </div>
                <Star className="h-4 w-4 text-amber-500" />
              </label>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setProduct(null)}>
                Voltar
              </Button>
              <Button 
                variant="gradient" 
                className="flex-1" 
                onClick={handleAddProduct}
                disabled={!isPackageInfoComplete}
              >
                <Check className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
