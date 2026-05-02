import { useMemo } from 'react';
import { parseISO, subDays, isAfter, isBefore } from 'date-fns';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useWeightHistory } from '@/hooks/useWeightHistory';
import { cn } from '@/lib/utils';

interface BeforeAfterCardProps {
  className?: string;
}

/**
 * Cartão "Antes vs Agora": compara o peso de 30, 60 e 90 dias atrás com o atual.
 * Usa o registro de peso mais próximo da data alvo dentro de uma janela de ±5 dias.
 */
export function BeforeAfterCard({ className }: BeforeAfterCardProps) {
  const { entries } = useWeightHistory();

  const periods = useMemo(() => {
    if (entries.length === 0) return [];
    const sorted = [...entries].sort(
      (a, b) => parseISO(a.recorded_at).getTime() - parseISO(b.recorded_at).getTime(),
    );
    const latest = sorted[sorted.length - 1];
    const current = Number(latest.weight_kg);
    const today = parseISO(latest.recorded_at);

    return [30, 60, 90].map((days) => {
      const target = subDays(today, days);
      const windowStart = subDays(target, 5);
      const windowEnd = subDays(target, -5);
      const candidates = sorted.filter((e) => {
        const d = parseISO(e.recorded_at);
        return !isBefore(d, windowStart) && !isAfter(d, windowEnd);
      });
      if (candidates.length === 0) return { days, before: null as number | null, current };
      // pega o mais próximo do alvo
      const closest = candidates.reduce((best, cur) => {
        const diffBest = Math.abs(parseISO(best.recorded_at).getTime() - target.getTime());
        const diffCur = Math.abs(parseISO(cur.recorded_at).getTime() - target.getTime());
        return diffCur < diffBest ? cur : best;
      });
      return { days, before: Number(closest.weight_kg), current };
    });
  }, [entries]);

  const hasAnyData = periods.some((p) => p.before !== null);
  if (!hasAnyData) return null;

  return (
    <div className={cn('card-compact space-y-3', className)}>
      <div>
        <p className="text-sm font-semibold">Antes vs agora</p>
        <p className="text-xs text-muted-foreground">Evolução do peso comparado a períodos passados</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {periods.map((p) => (
          <PeriodCell key={p.days} days={p.days} before={p.before} current={p.current} />
        ))}
      </div>
    </div>
  );
}

function PeriodCell({
  days,
  before,
  current,
}: {
  days: number;
  before: number | null;
  current: number;
}) {
  if (before === null) {
    return (
      <div className="rounded-md border border-border bg-muted/20 p-3 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{days} dias</p>
        <p className="text-sm text-muted-foreground mt-1.5">—</p>
        <p className="text-[10px] text-muted-foreground">sem registro</p>
      </div>
    );
  }
  const delta = current - before;
  const sign = delta === 0 ? '' : delta > 0 ? '+' : '';
  const tone =
    Math.abs(delta) < 0.2
      ? 'text-muted-foreground'
      : delta < 0
      ? 'text-emerald-600'
      : 'text-rose-600';
  const Icon = Math.abs(delta) < 0.2 ? Minus : delta < 0 ? TrendingDown : TrendingUp;

  return (
    <div className="rounded-md border border-border bg-card p-3 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{days} dias</p>
      <p className="text-sm font-semibold mt-1 num-display">{before.toFixed(1)} kg</p>
      <div className={cn('flex items-center justify-center gap-1 mt-1 text-xs font-medium', tone)}>
        <Icon className="h-3 w-3" />
        <span className="num-display">
          {sign}
          {delta.toFixed(1)} kg
        </span>
      </div>
    </div>
  );
}
