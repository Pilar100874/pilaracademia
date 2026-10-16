import { TrendingDown, TrendingUp } from 'lucide-react';
import { estimateDailyWeightChange } from '@/lib/dailyWeightEstimate';

interface Props {
  consumedKcal: number;
  exerciseKcal: number;
  bmrKcal: number | null;
  hasWatchActivity: boolean;
  watchTotalKcal?: number | null;
}

export function DailyWeightEstimateCard({ consumedKcal, exerciseKcal, bmrKcal, hasWatchActivity, watchTotalKcal }: Props) {
  if (!bmrKcal && !watchTotalKcal) {
    return (
      <div className="card-compact p-4 text-sm text-muted-foreground">
        Complete peso, altura, data de nascimento e sexo no Perfil para ver a estimativa de perda de peso do dia.
      </div>
    );
  }
  const { burnedKcal, balanceKcal, lossGrams, source } = estimateDailyWeightChange({ consumedKcal, exerciseKcal, bmrKcal: bmrKcal ?? 0, hasWatchActivity, watchTotalKcal });
  const losing = lossGrams >= 0;
  const Icon = losing ? TrendingDown : TrendingUp;
  return (
    <div className="card-compact p-4 lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{losing ? 'Perda estimada do dia' : 'Ganho estimado do dia'}</p>
          <p className={`mt-1 text-2xl lg:text-3xl font-bold num-display ${losing ? 'text-primary' : 'text-destructive'}`}>
            {Math.abs(lossGrams).toLocaleString('pt-BR')} g
          </p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${losing ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div><p className="font-semibold text-foreground">{Math.round(consumedKcal).toLocaleString('pt-BR')}</p><p className="text-muted-foreground">consumido</p></div>
        <div><p className="font-semibold text-foreground">{burnedKcal.toLocaleString('pt-BR')}</p><p className="text-muted-foreground">{source === 'watch_total' ? 'gasto (relógio)' : 'gasto'}</p></div>
        <div><p className="font-semibold text-foreground">{balanceKcal > 0 ? '−' : '+'}{Math.abs(balanceKcal).toLocaleString('pt-BR')}</p><p className="text-muted-foreground">saldo kcal</p></div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {source === 'watch_total'
          ? 'Gasto = total do Samsung Health (basal + atividade) até a última importação.'
          : `Gasto = metabolismo basal ${hasWatchActivity ? '' : '+ movimento básico '}+ exercícios.`} 7,7 kcal ≈ 1 g. Estimativa; a balança varia também com água e intestino.
      </p>
    </div>
  );
}
