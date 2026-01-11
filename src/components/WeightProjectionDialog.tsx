import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingDown, TrendingUp, Calendar, Target } from 'lucide-react';
import { WeightEntry } from '@/hooks/useWeightHistory';
import { differenceInDays, format, addDays, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeightProjectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: WeightEntry[];
  currentWeight: number;
  goalWeight?: number;
}

export function WeightProjectionDialog({
  open,
  onOpenChange,
  entries,
  currentWeight,
  goalWeight,
}: WeightProjectionDialogProps) {
  // Calculate weight loss rate based on history
  const calculateProjections = () => {
    if (entries.length < 2) {
      return null;
    }

    const firstEntry = entries[0];
    const lastEntry = entries[entries.length - 1];
    
    const totalDays = differenceInDays(
      new Date(lastEntry.recorded_at),
      new Date(firstEntry.recorded_at)
    );
    
    if (totalDays <= 0) return null;

    const totalChange = lastEntry.weight_kg - firstEntry.weight_kg;
    const dailyChange = totalChange / totalDays;
    const weeklyChange = dailyChange * 7;
    const monthlyChange = dailyChange * 30;

    const today = new Date();
    
    return {
      dailyChange,
      weeklyChange,
      monthlyChange,
      projections: [
        {
          label: '1 Semana',
          date: addWeeks(today, 1),
          weight: currentWeight + weeklyChange,
        },
        {
          label: '2 Semanas',
          date: addWeeks(today, 2),
          weight: currentWeight + weeklyChange * 2,
        },
        {
          label: '1 Mês',
          date: addMonths(today, 1),
          weight: currentWeight + monthlyChange,
        },
        {
          label: '2 Meses',
          date: addMonths(today, 2),
          weight: currentWeight + monthlyChange * 2,
        },
        {
          label: '3 Meses',
          date: addMonths(today, 3),
          weight: currentWeight + monthlyChange * 3,
        },
      ],
      daysToGoal: goalWeight && dailyChange < 0 
        ? Math.ceil((goalWeight - currentWeight) / dailyChange)
        : null,
    };
  };

  const projectionData = calculateProjections();
  const isLosingWeight = projectionData && projectionData.weeklyChange < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Projeção de Peso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!projectionData ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">Registre pelo menos 2 pesos em dias diferentes para ver projeções.</p>
            </div>
          ) : (
            <>
              {/* Current trend */}
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground mb-2">Taxa atual</p>
                <div className="flex items-center gap-2">
                  {isLosingWeight ? (
                    <TrendingDown className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                  )}
                  <span className={`text-lg font-semibold ${isLosingWeight ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {projectionData.weeklyChange > 0 ? '+' : ''}
                    {projectionData.weeklyChange.toFixed(2)} kg/semana
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {projectionData.monthlyChange > 0 ? '+' : ''}
                  {projectionData.monthlyChange.toFixed(2)} kg/mês
                </p>
              </div>

              {/* Projections list */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Projeções</p>
                {projectionData.projections.map((proj) => (
                  <div
                    key={proj.label}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{proj.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(proj.date, "dd 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{proj.weight.toFixed(1)} kg</p>
                      <p className={`text-xs ${isLosingWeight ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {(proj.weight - currentWeight) > 0 ? '+' : ''}
                        {(proj.weight - currentWeight).toFixed(1)} kg
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Goal estimate */}
              {goalWeight && projectionData.daysToGoal && projectionData.daysToGoal > 0 && (
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Meta: {goalWeight} kg</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estimativa de alcance em{' '}
                    <span className="font-semibold text-foreground">
                      {projectionData.daysToGoal} dias
                    </span>{' '}
                    ({format(addDays(new Date(), projectionData.daysToGoal), "dd 'de' MMM 'de' yyyy", { locale: ptBR })})
                  </p>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground text-center">
                * Projeções baseadas na taxa média de mudança de peso registrada
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
