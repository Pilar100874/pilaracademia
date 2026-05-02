import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingDown, TrendingUp, Calendar, Target, Scale, Flame, Info, Sparkles } from 'lucide-react';
import { WeightEntry } from '@/hooks/useWeightHistory';
import { differenceInDays, format, addDays, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentBodyPlan } from '@/hooks/useCurrentBodyPlan';

interface WeightProjectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: WeightEntry[];
  currentWeight: number;
  goalWeight?: number;
  dailyCalorieDeficit?: number; // déficit calórico diário em kcal
}

export function WeightProjectionDialog({
  open,
  onOpenChange,
  entries,
  currentWeight,
  goalWeight,
  dailyCalorieDeficit = 0,
}: WeightProjectionDialogProps) {
  // Calculate weight loss rate based on recorded weight history
  const calculateWeightBasedProjections = () => {
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
        { label: '1 Semana', date: addWeeks(today, 1), weight: currentWeight + weeklyChange },
        { label: '2 Semanas', date: addWeeks(today, 2), weight: currentWeight + weeklyChange * 2 },
        { label: '1 Mês', date: addMonths(today, 1), weight: currentWeight + monthlyChange },
        { label: '2 Meses', date: addMonths(today, 2), weight: currentWeight + monthlyChange * 2 },
        { label: '3 Meses', date: addMonths(today, 3), weight: currentWeight + monthlyChange * 3 },
      ],
      daysToGoal: goalWeight && dailyChange < 0 
        ? Math.ceil((goalWeight - currentWeight) / dailyChange)
        : null,
    };
  };

  // Calculate projections based on calorie deficit (7700 kcal = 1kg)
  const calculateCalorieBasedProjections = () => {
    // 7700 kcal deficit = 1 kg weight loss
    const dailyWeightChange = dailyCalorieDeficit / 7700; // kg per day (negative = loss)
    const weeklyChange = dailyWeightChange * 7;
    const monthlyChange = dailyWeightChange * 30;

    const today = new Date();
    
    return {
      dailyChange: dailyWeightChange,
      weeklyChange,
      monthlyChange,
      projections: [
        { label: '1 Semana', date: addWeeks(today, 1), weight: currentWeight + weeklyChange },
        { label: '2 Semanas', date: addWeeks(today, 2), weight: currentWeight + weeklyChange * 2 },
        { label: '1 Mês', date: addMonths(today, 1), weight: currentWeight + monthlyChange },
        { label: '2 Meses', date: addMonths(today, 2), weight: currentWeight + monthlyChange * 2 },
        { label: '3 Meses', date: addMonths(today, 3), weight: currentWeight + monthlyChange * 3 },
      ],
      daysToGoal: goalWeight && dailyWeightChange < 0 
        ? Math.ceil((goalWeight - currentWeight) / dailyWeightChange)
        : null,
    };
  };

  const weightProjections = calculateWeightBasedProjections();
  const calorieProjections = calculateCalorieBasedProjections();

  const renderProjectionContent = (
    projectionData: ReturnType<typeof calculateWeightBasedProjections>,
    type: 'weight' | 'calorie'
  ) => {
    if (!projectionData) {
      return (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">
            {type === 'weight' 
              ? 'Registre pelo menos 2 pesos em dias diferentes para ver projeções.'
              : 'Sem dados de déficit calórico disponíveis.'
            }
          </p>
        </div>
      );
    }

    const isLosingWeight = projectionData.weeklyChange < 0;

    return (
      <div className="space-y-4">
        {/* Info box explaining the projection type */}
        <div className="flex gap-2 p-3 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-xs">
            {type === 'weight' 
              ? 'Projeção baseada nos pesos que você registrou. Quanto mais registros, mais precisa a estimativa.'
              : 'Projeção baseada no seu déficit/superávit calórico diário (7.700 kcal = 1kg).'
            }
          </p>
        </div>

        {/* Current trend */}
        <div className="p-4 rounded-xl bg-muted/50">
          <p className="text-xs text-muted-foreground mb-2">Taxa estimada</p>
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
      </div>
    );
  };

  const hasWeightData = entries.length >= 2;
  const bodyPlanInfo = useCurrentBodyPlan();
  const aiProjection = bodyPlanInfo?.plan?.projection;
  const hasAiProjection = !!(
    aiProjection &&
    (aiProjection.day_30?.weight_kg || aiProjection.day_60?.weight_kg || aiProjection.day_90?.weight_kg)
  );

  const renderAiProjection = () => {
    if (!hasAiProjection || !aiProjection) {
      return (
        <div className="text-center py-6 text-muted-foreground space-y-2">
          <p className="text-sm">Sem projeção de IA disponível.</p>
          <p className="text-xs">Faça uma análise corporal para gerar projeções personalizadas.</p>
        </div>
      );
    }
    const today = new Date();
    const items = [
      { label: '30 dias', date: addDays(today, 30), pt: aiProjection.day_30 },
      { label: '60 dias', date: addDays(today, 60), pt: aiProjection.day_60 },
      { label: '90 dias', date: addDays(today, 90), pt: aiProjection.day_90 },
    ].filter((i) => i.pt);

    return (
      <div className="space-y-4">
        <div className="flex gap-2 p-3 rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-xs">
            Projeção da sua análise corporal personalizada (calorias, treino e periodização aplicados).
          </p>
        </div>
        <div className="space-y-2">
          {items.map((it) => {
            const w = it.pt?.weight_kg;
            const bf = it.pt?.body_fat_pct;
            const mm = it.pt?.muscle_mass_kg;
            const delta = w != null ? w - currentWeight : 0;
            return (
              <div key={it.label} className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{it.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(it.date, "dd 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  {w != null && (
                    <span>
                      <span className="text-muted-foreground">Peso:</span>{' '}
                      <b>{w.toFixed(1)} kg</b>
                      <span className={delta < 0 ? 'text-emerald-500 ml-1' : 'text-amber-500 ml-1'}>
                        ({delta > 0 ? '+' : ''}{delta.toFixed(1)})
                      </span>
                    </span>
                  )}
                  {bf != null && (
                    <span>
                      <span className="text-muted-foreground">Gordura:</span>{' '}
                      <b>{bf.toFixed(1)}%</b>
                    </span>
                  )}
                  {mm != null && (
                    <span>
                      <span className="text-muted-foreground">Músculo:</span>{' '}
                      <b>{mm.toFixed(1)} kg</b>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5 text-primary" />
            Projeção de Peso
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          <Tabs defaultValue={hasAiProjection ? "ai" : (hasWeightData ? "weight" : "calorie")} className="w-full">
            <TabsList className={`grid w-full ${hasAiProjection ? 'grid-cols-3' : 'grid-cols-2'} mb-4 h-11`}>
              {hasAiProjection && (
                <TabsTrigger value="ai" className="text-xs gap-1 h-9">
                  <Sparkles className="h-3 w-3" />
                  IA
                </TabsTrigger>
              )}
              <TabsTrigger value="weight" className="text-xs gap-1 h-9">
                <Scale className="h-3 w-3" />
                Peso
              </TabsTrigger>
              <TabsTrigger value="calorie" className="text-xs gap-1 h-9">
                <Flame className="h-3 w-3" />
                Calorias
              </TabsTrigger>
            </TabsList>

            {hasAiProjection && (
              <TabsContent value="ai" className="mt-0">
                {renderAiProjection()}
              </TabsContent>
            )}

            <TabsContent value="weight" className="mt-0">
              {renderProjectionContent(weightProjections, 'weight')}
            </TabsContent>

            <TabsContent value="calorie" className="mt-0">
              {renderProjectionContent(calorieProjections, 'calorie')}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
