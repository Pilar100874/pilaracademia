import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Droplets, Check } from 'lucide-react';

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

// Quick ml options
const QUICK_ML_OPTIONS = [
  { label: '200ml', value: 200 },
  { label: '250ml', value: 250 },
  { label: '300ml', value: 300 },
  { label: '350ml', value: 350 },
  { label: '500ml', value: 500 },
  { label: '1L', value: 1000 },
];

export function EditLiquidDialog({ 
  entry, 
  liquidTypes,
  open, 
  onOpenChange,
  onSave 
}: EditLiquidDialogProps) {
  const [customMl, setCustomMl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open && entry) {
      setCustomMl(entry.amount_ml.toString());
    }
  }, [open, entry]);

  const finalAmount = parseFloat(customMl) || 0;

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
    setCustomMl(value.toString());
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2 text-base">
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
                {new Date(entry.consumed_at).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Quick ML options */}
          <div className="grid grid-cols-3 gap-2">
            {QUICK_ML_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleQuickMlSelect(option.value)}
                className={`p-2 rounded-lg text-sm font-medium transition-all border-2 ${
                  parseFloat(customMl) === option.value
                    ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                    : 'border-muted bg-secondary/50 hover:border-sky-500/50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Custom ml input */}
          <div className="p-3 rounded-lg border-2 border-muted">
            <p className="text-sm font-medium mb-2">Quantidade (ml)</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                value={customMl}
                onChange={(e) => setCustomMl(e.target.value)}
                placeholder="Ex: 200"
                min="0"
                className="flex-1 text-lg h-12"
              />
              <span className="text-sm text-muted-foreground">ml</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 h-12" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1 h-12" 
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
