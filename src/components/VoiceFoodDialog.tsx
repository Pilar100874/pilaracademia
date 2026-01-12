import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

// Check for browser speech recognition support
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

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
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);

  const isSupported = !!SpeechRecognition;

  // Reset state when dialog opens
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
      shouldRestartRef.current = false;
      
      // Cleanup any existing recognition
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

  // Cleanup on unmount
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

    // Create fresh recognition instance each time
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Single result mode to avoid duplicates
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
        setError('Permissão de microfone negada. Por favor, permita o acesso ao microfone.');
        shouldRestartRef.current = false;
      } else if (event.error === 'no-speech') {
        // Will retry automatically via onend
      } else if (event.error === 'aborted') {
        // User stopped, don't show error
        shouldRestartRef.current = false;
      } else {
        setError('Erro no reconhecimento de voz. Tente novamente.');
        shouldRestartRef.current = false;
      }
    };

    recognition.onend = () => {
      // Only restart if we should continue listening
      if (shouldRestartRef.current) {
        try {
          setTimeout(() => {
            if (shouldRestartRef.current && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        } catch {
          // Failed to restart
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

    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error('Failed to start recognition:', e);
      setError('Não foi possível iniciar o reconhecimento de voz.');
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

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      toast.error('Diga os alimentos que você consumiu');
      return;
    }

    // Stop listening before analyzing
    stopListening();

    setIsAnalyzing(true);
    setError(null);

    try {
      // Parse transcript into items
      // Split by common separators like "e", ",", "mais"
      const rawItems = transcript
        .replace(/\s+e\s+/gi, ', ')
        .replace(/\s+mais\s+/gi, ', ')
        .split(/[,;]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      if (rawItems.length === 0) {
        throw new Error('Nenhum alimento identificado. Tente falar novamente.');
      }

      console.log('Raw items parsed:', rawItems);

      // Create items with best-guess quantity extraction
      const items = rawItems.map(item => {
        // Try to extract quantity from the item text
        // Patterns like "100g de picanha", "2 colheres de arroz", "um pouco de feijão"
        const quantityMatch = item.match(/^(\d+(?:[.,]\d+)?)\s*(g|gr|gramas?|kg|ml|l|colheres?|xícaras?|unidades?|fatias?|pedaços?|porções?)?\s*(?:de\s+)?(.+)/i);
        
        if (quantityMatch) {
          const [, num, unit, food] = quantityMatch;
          const unitStr = unit ? `${num}${unit}` : `${num}g`;
          return { food: food.trim(), quantity: unitStr };
        }

        // Check for patterns like "uma colher de", "um pouco de"
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

        // Default: assume it's just a food with implied quantity
        return { food: item, quantity: '1 porção' };
      });

      console.log('Items to analyze:', items);

      const { data, error: invokeError } = await supabase.functions.invoke('analyze-food-text', {
        body: { items },
      });

      console.log('API response:', data, 'Error:', invokeError);

      if (invokeError) {
        console.error('Invoke error:', invokeError);
        throw new Error(invokeError.message || 'Erro ao conectar com o servidor');
      }

      if (!data) {
        throw new Error('Resposta vazia do servidor');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao analisar alimentos');
      }

      const result = data.data;
      
      if (!result || !result.items || !result.total) {
        console.error('Invalid result structure:', result);
        throw new Error('Formato de resposta inválido');
      }

      console.log('Analysis result:', result);

      const entryName = customName.trim() || 'Gravado';

      // Call onSave with validated data
      try {
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

        // Reset form only after successful save
        setTranscript('');
        setCustomName('Gravado');
        onOpenChange(false);
        toast.success('Alimentos registrados com sucesso!');
      } catch (saveError) {
        console.error('Error saving entry:', saveError);
        throw new Error('Erro ao salvar o registro. Tente novamente.');
      }
    } catch (error) {
      console.error('Error analyzing foods:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(errorMessage);
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
            <p className="text-xs text-muted-foreground mt-2">
              Tente usar o Chrome ou Safari em um dispositivo mais recente.
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
          {/* Custom name input */}
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

          {/* Voice input area */}
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {isListening 
                ? 'Fale os alimentos e quantidades...' 
                : 'Toque no microfone para começar'}
            </p>

            {/* Mic button */}
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

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Transcript display */}
          {(transcript || interimText) && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                O que você disse:
              </label>
              <div className="p-3 rounded-xl bg-muted/50 min-h-[80px]">
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

          {/* Help text */}
          <div className="p-3 rounded-xl bg-muted/30 text-xs text-muted-foreground space-y-1">
            <p className="font-medium">💡 Dicas:</p>
            <p>• "100 gramas de picanha, 2 colheres de arroz e uma colher de feijão"</p>
            <p>• "um filé de frango, salada e meio copo de suco"</p>
          </div>
        </div>

        {/* Actions */}
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
      </DialogContent>
    </Dialog>
  );
}
