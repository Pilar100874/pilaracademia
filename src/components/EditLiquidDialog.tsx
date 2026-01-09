import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Droplets, Check, GlassWater } from 'lucide-react';

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

const QUICK_OPTIONS = [
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
  const [amount, setAmount] = useState(entry?.amount_ml?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && entry) {
      setAmount(entry.amount_ml.toString());
    }
    onOpenChange(newOpen);
  };

  const handleSave = async () => {
    if (!entry || !amount) return;
    
    setIsSaving(true);
    try {
      await onSave(entry.id, Number(amount));
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickSelect = (value: number) => {
    setAmount(value.toString());
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
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
            <div>
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

          {/* Quick options */}
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <GlassWater className="h-4 w-4 text-sky-500" />
              Quantidade
            </p>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleQuickSelect(option.value)}
                  className={`p-2 rounded-lg text-xs font-medium transition-all border-2 ${
                    Number(amount) === option.value
                      ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                      : 'border-muted bg-secondary/50 hover:border-sky-500/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom input */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Quantidade"
              min="1"
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">ml</span>
          </div>

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
              disabled={isSaving || !amount || Number(amount) <= 0}
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