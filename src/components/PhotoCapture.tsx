import { useState, useRef, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Camera, Upload, Loader2, Sparkles, AlertCircle, Package, HelpCircle, Flame, Droplets } from 'lucide-react';
import { NutritionData } from '@/types/nutrition';
import { NutritionDisplay } from '@/components/NutritionDisplay';
import { LiquidConsumptionDialog } from '@/components/LiquidConsumptionDialog';
import { ProductFormDialog } from '@/components/ProductFormDialog';
import { ProductConsumptionDialog } from '@/components/ProductConsumptionDialog';
import { CustomProduct } from '@/hooks/useCustomProducts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { analyzeFood, fileToBase64, FoodAnalysisResult } from '@/lib/analyzeFood';

interface PhotoCaptureProps {
  onFoodAnalyzed: (name: string, nutrition: NutritionData, imageUrl: string, isLiquid?: boolean, liquidMl?: number, grams?: number) => void;
  onClose: () => void;
  selectedDate?: Date;
}

// Floating macro badge component
function MacroBadge({ 
  label, 
  value, 
  unit, 
  color, 
  position 
}: { 
  label: string; 
  value: number; 
  unit: string; 
  color: 'orange' | 'green' | 'red' | 'violet';
  position: 'top' | 'left' | 'right' | 'bottom';
}) {
  const colorStyles = {
    orange: 'from-orange-500 to-orange-600 shadow-orange-500/30',
    green: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30',
    red: 'from-rose-500 to-rose-600 shadow-rose-500/30',
    violet: 'from-violet-500 to-violet-600 shadow-violet-500/30',
  };

  const positionStyles = {
    top: '-top-5 left-1/2 -translate-x-1/2',
    left: '-left-2 top-1/2 -translate-y-1/2',
    right: '-right-2 top-1/2 -translate-y-1/2',
    bottom: '-bottom-5 left-1/2 -translate-x-1/2',
  };

  const iconMap = {
    orange: <Flame className="h-3.5 w-3.5" />,
    green: <Droplets className="h-3.5 w-3.5" />,
    red: <span className="text-xs">🥩</span>,
    violet: <span className="text-xs">🍞</span>,
  };

  return (
    <div className={cn(
      "absolute z-20 animate-fade-in",
      positionStyles[position]
    )}>
      <div className={cn(
        "flex items-center gap-2 rounded-full bg-white/95 backdrop-blur-sm px-3 py-2 shadow-lg",
        "border border-white/50"
      )}>
        <div className={cn(
          "flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br text-white shadow-md",
          colorStyles[color]
        )}>
          {iconMap[color]}
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className="text-base font-bold text-gray-900">{value}<span className="text-xs font-medium text-gray-500">{unit}</span></span>
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        </div>
      </div>
    </div>
  );
}

// Scanning frame overlay
function ScanFrame() {
  return (
    <div className="absolute inset-8 pointer-events-none z-10">
      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-primary rounded-tl-xl" />
      <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-primary rounded-tr-xl" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-primary rounded-bl-xl" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-primary rounded-br-xl" />
    </div>
  );
}

export function PhotoCapture({ onFoodAnalyzed, onClose, selectedDate }: PhotoCaptureProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedGrams, setEditedGrams] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showLiquidDialog, setShowLiquidDialog] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showConsumptionDialog, setShowConsumptionDialog] = useState(false);
  const [savedProduct, setSavedProduct] = useState<CustomProduct | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // On mount, check if there's a pending camera image from before page unload
  useEffect(() => {
    const pendingImage = sessionStorage.getItem('pendingFoodImage');
    if (pendingImage) {
      sessionStorage.removeItem('pendingFoodImage');
      console.log('PhotoCapture: Recovered pending image from sessionStorage');
      setImageUrl(pendingImage);
      setIsAnalyzing(true);
      analyzeFood(pendingImage)
        .then((result) => {
          console.log('PhotoCapture: Recovered image analysis result:', result.name);
          if (result.confidence === 'baixa' || result.name === 'Prato não identificado' || result.nutrition.calories === 0) {
            toast.warning('Não foi possível reconhecer o alimento', {
              description: 'Tente tirar outra foto com melhor iluminação ou mais próxima do prato.',
              duration: 5000,
            });
          }
          setAnalysisResult(result);
          setEditedName(result.name);
          setEditedGrams(String(result.estimatedGrams || 300));
          if (result.isIndustrialized) {
            setShowProductForm(true);
          } else if (result.isLiquid) {
            setShowLiquidDialog(true);
          }
        })
        .catch((err) => {
          console.error('PhotoCapture: Recovered image error:', err);
          setError(err instanceof Error ? err.message : 'Erro ao analisar imagem');
          toast.error('Erro ao analisar foto', {
            description: 'Não foi possível identificar o alimento. Tente novamente ou registre manualmente.',
            duration: 5000,
          });
        })
        .finally(() => setIsAnalyzing(false));
    }
  }, []);

  const adjustedNutrition = useMemo(() => {
    if (!analysisResult) return null;
    const originalGrams = analysisResult.estimatedGrams || 300;
    const adjustedGrams = parseFloat(editedGrams) || originalGrams;
    const multiplier = adjustedGrams / originalGrams;
    return {
      calories: Math.round(analysisResult.nutrition.calories * multiplier),
      protein: Math.round(analysisResult.nutrition.protein * multiplier * 10) / 10,
      carbs: Math.round(analysisResult.nutrition.carbs * multiplier * 10) / 10,
      fat: Math.round(analysisResult.nutrition.fat * multiplier * 10) / 10,
      saturatedFat: Math.round((analysisResult.nutrition.saturatedFat || 0) * multiplier * 10) / 10,
      transFat: Math.round((analysisResult.nutrition.transFat || 0) * multiplier * 10) / 10,
      fiber: Math.round((analysisResult.nutrition.fiber || 0) * multiplier * 10) / 10,
      sodium: Math.round((analysisResult.nutrition.sodium || 0) * multiplier),
    };
  }, [analysisResult, editedGrams]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('PhotoCapture: handleFileSelect called, file:', file?.name, file?.size);
    if (!file) {
      console.log('PhotoCapture: No file selected');
      return;
    }

    setError(null);
    
    try {
      const base64 = await fileToBase64(file);
      console.log('PhotoCapture: base64 generated, length:', base64.length);
      
      // Clear input AFTER reading the file
      e.target.value = '';
      
      // Save to sessionStorage in case page unloads during camera capture
      try {
        sessionStorage.setItem('pendingFoodImage', base64);
      } catch (storageErr) {
        console.warn('PhotoCapture: Could not save to sessionStorage (image too large)');
      }
      
      setImageUrl(base64);
      setIsAnalyzing(true);

      const result = await analyzeFood(base64);
      sessionStorage.removeItem('pendingFoodImage');
      console.log('PhotoCapture: analysis result:', result.name);

      // Check if food was not recognized
      if (result.confidence === 'baixa' || result.name === 'Prato não identificado' || result.nutrition.calories === 0) {
        toast.warning('Não foi possível reconhecer o alimento', {
          description: 'Tente tirar outra foto com melhor iluminação ou mais próxima do prato.',
          duration: 5000,
        });
      }

      setAnalysisResult(result);
      setEditedName(result.name);
      setEditedGrams(String(result.estimatedGrams || 300));
      if (result.isIndustrialized) {
        setShowProductForm(true);
      } else if (result.isLiquid) {
        setShowLiquidDialog(true);
      }
    } catch (err) {
      sessionStorage.removeItem('pendingFoodImage');
      console.error('PhotoCapture: Error:', err);
      const message = err instanceof Error ? err.message : 'Erro ao analisar imagem';
      setError(message);
      toast.error('Erro ao analisar foto', {
        description: 'Não foi possível identificar o alimento. Tente novamente ou registre manualmente.',
        duration: 5000,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!analysisResult || !imageUrl || isConfirming || !adjustedNutrition) return;
    
    setIsConfirming(true);
    const grams = parseFloat(editedGrams) || 300;
    
    try {
      await onFoodAnalyzed(editedName || analysisResult.name, adjustedNutrition, imageUrl, false, 0, grams);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleLiquidConfirm = async (mlConsumed: number) => {
    if (!analysisResult || !imageUrl || isConfirming) return;
    setIsConfirming(true);
    try {
      await onFoodAnalyzed(editedName || analysisResult.name, analysisResult.nutrition, imageUrl, true, mlConsumed);
    } finally {
      setIsConfirming(false);
    }
  };

  const resetCapture = () => {
    setImageUrl(null);
    setAnalysisResult(null);
    setEditedName('');
    setEditedGrams('');
    setError(null);
    setShowLiquidDialog(false);
    setShowProductForm(false);
    setShowConsumptionDialog(false);
    setSavedProduct(null);
  };

  const handleProductSaved = (product: CustomProduct) => {
    setSavedProduct(product);
    setShowProductForm(false);
    setShowConsumptionDialog(true);
  };

  const handleConsumptionSuccess = () => {
    setShowConsumptionDialog(false);
    setSavedProduct(null);
    onClose();
  };

  const showResultOverlay = analysisResult && !isAnalyzing && !showLiquidDialog && !showProductForm && !showConsumptionDialog;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-neutral-200/50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="rounded-full bg-neutral-200/80 hover:bg-neutral-300/80 h-10 w-10"
        >
          <X className="h-5 w-5 text-neutral-700" />
        </Button>
        <h2 className="text-base font-semibold text-neutral-800">Escanear refeição</h2>
        <Button 
          variant="ghost" 
          size="icon"
          className="rounded-full bg-neutral-200/80 hover:bg-neutral-300/80 h-10 w-10"
        >
          <HelpCircle className="h-5 w-5 text-neutral-700" />
        </Button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
        {!imageUrl ? (
          <div className="w-full max-w-sm space-y-6">
            {/* Camera preview placeholder */}
            <div className="relative aspect-square rounded-[2rem] bg-gradient-to-br from-neutral-200 to-neutral-300 overflow-hidden shadow-xl">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                <div className="w-24 h-24 rounded-full bg-white/80 flex items-center justify-center shadow-lg">
                  <Camera className="h-12 w-12 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-neutral-700">Fotografe seu prato</p>
                  <p className="text-sm text-neutral-500 mt-1">A IA irá analisar os nutrientes</p>
                </div>
              </div>
              <ScanFrame />
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <Button 
                onClick={() => cameraInputRef.current?.click()}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-semibold text-base shadow-lg shadow-primary/30"
              >
                <Camera className="mr-2 h-5 w-5" />
                Tirar Foto
              </Button>
              <Button 
                variant="outline"
                onClick={() => galleryInputRef.current?.click()}
                className="w-full h-12 rounded-2xl border-2 border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-100"
              >
                <Upload className="mr-2 h-5 w-5" />
                Escolher da Galeria
              </Button>
            </div>

            {/* Info card */}
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-200/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-neutral-800 text-sm">Análise inteligente</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Detecta calorias, proteínas, carboidratos, gorduras, fibra e sódio automaticamente
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-4">
            {/* Image with floating badges */}
            <div className="relative">
              <div className="aspect-square rounded-[2rem] overflow-hidden shadow-2xl bg-neutral-200">
                <img 
                  src={imageUrl} 
                  alt="Prato capturado" 
                  className="w-full h-full object-cover"
                />
                
                {/* Scanning frame */}
                <ScanFrame />
                
                {/* Loading overlay */}
                {isAnalyzing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-30 rounded-[2rem]">
                    <div className="text-center p-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full border-4 border-white/20 border-t-primary animate-spin" />
                        <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-white" />
                      </div>
                      <p className="mt-4 text-lg font-semibold text-white">Analisando...</p>
                      <p className="text-sm text-white/70">Identificando nutrientes</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Floating macro badges - outside overflow-hidden */}
              {showResultOverlay && adjustedNutrition && (
                <>
                  <MacroBadge 
                    label="Calorias" 
                    value={adjustedNutrition.calories} 
                    unit="Kcal" 
                    color="orange" 
                    position="top" 
                  />
                  <MacroBadge 
                    label="Gordura" 
                    value={adjustedNutrition.fat} 
                    unit="g" 
                    color="green" 
                    position="left" 
                  />
                  <MacroBadge 
                    label="Proteína" 
                    value={adjustedNutrition.protein} 
                    unit="g" 
                    color="red" 
                    position="right" 
                  />
                  <MacroBadge 
                    label="Carbos" 
                    value={adjustedNutrition.carbs} 
                    unit="g" 
                    color="violet" 
                    position="bottom" 
                  />
                </>
              )}
            </div>

            {/* Error state */}
            {error && !isAnalyzing && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700">Erro na análise</p>
                  <p className="text-sm text-red-600/80 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Dialogs */}
            {analysisResult && !isAnalyzing && showLiquidDialog && (
              <LiquidConsumptionDialog
                productName={editedName || analysisResult.name}
                defaultMl={analysisResult.volumeMl || 250}
                onConfirm={handleLiquidConfirm}
                onCancel={() => setShowLiquidDialog(false)}
              />
            )}

            {analysisResult && !isAnalyzing && showProductForm && (
              <ProductFormDialog
                open={showProductForm}
                onOpenChange={(open) => {
                  if (!open) setShowProductForm(false);
                }}
                initialBarcode={`PHOTO_${Date.now()}`}
                initialData={{
                  name: editedName || analysisResult.name,
                  brand: analysisResult.brand,
                  imageUrl: imageUrl || undefined,
                  calories: analysisResult.nutrition.calories,
                  protein: analysisResult.nutrition.protein,
                  carbs: analysisResult.nutrition.carbs,
                  fat: analysisResult.nutrition.fat,
                  fiber: analysisResult.nutrition.fiber,
                  sodium: analysisResult.nutrition.sodium,
                  saturatedFat: analysisResult.nutrition.saturatedFat,
                  transFat: analysisResult.nutrition.transFat,
                  isLiquid: analysisResult.isLiquid,
                  packageWeight: analysisResult.packageWeight,
                  referenceQuantity: analysisResult.referenceQuantity,
                }}
                onProductSaved={handleProductSaved}
                title="Cadastrar Produto Industrializado"
              />
            )}

            {showConsumptionDialog && savedProduct && (
              <ProductConsumptionDialog
                product={savedProduct}
                open={showConsumptionDialog}
                onOpenChange={(open) => {
                  if (!open) {
                    setShowConsumptionDialog(false);
                    setSavedProduct(null);
                  }
                }}
                onSuccess={handleConsumptionSuccess}
                onBack={() => {
                  setShowConsumptionDialog(false);
                  setSavedProduct(null);
                  setShowProductForm(true);
                }}
                selectedDate={selectedDate}
              />
            )}

            {/* Result form */}
            {showResultOverlay && (
              <div className="space-y-4 bg-white rounded-2xl p-4 shadow-sm border border-neutral-200/50">
                {/* Industrialized product indicator */}
                {analysisResult.isIndustrialized && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                    <Package className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-700">Produto industrializado</p>
                      <p className="text-xs text-amber-600/80">Cadastre os dados da embalagem</p>
                    </div>
                  </div>
                )}

                {/* Editable fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-neutral-500">Nome</label>
                    <Input 
                      value={editedName} 
                      onChange={(e) => setEditedName(e.target.value)} 
                      placeholder="Nome do prato" 
                      className="h-11 rounded-xl border-neutral-300 text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-neutral-500">Peso (g)</label>
                    <Input 
                      type="number"
                      inputMode="numeric"
                      value={editedGrams} 
                      onChange={(e) => setEditedGrams(e.target.value)} 
                      placeholder="300"
                      className="h-11 rounded-xl border-neutral-300 text-base"
                    />
                  </div>
                </div>

                {/* Detailed nutrition display */}
                <NutritionDisplay nutrition={adjustedNutrition} showAll />

                {/* Action buttons */}
                <div className="space-y-2 pt-2">
                  {analysisResult.isIndustrialized && (
                    <Button
                      variant="outline"
                      className="w-full h-11 rounded-xl"
                      onClick={() => setShowProductForm(true)}
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Cadastrar com dados da embalagem
                    </Button>
                  )}

                  {analysisResult.isLiquid && !analysisResult.isIndustrialized && (
                    <Button
                      variant="outline"
                      className="w-full h-11 rounded-xl"
                      onClick={() => setShowLiquidDialog(true)}
                    >
                      🥤 É uma bebida - Informar quantidade
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-11 rounded-xl" 
                      onClick={resetCapture} 
                      disabled={isConfirming}
                    >
                      Nova Foto
                    </Button>
                    {!analysisResult.isIndustrialized && (
                      <Button 
                        onClick={handleConfirm}
                        disabled={isConfirming}
                        className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-semibold shadow-lg shadow-primary/20"
                      >
                        {isConfirming ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          'Confirmar'
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-center text-[11px] text-neutral-400">
                  * Valores estimados pela IA. Podem variar conforme porções reais.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
