import { NutritionData } from '@/types/nutrition';

interface NutritionDisplayProps {
  nutrition: NutritionData;
  showAll?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function NutritionDisplay({ nutrition, showAll = false, size = 'md' }: NutritionDisplayProps) {
  const sizeClasses = {
    sm: { value: 'text-lg', label: 'text-[10px]', padding: 'p-2', gap: 'gap-2' },
    md: { value: 'text-2xl', label: 'text-xs', padding: 'p-3', gap: 'gap-3' },
    lg: { value: 'text-3xl', label: 'text-sm', padding: 'p-4', gap: 'gap-4' },
  };

  const s = sizeClasses[size];

  const mainNutrients = [
    { key: 'calories', value: nutrition.calories, unit: 'kcal', label: 'Calorias', bg: 'bg-primary/10', text: 'text-primary' },
    { key: 'protein', value: nutrition.protein, unit: 'g', label: 'Proteína', bg: 'bg-accent/10', text: 'text-accent' },
    { key: 'carbs', value: nutrition.carbs, unit: 'g', label: 'Carboidratos', bg: 'bg-blue-500/10', text: 'text-blue-600' },
    { key: 'fat', value: nutrition.fat, unit: 'g', label: 'Gordura', bg: 'bg-pink-500/10', text: 'text-pink-600' },
  ];

  const secondaryNutrients = [
    { key: 'saturatedFat', value: nutrition.saturatedFat, unit: 'g', label: 'G. Saturada', bg: 'bg-orange-500/10', text: 'text-orange-600' },
    { key: 'transFat', value: nutrition.transFat, unit: 'g', label: 'G. Trans', bg: 'bg-red-500/10', text: 'text-red-600' },
    { key: 'fiber', value: nutrition.fiber, unit: 'g', label: 'Fibra', bg: 'bg-green-500/10', text: 'text-green-600' },
    { key: 'sodium', value: nutrition.sodium, unit: 'mg', label: 'Sódio', bg: 'bg-purple-500/10', text: 'text-purple-600' },
  ];

  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-2 ${s.gap}`}>
        {mainNutrients.map((n) => (
          <div key={n.key} className={`rounded-xl ${n.bg} ${s.padding} text-center`}>
            <p className={`${s.value} font-bold ${n.text}`}>
              {n.key === 'calories' ? Math.round(n.value) : n.value}
              {n.key !== 'calories' && n.unit}
            </p>
            <p className={`${s.label} text-muted-foreground`}>{n.label}</p>
          </div>
        ))}
      </div>

      {showAll && (
        <div className="grid grid-cols-4 gap-2">
          {secondaryNutrients.map((n) => (
            <div key={n.key} className={`rounded-lg ${n.bg} p-2 text-center`}>
              <p className={`text-sm font-bold ${n.text}`}>
                {n.value ?? 0}{n.unit}
              </p>
              <p className="text-[10px] text-muted-foreground">{n.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
