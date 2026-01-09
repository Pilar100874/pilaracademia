import { NutritionData } from '@/types/nutrition';

interface NutritionProgressGridProps {
  consumed: NutritionData & { saturatedFat?: number; transFat?: number; fiber?: number; sodium?: number };
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    saturatedFat: number;
    transFat: number;
    fiber: number;
    sodium: number;
  };
}

interface NutrientItemProps {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
  isLimit?: boolean; // true = não deve ultrapassar (sódio, gordura sat/trans)
}

function NutrientItem({ label, value, goal, unit, color, isLimit }: NutrientItemProps) {
  const percentage = goal > 0 ? (value / goal) * 100 : 0;
  const isOver = percentage > 100;
  const displayPercentage = Math.min(percentage, 100);

  const getBarColor = () => {
    if (isLimit && isOver) return 'bg-destructive';
    if (isOver) return 'bg-accent';
    return color;
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${isLimit && isOver ? 'text-destructive' : ''}`}>
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor()}`}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{Math.round(value)}{unit}</span>
        <span>/ {goal}{unit}</span>
      </div>
    </div>
  );
}

export function NutritionProgressGrid({ consumed, goals }: NutritionProgressGridProps) {
  const nutrients = [
    { label: 'Proteína', value: consumed.protein, goal: goals.protein, unit: 'g', color: 'bg-accent' },
    { label: 'Carboidratos', value: consumed.carbs, goal: goals.carbs, unit: 'g', color: 'bg-blue-500' },
    { label: 'Gordura Total', value: consumed.fat, goal: goals.fat, unit: 'g', color: 'bg-pink-500' },
    { label: 'Gordura Saturada', value: consumed.saturatedFat || 0, goal: goals.saturatedFat, unit: 'g', color: 'bg-orange-500', isLimit: true },
    { label: 'Gordura Trans', value: consumed.transFat || 0, goal: goals.transFat, unit: 'g', color: 'bg-red-500', isLimit: true },
    { label: 'Fibra', value: consumed.fiber || 0, goal: goals.fiber, unit: 'g', color: 'bg-green-500' },
    { label: 'Sódio', value: consumed.sodium || 0, goal: goals.sodium, unit: 'mg', color: 'bg-purple-500', isLimit: true },
  ];

  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
      <h3 className="font-semibold mb-4">Nutrientes do Dia</h3>
      <div className="grid grid-cols-2 gap-4">
        {nutrients.map((nutrient) => (
          <NutrientItem key={nutrient.label} {...nutrient} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center mt-4">
        ⚠️ Vermelho = limite ultrapassado (sódio, gordura saturada/trans)
      </p>
    </div>
  );
}
