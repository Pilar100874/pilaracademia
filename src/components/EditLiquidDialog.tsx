import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Droplets, Check, GlassWater, Calculator } from 'lucide-react';

interface LiquidEntry {
  id: string;
  amount_ml: number;
  type: string;
  consumed_at: string;
}

interface EditLiquidDialogProps {
  entry: LiquidEntry | null;
  liquidTypes: Record<string, string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, amountMl: number) => Promise<void>;
}

// Fraction options for liquids
const LIQUID_FRACTIONS = [
  { label: '1/4', value: 0.25 },
  { label: '1/3', value: 0.33 },
  { label: '1/2', value: 0.5 },
  { label: '2/3', value: 0.67 },
  { label: '3/4', value: 0.75 },
  { label: 'Tudo', value: 1 },
];

// Quick ml options
const QUICK_ML_OPTIONS = [
  { label: '250ml', value: 250 },
  { label: '300ml', value: 300 },
  { label: '350ml', value: 350 },
  { label: '500ml', value: 500 },
];

export function EditLiquidDialog({ 
  entry, 
  liquidTypes,
  open, 
  onOpenChange,
  onSave 
}: EditLiquidDialogProps) {
  const [consumeMode, setConsumeMode] = useState<'fraction' | 'ml'>('ml');
  const [selectedFraction, setSelectedFraction] = useState<number | null>(null);
  const [customMl, setCustomMl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Original amount from entry
  const originalAmount = entry?.amount_ml || 0;

  // Reset state when dialog opens
  useEffect(() => {
    if (open && entry) {
      setConsumeMode('ml');
      setSelectedFraction(null);
      setCustomMl(entry.amount_ml.toString());
    }
  }, [open, entry]);

  // Calculate final amount
  const finalAmount = useMemo(() => {
    if (consumeMode === 'fraction' && selectedFraction !== null && originalAmount > 0) {
      return Math.round(originalAmount * selectedFraction);
    }
    if (consumeMode === 'ml') {
      return parseFloat(customMl) || 0;
    }
    return 0;
  }, [consumeMode, selectedFraction, originalAmount, customMl]);

  // Display text
  const displayText = useMemo(() => {
    if (consumeMode === 'fraction' && selectedFraction !== null) {
      const fractionLabel = LIQUID_FRACTIONS.find(f => f.value === selectedFraction)?.label || '';
      return `${fractionLabel} = ${finalAmount}ml`;
    }
    return `${finalAmount}ml`;
  }, [consumeMode, selectedFraction, finalAmount]);

  const handleSave = async () => {
    if (!entry || finalAmount <= 0) return;
    
    setIsSaving(true);
    try {
      await onSave(entry.id, finalAmount);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickMlSelect = (value: number) => {
    setConsumeMode('ml');
    setSelectedFraction(null);
    setCustomMl(value.toString());
  };

  const handleFractionSelect = (value: number) => {
    setConsumeMode('fraction');
    setSelectedFraction(value);
    setCustomMl('');
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-sky-500" />
            Editar Líquido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Entry info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-500/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/20">
              <Droplets className="h-6 w-6 text-sky-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{liquidTypes[entry.type] || entry.type}</p>
              <p className="text-xs text-muted-foreground">
                Registro original: <strong>{originalAmount}ml</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(entry.consumed_at).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Consumption options */}
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <GlassWater className="h-4 w-4 text-sky-500" />
              Quanto você bebeu?
            </p>

            {/* Fraction options (based on original amount) */}
            {originalAmount > 0 && (
              <>
                <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/20">
                  <p className="text-xs font-medium text-sky-600 mb-2">Fração do registro ({originalAmount}ml)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {LIQUID_FRACTIONS.map((fraction) => {
                      const ml = Math.round(originalAmount * fraction.value);
                      return (
                        <button
                          key={fraction.value}
                          onClick={() => handleFractionSelect(fraction.value)}
                          className={`p-2 rounded-lg text-center transition-all border-2 ${
                            consumeMode === 'fraction' && selectedFraction === fraction.value
                              ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                              : 'border-muted bg-secondary/50 hover:border-sky-500/50'
                          }`}
                        >
                          <span className="text-sm font-medium">{fraction.label}</span>
                          <span className="block text-xs text-muted-foreground">{ml}ml</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="text-center text-xs text-muted-foreground">ou</div>
              </>
            )}

            {/* Quick ML options */}
            <div className="grid grid-cols-4 gap-2">
              {QUICK_ML_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleQuickMlSelect(option.value)}
                  className={`p-2 rounded-lg text-xs font-medium transition-all border-2 ${
                    consumeMode === 'ml' && parseFloat(customMl) === option.value
                      ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                      : 'border-muted bg-secondary/50 hover:border-sky-500/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Custom ml input */}
            <div 
              className={`p-3 rounded-lg border-2 transition-all ${
                consumeMode === 'ml' && !QUICK_ML_OPTIONS.some(o => o.value === parseFloat(customMl))
                  ? 'border-sky-500 bg-sky-500/10' 
                  : 'border-muted'
              }`}
              onClick={() => {
                setConsumeMode('ml');
                setSelectedFraction(null);
              }}
            >
              <p className="text-sm font-medium mb-2">Digitar quantidade (ml)</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={consumeMode === 'ml' ? customMl : ''}
                  onChange={(e) => {
                    setCustomMl(e.target.value);
                    setConsumeMode('ml');
                    setSelectedFraction(null);
                  }}
                  placeholder="Ex: 200"
                  min="0"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">ml</span>
              </div>
            </div>
          </div>

          {/* Calculated preview */}
          {finalAmount > 0 && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs font-medium flex items-center gap-1 text-primary">
                <Calculator className="h-3 w-3" />
                Valor Final
                <span className="text-muted-foreground ml-1">({displayText})</span>
              </p>
              <div className="mt-2 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-sky-500">{finalAmount}ml</p>
                  <p className="text-xs text-muted-foreground">0 kcal</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleSave}
              disabled={isSaving || finalAmount <= 0}
            >
              <Check className="h-4 w-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
