import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { NutritionData } from '@/types/nutrition';

interface NutritionProgressGridProps {
  consumed: NutritionData & { saturatedFat?: number; transFat?: number; fiber?: number; sodium?: number };
  goals: { calories: number; protein: number; carbs: number; fat: number; saturatedFat: number; transFat: number; fiber: number; sodium: number; };
}

interface NutrientBarProps {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
  bgColor: string;
  isLimit?: boolean;
}

function NutrientBar({ label, value, goal, unit, color, bgColor, isLimit }: NutrientBarProps) {
  const pct = goal > 0 ? (value / goal) * 100 : 0;
  const isOver = pct > 100;
  const barColor = isLimit && isOver ? 'bg-rose-500' : color;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className={`text-xs num-display ${isLimit && isOver ? 'text-rose-500' : ''}`}>
          <span className="font-semibold">{Math.round(value)}</span>
          <span className="text-muted-foreground">/{goal}{unit}</span>
        </span>
      </div>
      <div className={`h-2.5 rounded-full overflow-hidden ${bgColor}`}>
        <div 
          className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
          style={{ width: `${Math.min(pct, 100)}%` }} 
        />
      </div>
    </div>
  );
}

export function NutritionProgressGrid({ consumed, goals }: NutritionProgressGridProps) {
  const [expanded, setExpanded] = useState(false);

  const mainNutrients = [
    { label: 'Proteína', value: consumed.protein, goal: goals.protein, unit: 'g', color: 'bg-amber-500', bgColor: 'bg-amber-100' },
    { label: 'Carboidratos', value: consumed.carbs, goal: goals.carbs, unit: 'g', color: 'bg-sky-500', bgColor: 'bg-sky-100' },
    { label: 'Gordura', value: consumed.fat, goal: goals.fat, unit: 'g', color: 'bg-pink-500', bgColor: 'bg-pink-100' },
  ];

  const extraNutrients = [
    { label: 'Fibra', value: consumed.fiber || 0, goal: goals.fiber, unit: 'g', color: 'bg-emerald-500', bgColor: 'bg-emerald-100' },
    { label: 'Sódio', value: consumed.sodium || 0, goal: goals.sodium, unit: 'mg', color: 'bg-violet-500', bgColor: 'bg-violet-100', isLimit: true },
    { label: 'Gordura Saturada', value: consumed.saturatedFat || 0, goal: goals.saturatedFat, unit: 'g', color: 'bg-orange-500', bgColor: 'bg-orange-100', isLimit: true },
    { label: 'Gordura Trans', value: consumed.transFat || 0, goal: goals.transFat, unit: 'g', color: 'bg-rose-500', bgColor: 'bg-rose-100', isLimit: true },
  ];

  return (
    <div className="card-compact">
      <div className="space-y-3">
        {mainNutrients.map((n) => <NutrientBar key={n.label} {...n} />)}
      </div>

      {expanded && (
        <div className="space-y-3 mt-4 pt-4 border-t border-border/50 animate-fade-in">
          {extraNutrients.map((n) => <NutrientBar key={n.label} {...n} />)}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-primary font-medium mt-3 py-2 rounded-xl hover:bg-primary/5 transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-4 w-4" /> Menos detalhes
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" /> Mais nutrientes
          </>
        )}
      </button>
    </div>
  );
}