import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Droplets, GlassWater } from 'lucide-react';

interface LiquidConsumptionDialogProps {
  productName: string;
  defaultMl: number;
  onConfirm: (mlConsumed: number) => void;
  onCancel: () => void;
}

const CUP_SIZE = 250; // ml

export function LiquidConsumptionDialog({
  productName,
  defaultMl,
  onConfirm,
  onCancel,
}: LiquidConsumptionDialogProps) {
  const [consumptionType, setConsumptionType] = useState<'all' | 'cups' | 'custom'>('all');
  const [cups, setCups] = useState(1);
  const [customMl, setCustomMl] = useState(defaultMl);

  const getConsumedMl = () => {
    switch (consumptionType) {
      case 'all':
        return defaultMl;
      case 'cups':
        return cups * CUP_SIZE;
      case 'custom':
        return customMl;
    }
  };

  const handleConfirm = () => {
    onConfirm(getConsumedMl());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10">
        <Droplets className="h-6 w-6 text-blue-500" />
        <div>
          <p className="font-medium text-blue-700 dark:text-blue-300">Produto líquido detectado</p>
          <p className="text-sm text-muted-foreground">{productName}</p>
        </div>
      </div>

      <p className="text-sm font-medium">Quanto você consumiu?</p>

      <div className="space-y-2">
        <Button
          variant={consumptionType === 'all' ? 'default' : 'outline'}
          className="w-full justify-start"
          onClick={() => setConsumptionType('all')}
        >
          <GlassWater className="mr-2 h-4 w-4" />
          Consumiu tudo ({defaultMl}ml)
        </Button>

        <div
          className={`rounded-xl border p-3 transition-colors ${
            consumptionType === 'cups' ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onClick={() => setConsumptionType('cups')}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Por copos (250ml cada)</span>
            <span className="text-sm text-muted-foreground">{cups * CUP_SIZE}ml</span>
          </div>
          {consumptionType === 'cups' && (
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setCups(Math.max(1, cups - 1));
                }}
              >
                -
              </Button>
              <span className="w-16 text-center font-bold">{cups} {cups === 1 ? 'copo' : 'copos'}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setCups(cups + 1);
                }}
              >
                +
              </Button>
            </div>
          )}
        </div>

        <div
          className={`rounded-xl border p-3 transition-colors ${
            consumptionType === 'custom' ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onClick={() => setConsumptionType('custom')}
        >
          <span className="text-sm font-medium">Quantidade personalizada</span>
          {consumptionType === 'custom' && (
            <div className="flex items-center gap-2 mt-3">
              <Input
                type="number"
                value={customMl}
                onChange={(e) => setCustomMl(Number(e.target.value))}
                min={1}
                max={5000}
                onClick={(e) => e.stopPropagation()}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">ml</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="gradient" className="flex-1" onClick={handleConfirm}>
          Confirmar ({getConsumedMl()}ml)
        </Button>
      </div>
    </div>
  );
}
