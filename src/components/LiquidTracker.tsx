import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProgressRing } from '@/components/ProgressRing';
import { Droplets, Plus, Trash2 } from 'lucide-react';
import { useLiquidEntries } from '@/hooks/useLiquidEntries';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const QUICK_ADD_OPTIONS = [
  { label: '1 copo', ml: 250 },
  { label: '2 copos', ml: 500 },
  { label: '500ml', ml: 500 },
  { label: '1L', ml: 1000 },
];

export function LiquidTracker() {
  const { entries, addLiquidEntry, deleteLiquidEntry, getTodayTotal, liquidTypes } = useLiquidEntries();
  const { profile } = useProfile();
  const [showEntries, setShowEntries] = useState(false);

  const dailyGoal = profile?.daily_liquid_ml || 2000;
  const todayTotal = getTodayTotal();
  const progress = Math.min((todayTotal / dailyGoal) * 100, 100);
  const remaining = Math.max(0, dailyGoal - todayTotal);

  const handleQuickAdd = async (ml: number) => {
    try {
      await addLiquidEntry(ml, 'water');
      toast.success(`+${ml}ml de água adicionado!`);
    } catch {
      toast.error('Erro ao adicionar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLiquidEntry(id);
      toast.success('Removido!');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
          <Droplets className="h-5 w-5 text-blue-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Hidratação</h3>
          <p className="text-sm text-muted-foreground">
            {todayTotal}ml / {dailyGoal}ml
          </p>
        </div>
        <ProgressRing progress={progress} size={50} strokeWidth={4} color="blue">
          <span className="text-xs font-bold">{Math.round(progress)}%</span>
        </ProgressRing>
      </div>

      {remaining > 0 && (
        <p className="text-xs text-muted-foreground mb-3">
          Faltam {remaining}ml ({Math.ceil(remaining / 250)} copos)
        </p>
      )}

      <div className="grid grid-cols-4 gap-2 mb-3">
        {QUICK_ADD_OPTIONS.map((option) => (
          <Button
            key={option.label}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => handleQuickAdd(option.ml)}
          >
            <Plus className="h-3 w-3 mr-1" />
            {option.label}
          </Button>
        ))}
      </div>

      {entries.length > 0 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowEntries(!showEntries)}
          >
            {showEntries ? 'Ocultar histórico' : `Ver histórico (${entries.length})`}
          </Button>

          {showEntries && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{entry.amount_ml}ml</span>
                    <span className="text-muted-foreground ml-2">
                      {liquidTypes[entry.type as keyof typeof liquidTypes] || entry.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.consumed_at), 'HH:mm', { locale: ptBR })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
