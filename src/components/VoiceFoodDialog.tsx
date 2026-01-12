import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSupported = !!SpeechRecognition;

  useEffect(() => {
    if (open) {
      // When editing, pre-fill with initial data
      if (isEditing && initialItems && initialItems.length > 0) {
        // Convert items to transcript format
        const transcriptText = initialItems
          .map(item => `${item.quantity} de ${item.name}`)
          .join(', ');
        setTranscript(transcriptText);
        setCustomName(initialName || 'Gravado');
      } else {
        // New entry - pre-fill with "Gravado"
        setTranscript('');
        setCustomName('Gravado');
      }
      setError(null);
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, [open, isEditing, initialItems, initialName]);

  useEffect(() => {
    if (!isSupported || !open) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Permissão de microfone negada. Por favor, permita o acesso ao microfone.');
      } else if (event.error === 'no-speech') {
        // Ignore no-speech errors during continuous listening
      } else {
        setError('Erro no reconhecimento de voz. Tente novamente.');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      // Only restart if still listening
      if (isListening && recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isSupported, open, isListening]);

  const toggleListening = async () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start recognition:', e);
        setError('Não foi possível iniciar o reconhecimento de voz.');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      toast.error('Diga os alimentos que você consumiu');
      return;
    }

    // Stop listening before analyzing
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setIsAnalyzing(true);

    try {
      // Parse transcript into items
      // Split by common separators like "e", ",", "mais"
      const rawItems = transcript
        .replace(/\s+e\s+/gi, ', ')
        .replace(/\s+mais\s+/gi, ', ')
        .split(/[,;]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

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

      const { data, error } = await supabase.functions.invoke('analyze-food-text', {
        body: { items },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao analisar alimentos');
      }

      const result = data.data;
      const entryName = customName.trim() || 'Alimentos por voz';

      onSave({
        name: entryName,
        items: result.items,
        total: result.total,
      });

      // Reset form
      setTranscript('');
      setCustomName('');
      onOpenChange(false);
      toast.success('Alimentos registrados com sucesso!');
    } catch (error) {
      console.error('Error analyzing foods:', error);
      toast.error('Erro ao analisar alimentos. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    if (!isEditing) {
      setTranscript('');
      setCustomName('Gravado');
    }
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
          {transcript && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                O que você disse:
              </label>
              <div className="p-3 rounded-xl bg-muted/50 min-h-[80px]">
                <p className="text-sm">{transcript}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full"
                onClick={() => setTranscript('')}
              >
                Limpar e falar novamente
              </Button>
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
