import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Droplets, Plus } from 'lucide-react';
import { useLiquidEntries } from '@/hooks/useLiquidEntries';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

const QUICK_OPTIONS = [
  { label: '🥛', ml: 250, title: '1 copo' },
  { label: '🥤', ml: 500, title: '500ml' },
  { label: '🍶', ml: 1000, title: '1L' },
];

export function LiquidTracker() {
  const { entries, addLiquidEntry, getTodayTotal } = useLiquidEntries();
  const { profile } = useProfile();
  const [showButtons, setShowButtons] = useState(false);

  const dailyGoal = profile?.daily_liquid_ml || 2000;
  const todayTotal = getTodayTotal();
  const progress = Math.min((todayTotal / dailyGoal) * 100, 100);
  const remaining = Math.max(0, dailyGoal - todayTotal);

  const handleQuickAdd = async (ml: number) => {
    try {
      await addLiquidEntry(ml, 'water');
      toast.success(`💧 +${ml}ml`);
    } catch { toast.error('Erro'); }
  };

  return (
    <div className="card-compact">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-water">
            <Droplets className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Água</p>
            <p className="text-lg num-display text-sky-500">{(todayTotal / 1000).toFixed(1)}L</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowButtons(!showButtons)}>
          <Plus className={`h-4 w-4 transition-transform ${showButtons ? 'rotate-45' : ''}`} />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-1">
        <div className="h-full rounded-full bg-sky-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{remaining > 0 ? `Faltam ${Math.ceil(remaining / 250)} copos` : '✅ Meta!'}</p>

      {showButtons && (
        <div className="flex gap-1 pt-2 border-t border-border/50 mt-2 animate-fade-in">
          {QUICK_OPTIONS.map((opt) => (
            <button
              key={opt.ml}
              onClick={() => handleQuickAdd(opt.ml)}
              className="quick-btn flex-1 bg-sky-500/10 text-sky-600 hover:bg-sky-500/20"
              title={opt.title}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
