import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Camera, Upload, Loader2, Sparkles } from 'lucide-react';
import { NutritionData } from '@/types/nutrition';
import { toast } from 'sonner';

interface PhotoCaptureProps {
  onFoodAnalyzed: (name: string, nutrition: NutritionData, imageUrl: string) => void;
  onClose: () => void;
}

// Simulated AI analysis - In production, this would call an AI API
const simulateAIAnalysis = async (imageUrl: string): Promise<{ name: string; nutrition: NutritionData }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Return mock data - in production, this would be real AI analysis
  const mockFoods = [
    { name: 'Arroz com Feijão e Frango', nutrition: { calories: 450, protein: 35, carbs: 55, fat: 12 } },
    { name: 'Salada Caesar com Frango', nutrition: { calories: 380, protein: 28, carbs: 18, fat: 22 } },
    { name: 'Macarrão à Bolonhesa', nutrition: { calories: 520, protein: 22, carbs: 65, fat: 18 } },
    { name: 'Prato de Frutas', nutrition: { calories: 180, protein: 3, carbs: 42, fat: 1 } },
    { name: 'Omelete com Legumes', nutrition: { calories: 280, protein: 18, carbs: 8, fat: 20 } },
  ];
  
  return mockFoods[Math.floor(Math.random() * mockFoods.length)];
};

export function PhotoCapture({ onFoodAnalyzed, onClose }: PhotoCaptureProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ name: string; nutrition: NutritionData } | null>(null);
  const [editedName, setEditedName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setIsAnalyzing(true);

    try {
      const result = await simulateAIAnalysis(url);
      setAnalysisResult(result);
      setEditedName(result.name);
      toast.success('Análise concluída!');
    } catch {
      toast.error('Erro ao analisar imagem');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = () => {
    if (!analysisResult || !imageUrl) return;
    onFoodAnalyzed(editedName || analysisResult.name, analysisResult.nutrition, imageUrl);
  };

  const resetCapture = () => {
    setImageUrl(null);
    setAnalysisResult(null);
    setEditedName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm animate-scale-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card p-6 shadow-elevated animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Analisar Prato</h2>
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
          <>
            {/* Capture Options */}
            <div className="space-y-4">
              <Button
                variant="gradient"
                size="xl"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
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

              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-5 w-5" />
                Escolher da Galeria
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                A IA irá analisar seu prato e estimar as calorias e nutrientes
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Image Preview & Analysis */}
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src={imageUrl}
                  alt="Prato capturado"
                  className="w-full aspect-square object-cover"
                />
                {isAnalyzing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                    <div className="text-center">
                      <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                      <p className="mt-2 text-sm font-medium">Analisando prato...</p>
                    </div>
                  </div>
                )}
              </div>

              {analysisResult && !isAnalyzing && (
                <>
                  {/* Editable Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome do prato</label>
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="Nome do prato"
                    />
                  </div>

                  {/* Nutrition Results */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-primary/10 p-3 text-center">
                      <p className="text-2xl font-bold text-primary">
                        {analysisResult.nutrition.calories}
                      </p>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                    <div className="rounded-xl bg-accent/10 p-3 text-center">
                      <p className="text-2xl font-bold text-accent">
                        {analysisResult.nutrition.protein}g
                      </p>
                      <p className="text-xs text-muted-foreground">proteína</p>
                    </div>
                    <div className="rounded-xl bg-blue-500/10 p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {analysisResult.nutrition.carbs}g
                      </p>
                      <p className="text-xs text-muted-foreground">carboidratos</p>
                    </div>
                    <div className="rounded-xl bg-pink-500/10 p-3 text-center">
                      <p className="text-2xl font-bold text-pink-600">
                        {analysisResult.nutrition.fat}g
                      </p>
                      <p className="text-xs text-muted-foreground">gordura</p>
                    </div>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    * Valores estimados pela IA. Podem variar conforme porções.
                  </p>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={resetCapture}
                    >
                      Nova Foto
                    </Button>
                    <Button
                      variant="gradient"
                      className="flex-1"
                      onClick={handleConfirm}
                    >
                      Confirmar
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
