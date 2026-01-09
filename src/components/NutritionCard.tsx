import { cn } from "@/lib/utils";

interface NutritionCardProps {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: 'primary' | 'accent' | 'blue' | 'pink';
  className?: string;
}

const colorStyles = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    bar: 'bg-primary',
  },
  accent: {
    bg: 'bg-accent/10',
    text: 'text-accent',
    bar: 'bg-accent',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    bar: 'bg-blue-500',
  },
  pink: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-600',
    bar: 'bg-pink-500',
  },
};

export function NutritionCard({
  label,
  value,
  goal,
  unit,
  color,
  className,
}: NutritionCardProps) {
  const percentage = Math.min((value / goal) * 100, 100);
  const styles = colorStyles[color];

  return (
    <div
      className={cn(
        "rounded-2xl p-4 shadow-card transition-all duration-200 hover:shadow-soft",
        styles.bg,
        className
      )}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={cn("text-2xl font-bold", styles.text)}>
          {Math.round(value)}
        </span>
        <span className="text-sm text-muted-foreground">
          / {goal}{unit}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-background/50">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            styles.bar
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
