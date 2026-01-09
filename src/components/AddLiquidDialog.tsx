import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Droplets } from 'lucide-react';

const QUICK_OPTIONS = [
  { label: '🥛 200ml', ml: 200 },
  { label: '🥤 300ml', ml: 300 },
  { label: '🍶 500ml', ml: 500 },
  { label: '💧 1L', ml: 1000 },
];

interface AddLiquidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLiquid: (ml: number, type: string) => Promise<void>;
}

export function AddLiquidDialog({ open, onOpenChange, onAddLiquid }: AddLiquidDialogProps) {
  const [customAmount, setCustomAmount] = useState('');

  const handleQuickAdd = async (ml: number) => {
    try {
      await onAddLiquid(ml, 'water');
      onOpenChange(false);
    } catch { /* silently fail */ }
  };

  const handleCustomAdd = async () => {
    const ml = parseInt(customAmount);
    if (ml <= 0) return;
    await handleQuickAdd(ml);
    setCustomAmount('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-sky-500" />
            Adicionar Líquido
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            💡 Água pura e outras bebidas contabilizam no consumo diário
          </p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_OPTIONS.map((opt) => (
              <button
                key={opt.ml}
                onClick={() => handleQuickAdd(opt.ml)}
                className="p-4 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 font-medium transition-colors text-center"
              >
                {opt.label}
              </button>
            ))}
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Quantidade personalizada</p>
            <div className="flex gap-2">
              <Input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="ml"
                className="flex-1"
              />
              <Button onClick={handleCustomAdd} disabled={!customAmount}>
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
