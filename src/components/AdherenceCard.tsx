import { Sparkles } from 'lucide-react';
import { AdherenceBreakdown } from '@/hooks/useAdherenceScore';
import { cn } from '@/lib/utils';

interface Props {
  score: AdherenceBreakdown;
}

const colorMap = {
  emerald: 'text-emerald-600 bg-emerald-500/10',
  amber: 'text-amber-600 bg-amber-500/10',
  rose: 'text-rose-600 bg-rose-500/10',
  muted: 'text-muted-foreground bg-muted',
};

const barColor = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  muted: 'bg-muted-foreground/40',
};

export function AdherenceCard({ score }: Props) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('h-7 w-7 rounded-md flex items-center justify-center', colorMap[score.color])}>
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground leading-none">Aderência ao plano</p>
            <p className="text-sm font-semibold">{score.label}</p>
          </div>
        </div>
        <p className="text-2xl font-semibold tabular-nums">{score.total}</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <Pill label="Proteína" value={score.protein} color={score.color} />
        <Pill label="Calorias" value={score.calories} color={score.color} />
        <Pill label="Água" value={score.hydration} color={score.color} />
        <Pill label="Treino" value={score.workout} color={score.color} />
      </div>
    </div>
  );
}

function Pill({ label, value, color }: { label: string; value: number; color: AdherenceBreakdown['color'] }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-1 truncate">{label}</p>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full transition-all', barColor[color])} style={{ width: `${value}%` }} />
      </div>
      <p className="text-[10px] tabular-nums mt-0.5 text-foreground/70">{value}%</p>
    </div>
  );
}
