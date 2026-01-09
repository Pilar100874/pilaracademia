import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TrendingDown, TrendingUp, Minus, Calculator, X } from 'lucide-react';

interface WeightProjectionProps {
  consumedCalories: number;
  burnedCalories: number;
  goalCalories: number;
  currentWeight: number;
}

// 7700 kcal = 1 kg de gordura corporal
const KCAL_PER_KG = 7700;

export function WeightProjection({ 
  consumedCalories, 
  burnedCalories, 
  goalCalories, 
  currentWeight 
}: WeightProjectionProps) {
  const [showProjection, setShowProjection] = useState(false);

  // Balanço calórico líquido do dia
  const netCalories = consumedCalories - burnedCalories;
  
  // Déficit/superávit em relação à meta de manutenção de peso
  // Se a meta já inclui déficit (ex: -500 para perder peso), consideramos isso
  const dailyBalance = netCalories - goalCalories;
  
  // Peso esperado a perder/ganhar por dia (em gramas)
  const dailyWeightChangeGrams = (dailyBalance / KCAL_PER_KG) * 1000;
  
  // Projeções
  const weeklyWeightChange = (dailyBalance * 7) / KCAL_PER_KG;
  const monthlyWeightChange = (dailyBalance * 30) / KCAL_PER_KG;

  // Peso projetado
  const projectedWeekWeight = currentWeight + weeklyWeightChange;
  const projectedMonthWeight = currentWeight + monthlyWeightChange;

  const isDeficit = dailyBalance < 0;
  const isNeutral = Math.abs(dailyBalance) < 50;

  const getTrendIcon = () => {
    if (isNeutral) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (isDeficit) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <TrendingUp className="h-4 w-4 text-orange-500" />;
  };

  const getStatusColor = () => {
    if (isNeutral) return 'text-muted-foreground';
    if (isDeficit) return 'text-green-500';
    return 'text-orange-500';
  };

  const formatWeight = (value: number) => {
    if (Math.abs(value) < 0.01) return '0';
    return value.toFixed(2);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-2"
        onClick={() => setShowProjection(true)}
      >
        <Calculator className="h-4 w-4 mr-2" />
        Ver projeção de peso
      </Button>

      {showProjection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-scale-in p-4">
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-elevated animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Projeção de Peso
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowProjection(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Balanço do dia */}
            <div className="rounded-xl bg-secondary/50 p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-1">Balanço de hoje</p>
              <div className="flex items-center gap-2">
                {getTrendIcon()}
                <span className={`text-2xl font-bold ${getStatusColor()}`}>
                  {dailyBalance > 0 ? '+' : ''}{Math.round(dailyBalance)} kcal
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isDeficit ? 'Em déficit (perdendo peso)' : isNeutral ? 'Neutro' : 'Em superávit (ganhando peso)'}
              </p>
            </div>

            {/* Peso atual */}
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">Peso atual</p>
              <p className="text-3xl font-bold">{currentWeight} kg</p>
            </div>

            {/* Projeções */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Semana */}
              <div className="rounded-xl bg-secondary/50 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Em 1 semana</p>
                <p className="text-xl font-bold">{formatWeight(projectedWeekWeight)} kg</p>
                <p className={`text-xs font-medium ${getStatusColor()}`}>
                  {weeklyWeightChange > 0 ? '+' : ''}{formatWeight(weeklyWeightChange)} kg
                </p>
              </div>

              {/* Mês */}
              <div className="rounded-xl bg-secondary/50 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Em 1 mês</p>
                <p className="text-xl font-bold">{formatWeight(projectedMonthWeight)} kg</p>
                <p className={`text-xs font-medium ${getStatusColor()}`}>
                  {monthlyWeightChange > 0 ? '+' : ''}{formatWeight(monthlyWeightChange)} kg
                </p>
              </div>
            </div>

            {/* Detalhamento */}
            <div className="rounded-xl border border-border p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consumido hoje</span>
                <span>{Math.round(consumedCalories)} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Queimado (exercícios)</span>
                <span className="text-orange-500">-{burnedCalories} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Líquido</span>
                <span className="font-medium">{Math.round(netCalories)} kcal</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="text-muted-foreground">Meta diária</span>
                <span>{goalCalories} kcal</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              * Projeção baseada em 7700 kcal = 1 kg. Resultados reais podem variar.
            </p>

            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => setShowProjection(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
