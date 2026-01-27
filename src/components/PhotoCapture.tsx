import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Camera, Upload, Loader2, Sparkles, AlertCircle, Package } from 'lucide-react';
import { NutritionData } from '@/types/nutrition';
import { NutritionDisplay } from '@/components/NutritionDisplay';
import { LiquidConsumptionDialog } from '@/components/LiquidConsumptionDialog';
import { ProductFormDialog } from '@/components/ProductFormDialog';
import { ProductConsumptionDialog } from '@/components/ProductConsumptionDialog';
import { CustomProduct } from '@/hooks/useCustomProducts';

import { analyzeFood, fileToBase64, FoodAnalysisResult } from '@/lib/analyzeFood';

interface PhotoCaptureProps {
  onFoodAnalyzed: (name: string, nutrition: NutritionData, imageUrl: string, isLiquid?: boolean, liquidMl?: number, grams?: number) => void;
  onClose: () => void;
  selectedDate?: Date;
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const base64 = await fileToBase64(file);
    setImageUrl(base64);
    setIsAnalyzing(true);

    try {
      const result = await analyzeFood(base64);
      setAnalysisResult(result);
      setEditedName(result.name);
      setEditedGrams(String(result.estimatedGrams || 300));
      // Se for produto industrializado, mostrar formulário de cadastro completo
      if (result.isIndustrialized) {
        setShowProductForm(true);
      }
      // Se for líquido (mas não industrializado), mostrar diálogo de consumo
      else if (result.isLiquid) {
        setShowLiquidDialog(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao analisar imagem';
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!analysisResult || !imageUrl || isConfirming) return;
    
    setIsConfirming(true);
    
    // Calculate nutrition based on adjusted grams
    const originalGrams = analysisResult.estimatedGrams || 300;
    const adjustedGrams = parseFloat(editedGrams) || originalGrams;
    const multiplier = adjustedGrams / originalGrams;
    
    const adjustedNutrition = {
      calories: Math.round(analysisResult.nutrition.calories * multiplier),
      protein: Math.round(analysisResult.nutrition.protein * multiplier * 10) / 10,
      carbs: Math.round(analysisResult.nutrition.carbs * multiplier * 10) / 10,
      fat: Math.round(analysisResult.nutrition.fat * multiplier * 10) / 10,
      saturatedFat: Math.round((analysisResult.nutrition.saturatedFat || 0) * multiplier * 10) / 10,
      transFat: Math.round((analysisResult.nutrition.transFat || 0) * multiplier * 10) / 10,
      fiber: Math.round((analysisResult.nutrition.fiber || 0) * multiplier * 10) / 10,
      sodium: Math.round((analysisResult.nutrition.sodium || 0) * multiplier),
    };
    
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

  const confidenceColors = {
    alta: 'text-primary bg-primary/10',
    média: 'text-accent bg-accent/10',
    baixa: 'text-muted-foreground bg-muted',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm animate-scale-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card p-6 shadow-elevated animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Analisar Prato com IA</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Input para câmera */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        {/* Input para galeria (sem capture) */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!imageUrl ? (
          <div className="space-y-4">
            <Button variant="gradient" size="xl" className="w-full" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="mr-2 h-5 w-5" />
              Tirar Foto
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <Button variant="outline" size="lg" className="w-full" onClick={() => galleryInputRef.current?.click()}>
              <Upload className="mr-2 h-5 w-5" />
              Escolher da Galeria
            </Button>

            <div className="rounded-2xl bg-secondary/50 p-4 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                A IA irá analisar: <strong>calorias, proteínas, carboidratos, gorduras (total, saturada, trans), fibra e sódio</strong>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl">
              <img src={imageUrl} alt="Prato capturado" className="w-full aspect-square object-cover" />
              {isAnalyzing && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="text-center p-6">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-base font-semibold">Aguarde, analisando...</p>
                    <p className="mt-1 text-sm text-muted-foreground">A IA está identificando os alimentos</p>
                  </div>
                </div>
              )}
              {/* Calories overlay on photo */}
              {analysisResult && !isAnalyzing && (
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="bg-black/70 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🔥</span>
                      <div>
                        <p className="text-white text-2xl font-bold leading-none">
                          {(() => {
                            const originalGrams = analysisResult.estimatedGrams || 300;
                            const adjustedGrams = parseFloat(editedGrams) || originalGrams;
                            const multiplier = adjustedGrams / originalGrams;
                            return Math.round(analysisResult.nutrition.calories * multiplier);
                          })()}
                        </p>
                        <p className="text-white/70 text-xs">calorias</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-sm font-medium truncate max-w-[150px]">
                        {editedName || analysisResult.name}
                      </p>
                      <p className="text-white/60 text-xs">{editedGrams || analysisResult.estimatedGrams || 300}g</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && !isAnalyzing && (
              <div className="rounded-xl bg-destructive/10 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Erro na análise</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            )}

            {analysisResult && !isAnalyzing && showLiquidDialog && (
              <LiquidConsumptionDialog
                productName={editedName || analysisResult.name}
                defaultMl={analysisResult.volumeMl || 250}
                onConfirm={handleLiquidConfirm}
                onCancel={() => setShowLiquidDialog(false)}
              />
            )}

            {/* Product Form Dialog for industrialized products */}
            {analysisResult && !isAnalyzing && showProductForm && (
              <ProductFormDialog
                open={showProductForm}
                onOpenChange={(open) => {
                  if (!open) {
                    setShowProductForm(false);
                  }
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

            {/* Product Consumption Dialog */}
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

            {analysisResult && !isAnalyzing && !showLiquidDialog && !showProductForm && !showConsumptionDialog && (
              <>
                {/* Industrialized product indicator */}
                {analysisResult.isIndustrialized && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
                    <Package className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-600">Produto industrializado detectado</p>
                      <p className="text-xs text-muted-foreground">Cadastre as informações da embalagem para cálculos precisos</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium ${confidenceColors[analysisResult.confidence]}`}>
                    Confiança: {analysisResult.confidence}
                  </span>
                  {analysisResult.items.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {analysisResult.items.slice(0, 3).join(', ')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Nome do prato</label>
                    <Input 
                      value={editedName} 
                      onChange={(e) => setEditedName(e.target.value)} 
                      placeholder="Nome do prato" 
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Peso estimado (g)</label>
                    <Input 
                      type="number"
                      inputMode="numeric"
                      value={editedGrams} 
                      onChange={(e) => setEditedGrams(e.target.value)} 
                      placeholder="300"
                      className="h-11 text-base"
                    />
                  </div>
                </div>

                <NutritionDisplay 
                  nutrition={(() => {
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
                  })()}
                  showAll 
                />

                {analysisResult.isIndustrialized && (
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => setShowProductForm(true)}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Cadastrar com dados da embalagem
                  </Button>
                )}

                {analysisResult.isLiquid && !analysisResult.isIndustrialized && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowLiquidDialog(true)}
                  >
                    🥤 É uma bebida - Informar quantidade consumida
                  </Button>
                )}

                <p className="text-center text-xs text-muted-foreground">
                  * Valores estimados pela IA. Podem variar conforme porções reais.
                </p>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={resetCapture} disabled={isConfirming}>
                    Nova Foto
                  </Button>
                  {!analysisResult.isIndustrialized && (
                    <Button variant="gradient" className="flex-1" onClick={handleConfirm} disabled={isConfirming}>
                      {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isConfirming ? 'Salvando...' : 'Confirmar'}
                    </Button>
                  )}
                </div>
              </>
            )}

            {error && !isAnalyzing && (
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={resetCapture}>
                  Nova Foto
                </Button>
                <Button variant="gradient" className="flex-1" onClick={() => cameraInputRef.current?.click()}>
                  Tentar Novamente
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
