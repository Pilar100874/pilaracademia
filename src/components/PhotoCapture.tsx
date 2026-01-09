import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Camera, Upload, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { NutritionData } from '@/types/nutrition';
import { NutritionDisplay } from '@/components/NutritionDisplay';
import { LiquidConsumptionDialog } from '@/components/LiquidConsumptionDialog';

import { analyzeFood, fileToBase64, FoodAnalysisResult } from '@/lib/analyzeFood';

interface PhotoCaptureProps {
  onFoodAnalyzed: (name: string, nutrition: NutritionData, imageUrl: string, isLiquid?: boolean, liquidMl?: number) => void;
  onClose: () => void;
}

export function PhotoCapture({ onFoodAnalyzed, onClose }: PhotoCaptureProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  const [editedName, setEditedName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showLiquidDialog, setShowLiquidDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      // Se for líquido, mostrar diálogo de consumo
      if (result.isLiquid) {
        setShowLiquidDialog(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao analisar imagem';
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = () => {
    if (!analysisResult || !imageUrl) return;
    onFoodAnalyzed(editedName || analysisResult.name, analysisResult.nutrition, imageUrl, false, 0);
  };

  const handleLiquidConfirm = (mlConsumed: number) => {
    if (!analysisResult || !imageUrl) return;
    onFoodAnalyzed(editedName || analysisResult.name, analysisResult.nutrition, imageUrl, true, mlConsumed);
  };

  const resetCapture = () => {
    setImageUrl(null);
    setAnalysisResult(null);
    setEditedName('');
    setError(null);
    setShowLiquidDialog(false);
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!imageUrl ? (
          <div className="space-y-4">
            <Button variant="gradient" size="xl" className="w-full" onClick={() => fileInputRef.current?.click()}>
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

            <Button variant="outline" size="lg" className="w-full" onClick={() => fileInputRef.current?.click()}>
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

            {analysisResult && !isAnalyzing && !showLiquidDialog && (
              <>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do prato</label>
                  <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} placeholder="Nome do prato" />
                </div>

                <NutritionDisplay nutrition={analysisResult.nutrition} showAll />

                {analysisResult.isLiquid && (
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
                  <Button variant="outline" className="flex-1" onClick={resetCapture}>
                    Nova Foto
                  </Button>
                  <Button variant="gradient" className="flex-1" onClick={handleConfirm}>
                    Confirmar
                  </Button>
                </div>
              </>
            )}

            {error && !isAnalyzing && (
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={resetCapture}>
                  Nova Foto
                </Button>
                <Button variant="gradient" className="flex-1" onClick={() => fileInputRef.current?.click()}>
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
