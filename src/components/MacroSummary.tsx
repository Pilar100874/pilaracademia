import { cn } from "@/lib/utils";

interface MacroItemProps {
  label: string;
  value: number;
  goal: number;
  unit?: string;
  colorClass: string;
}

function MacroItem({ label, value, goal, unit = 'g', colorClass }: MacroItemProps) {
  const remaining = Math.max(0, goal - value);
  
  return (
    <div className="text-center">
      <p className={cn("text-2xl font-bold num-display", colorClass)}>
        {Math.round(remaining)}{unit}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label} restante</p>
    </div>
  );
}

interface MacroSummaryProps {
  consumed: {
    protein: number;
    carbs: number;
    fat: number;
  };
  goals: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export function MacroSummary({ consumed, goals }: MacroSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2">
      <MacroItem 
        label="Proteína" 
        value={consumed.protein} 
        goal={goals.protein} 
        colorClass="text-orange-500"
      />
      <MacroItem 
        label="Carboidratos" 
        value={consumed.carbs} 
        goal={goals.carbs} 
        colorClass="text-sky-500"
      />
      <MacroItem 
        label="Gordura" 
        value={consumed.fat} 
        goal={goals.fat} 
        colorClass="text-violet-500"
      />
    </div>
  );
}
