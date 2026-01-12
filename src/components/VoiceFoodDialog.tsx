import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mic, MicOff, Loader2, Volume2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AnalyzedItem {
  name: string;
  quantity: string;
  quantityGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface VoiceFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    items: AnalyzedItem[];
    total: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      saturatedFat: number;
      transFat: number;
      fiber: number;
      sodium: number;
    };
  }) => void;
  initialItems?: AnalyzedItem[];
  initialName?: string;
  isEditing?: boolean;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface FallbackData {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export function VoiceFoodDialog({
  open,
  onOpenChange,
  onSave,
  initialItems,
  initialName,
  isEditing = false,
}: VoiceFoodDialogProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showFallbackForm, setShowFallbackForm] = useState(false);
  const [fallbackData, setFallbackData] = useState<FallbackData>({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);

  const isSupported = !!SpeechRecognition;

  useEffect(() => {
    if (open) {
      if (isEditing && initialItems && initialItems.length > 0) {
        const transcriptText = initialItems
          .map(item => `${item.quantity} de ${item.name}`)
          .join(', ');
        setTranscript(transcriptText);
        setCustomName(initialName || 'Gravado');
      } else {
        setTranscript('');
        setCustomName('Gravado');
      }
      setInterimText('');
      setError(null);
      setIsListening(false);
      setShowFallbackForm(false);
      setFallbackData({ name: '', calories: '', protein: '', carbs: '', fat: '' });
      shouldRestartRef.current = false;
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Already stopped
        }
        recognitionRef.current = null;
      }
    }
  }, [open, isEditing, initialItems, initialName]);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Already stopped
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = () => {
    if (!isSupported) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimTextResult = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimTextResult += result[0].transcript;
        }
      }

      setInterimText(interimTextResult);

      if (finalText) {
        setTranscript(prev => {
          const trimmedFinal = finalText.trim();
          if (!prev) return trimmedFinal;
          return prev + ', ' + trimmedFinal;
        });
        setInterimText('');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Permissão de microfone negada.');
        shouldRestartRef.current = false;
      } else if (event.error === 'no-speech') {
        // Will retry
      } else if (event.error === 'aborted') {
        shouldRestartRef.current = false;
      } else {
        setError('Erro no reconhecimento. Tente novamente.');
        shouldRestartRef.current = false;
      }
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try {
          setTimeout(() => {
            if (shouldRestartRef.current && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        } catch {
          shouldRestartRef.current = false;
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;
    setError(null);
    setInterimText('');
    setShowFallbackForm(false);

    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error('Failed to start recognition:', e);
      setError('Não foi possível iniciar o reconhecimento.');
      shouldRestartRef.current = false;
    }
  };

  const stopListening = () => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
    }
    setIsListening(false);
    setInterimText('');
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleFallbackSave = async () => {
    const name = fallbackData.name.trim() || transcript.trim() || 'Refeição';
    const calories = parseFloat(fallbackData.calories) || 0;
    const protein = parseFloat(fallbackData.protein) || 0;
    const carbs = parseFloat(fallbackData.carbs) || 0;
    const fat = parseFloat(fallbackData.fat) || 0;

    if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
      toast.error('Informe pelo menos um valor nutricional');
      return;
    }

    try {
      await onSave({
        name: customName.trim() || 'Gravado',
        items: [{
          name,
          quantity: '1 porção',
          quantityGrams: 100,
          calories,
          protein,
          carbs,
          fat,
        }],
        total: {
          calories,
          protein,
          carbs,
          fat,
          saturatedFat: 0,
          transFat: 0,
          fiber: 0,
          sodium: 0,
        },
      });

      setTranscript('');
      setCustomName('Gravado');
      setFallbackData({ name: '', calories: '', protein: '', carbs: '', fat: '' });
      setShowFallbackForm(false);
      onOpenChange(false);
      toast.success('Alimento registrado com sucesso!');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erro ao salvar. Tente novamente.');
    }
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      toast.error('Diga os alimentos que você consumiu');
      return;
    }

    stopListening();
    setIsAnalyzing(true);
    setError(null);

    try {
      const rawItems = transcript
        .replace(/\s+e\s+/gi, ', ')
        .replace(/\s+mais\s+/gi, ', ')
        .split(/[,;]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      if (rawItems.length === 0) {
        throw new Error('Nenhum alimento identificado.');
      }

      const items = rawItems.map(item => {
        const quantityMatch = item.match(/^(\d+(?:[.,]\d+)?)\s*(g|gr|gramas?|kg|ml|l|colheres?|xícaras?|unidades?|fatias?|pedaços?|porções?)?\s*(?:de\s+)?(.+)/i);
        
        if (quantityMatch) {
          const [, num, unit, food] = quantityMatch;
          const unitStr = unit ? `${num}${unit}` : `${num}g`;
          return { food: food.trim(), quantity: unitStr };
        }

        const textQuantityMatch = item.match(/^(um|uma|dois|duas|três|quatro|cinco|meia|meio|um pouco)\s*(colheres?|xícaras?|fatias?|pedaços?|porções?)?\s*(?:de\s+)?(.+)/i);
        
        if (textQuantityMatch) {
          const [, num, unit, food] = textQuantityMatch;
          const quantityMap: Record<string, string> = {
            'um': '1', 'uma': '1', 'dois': '2', 'duas': '2', 
            'três': '3', 'quatro': '4', 'cinco': '5',
            'meia': '0.5', 'meio': '0.5', 'um pouco': '1 porção'
          };
          const numStr = quantityMap[num.toLowerCase()] || '1';
          const unitStr = unit || 'porção';
          return { food: food.trim(), quantity: `${numStr} ${unitStr}` };
        }

        return { food: item, quantity: '1 porção' };
      });

      const { data, error: invokeError } = await supabase.functions.invoke('analyze-food-text', {
        body: { items },
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Erro ao conectar com o servidor');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro ao analisar alimentos');
      }

      const result = data.data;
      
      if (!result || !result.items || !result.total) {
        throw new Error('Dados insuficientes na análise');
      }

      const entryName = customName.trim() || 'Gravado';

      await onSave({
        name: entryName,
        items: result.items.map((item: any) => ({
          name: item.name || 'Alimento',
          quantity: item.quantity || '1 porção',
          quantityGrams: item.quantityGrams || 100,
          calories: item.calories || 0,
          protein: item.protein || 0,
          carbs: item.carbs || 0,
          fat: item.fat || 0,
        })),
        total: {
          calories: result.total.calories || 0,
          protein: result.total.protein || 0,
          carbs: result.total.carbs || 0,
          fat: result.total.fat || 0,
          saturatedFat: result.total.saturatedFat || 0,
          transFat: result.total.transFat || 0,
          fiber: result.total.fiber || 0,
          sodium: result.total.sodium || 0,
        },
      });

      setTranscript('');
      setCustomName('Gravado');
      onOpenChange(false);
      toast.success('Alimentos registrados com sucesso!');
    } catch (error) {
      console.error('Error analyzing foods:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      setShowFallbackForm(true);
      setFallbackData(prev => ({ ...prev, name: transcript.trim() }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    stopListening();
    if (!isEditing) {
      setTranscript('');
      setCustomName('Gravado');
    }
    setInterimText('');
    setError(null);
    setShowFallbackForm(false);
    setFallbackData({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    onOpenChange(false);
  };

  if (!isSupported) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Não suportado
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Seu navegador não suporta reconhecimento de voz.
            </p>
          </div>
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Mic className="h-4 w-4" />
            Falar Alimentos
          </DialogTitle>
          <DialogDescription className="sr-only">
            Fale os alimentos que você consumiu para registrá-los
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Nome do registro (opcional)
            </label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ex: Almoço, Lanche..."
              className="h-11 text-base"
            />
          </div>

          {showFallbackForm ? (
            <div className="space-y-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="text-center">
                <p className="text-sm font-medium text-amber-600">
                  ⚠️ Não foi possível analisar automaticamente
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete os dados nutricionais abaixo:
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <Input
                  value={fallbackData.name}
                  onChange={(e) => setFallbackData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Arroz, feijão e frango"
                  className="h-11 text-base mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Calorias</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={fallbackData.calories}
                    onChange={(e) => setFallbackData(prev => ({ ...prev, calories: e.target.value }))}
                    placeholder="kcal"
                    className="h-11 text-base mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Proteína</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={fallbackData.protein}
                    onChange={(e) => setFallbackData(prev => ({ ...prev, protein: e.target.value }))}
                    placeholder="g"
                    className="h-11 text-base mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Carboidratos</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={fallbackData.carbs}
                    onChange={(e) => setFallbackData(prev => ({ ...prev, carbs: e.target.value }))}
                    placeholder="g"
                    className="h-11 text-base mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Gordura</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={fallbackData.fat}
                    onChange={(e) => setFallbackData(prev => ({ ...prev, fat: e.target.value }))}
                    placeholder="g"
                    className="h-11 text-base mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowFallbackForm(false);
                    setError(null);
                  }}
                >
                  Tentar novamente
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleFallbackSave}
                >
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  {isListening 
                    ? 'Fale os alimentos e quantidades...' 
                    : 'Toque no microfone para começar'}
                </p>

                <button
                  onClick={toggleListening}
                  disabled={isAnalyzing}
                  className={cn(
                    "mx-auto flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300",
                    isListening 
                      ? "bg-destructive animate-pulse shadow-lg shadow-destructive/30" 
                      : "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
                  )}
                >
                  {isListening ? (
                    <MicOff className="h-8 w-8 text-white" />
                  ) : (
                    <Mic className="h-8 w-8 text-white" />
                  )}
                </button>

                {isListening && (
                  <div className="flex items-center justify-center gap-1 animate-fade-in">
                    <Volume2 className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-xs text-primary font-medium">Ouvindo...</span>
                  </div>
                )}

                {error && !showFallbackForm && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
              </div>

              {(transcript || interimText) && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    O que você disse:
                  </label>
                  <div className="p-3 rounded-xl bg-muted/50 min-h-[60px]">
                    <p className="text-sm">
                      {transcript}
                      {interimText && (
                        <span className="text-muted-foreground italic">
                          {transcript ? ' ' : ''}{interimText}
                        </span>
                      )}
                    </p>
                  </div>
                  {transcript && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setTranscript('');
                        setInterimText('');
                      }}
                    >
                      Limpar e falar novamente
                    </Button>
                  )}
                </div>
              )}

              <div className="p-3 rounded-xl bg-muted/30 text-xs text-muted-foreground space-y-1">
                <p className="font-medium">💡 Dicas:</p>
                <p>• "100 gramas de picanha, 2 colheres de arroz"</p>
                <p>• "um filé de frango, salada e suco"</p>
              </div>
            </>
          )}
        </div>

        {!showFallbackForm && (
          <div className="flex gap-2 pt-3 border-t">
            <Button
              variant="outline"
              className="flex-1 h-12 text-base"
              onClick={handleClose}
              disabled={isAnalyzing}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 h-12 text-base"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !transcript.trim()}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
