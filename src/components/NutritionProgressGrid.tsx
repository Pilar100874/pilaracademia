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
  isLimit?: boolean;
}

function NutrientBar({ label, value, goal, unit, color, isLimit }: NutrientBarProps) {
  const pct = goal > 0 ? (value / goal) * 100 : 0;
  const isOver = pct > 100;
  const barColor = isLimit && isOver ? 'bg-rose-500' : color;

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 text-xs text-muted-foreground truncate">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className={`w-20 text-right text-xs num-display ${isLimit && isOver ? 'text-rose-500' : ''}`}>
        <span>{Math.round(value)}</span>
        <span className="text-muted-foreground">/{goal}{unit}</span>
      </div>
    </div>
  );
}

export function NutritionProgressGrid({ consumed, goals }: NutritionProgressGridProps) {
  const [expanded, setExpanded] = useState(false);

  const mainNutrients = [
    { label: 'Proteína', value: consumed.protein, goal: goals.protein, unit: 'g', color: 'bg-amber-500' },
    { label: 'Carbos', value: consumed.carbs, goal: goals.carbs, unit: 'g', color: 'bg-sky-500' },
    { label: 'Gordura', value: consumed.fat, goal: goals.fat, unit: 'g', color: 'bg-pink-500' },
  ];

  const extraNutrients = [
    { label: 'Fibra', value: consumed.fiber || 0, goal: goals.fiber, unit: 'g', color: 'bg-emerald-500' },
    { label: 'Sódio', value: consumed.sodium || 0, goal: goals.sodium, unit: 'mg', color: 'bg-violet-500', isLimit: true },
    { label: 'G. Sat.', value: consumed.saturatedFat || 0, goal: goals.saturatedFat, unit: 'g', color: 'bg-orange-500', isLimit: true },
    { label: 'G. Trans', value: consumed.transFat || 0, goal: goals.transFat, unit: 'g', color: 'bg-rose-500', isLimit: true },
  ];

  return (
    <div className="card-compact">
      <div className="space-y-2">
        {mainNutrients.map((n) => <NutrientBar key={n.label} {...n} />)}
      </div>

      {expanded && (
        <div className="space-y-2 mt-3 pt-3 border-t border-border/50 animate-fade-in">
          {extraNutrients.map((n) => <NutrientBar key={n.label} {...n} />)}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground mt-2 py-1 hover:text-foreground transition-colors"
      >
        {expanded ? <><ChevronUp className="h-3 w-3" /> Menos</> : <><ChevronDown className="h-3 w-3" /> Mais nutrientes</>}
      </button>
    </div>
  );
}
