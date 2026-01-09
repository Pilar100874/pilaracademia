import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calculator, X, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface WeightProjectionProps {
  consumedCalories: number;
  burnedCalories: number;
  goalCalories: number;
  currentWeight: number;
}

const KCAL_PER_KG = 7700;

export function WeightProjection({ consumedCalories, burnedCalories, goalCalories, currentWeight }: WeightProjectionProps) {
  const [showModal, setShowModal] = useState(false);

  const netCalories = consumedCalories - burnedCalories;
  const dailyBalance = netCalories - goalCalories;
  const weeklyChange = (dailyBalance * 7) / KCAL_PER_KG;
  const monthlyChange = (dailyBalance * 30) / KCAL_PER_KG;
  const isDeficit = dailyBalance < 0;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full mt-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors active:scale-98 border border-border"
      >
        <Calculator className="h-4 w-4" />
        Ver projeção semanal/mensal
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-background text-foreground p-5 shadow-floating animate-slide-up border border-border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Projeção de Peso</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Status */}
            <div className={`rounded-xl p-3 mb-4 ${isDeficit ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
              <div className="flex items-center gap-2">
                {isDeficit ? <TrendingDown className="h-5 w-5 text-emerald-600" /> : <TrendingUp className="h-5 w-5 text-amber-600" />}
                <span className={`text-xl font-bold ${isDeficit ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {dailyBalance > 0 ? '+' : ''}{Math.round(dailyBalance)} kcal/dia
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isDeficit ? 'Déficit calórico - perdendo peso' : 'Superávit calórico - ganhando peso'}
              </p>
            </div>

            {/* Peso atual */}
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">Peso atual</p>
              <p className="text-3xl font-bold text-foreground">{currentWeight} kg</p>
            </div>

            {/* Projeções */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Em 1 semana</p>
                <p className="text-xl font-bold text-foreground">{(currentWeight + weeklyChange).toFixed(1)} kg</p>
                <p className={`text-xs font-medium ${isDeficit ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {weeklyChange > 0 ? '+' : ''}{weeklyChange.toFixed(2)} kg
                </p>
              </div>
              <div className="rounded-xl bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Em 1 mês</p>
                <p className="text-xl font-bold text-foreground">{(currentWeight + monthlyChange).toFixed(1)} kg</p>
                <p className={`text-xs font-medium ${isDeficit ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {monthlyChange > 0 ? '+' : ''}{monthlyChange.toFixed(2)} kg
                </p>
              </div>
            </div>

            {/* Detalhes */}
            <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
              <div className="flex justify-between"><span>Consumido</span><span className="text-foreground">{Math.round(consumedCalories)} kcal</span></div>
              <div className="flex justify-between"><span>Exercícios</span><span className="text-foreground">-{burnedCalories} kcal</span></div>
              <div className="flex justify-between"><span>Meta diária</span><span className="text-foreground">{goalCalories} kcal</span></div>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-3">* Baseado em 7700 kcal = 1 kg</p>
          </div>
        </div>
      )}
    </>
  );
}
