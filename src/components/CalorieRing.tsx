import { cn } from "@/lib/utils";

interface CalorieRingProps {
  consumed: number;
  burned: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CalorieRing({
  consumed,
  burned,
  goal,
  size = 140,
  strokeWidth = 12,
  className,
}: CalorieRingProps) {
  const net = consumed - burned;
  const remaining = Math.max(0, goal - net);
  const progress = Math.min((net / goal) * 100, 100);
  const isOver = net > goal;
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="progress-ring">
        {/* Background circle */}
        <circle
          className="stroke-muted"
          strokeWidth={strokeWidth}
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={cn(
            "transition-all duration-700 ease-out",
            isOver ? "stroke-destructive" : "stroke-primary"
          )}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold num-display">
          {Math.round(remaining)}
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          Calorias restantes
        </span>
      </div>
    </div>
  );
}
