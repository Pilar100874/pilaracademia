import { useAdherenceHistory } from '@/hooks/useAdherenceHistory';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';

export function AdherenceHistoryChart({ days = 7 }: { days?: number }) {
  const { history, loading } = useAdherenceHistory(days);
  if (loading) return null;
  const avg = history.length ? Math.round(history.reduce((s, d) => s + d.score, 0) / history.length) : 0;
  const last = history[history.length - 1]?.score ?? 0;
  const prev = history[history.length - 2]?.score ?? last;
  const trend = last - prev;

  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground leading-none">Aderência últimos {days} dias</p>
            <p className="text-sm font-semibold">Média {avg}</p>
          </div>
        </div>
        <p className={`text-xs tabular-nums ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
          {trend > 0 ? '+' : ''}{trend} hoje
        </p>
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 6 }}
              formatter={(v: any) => [`${v}`, 'Score']}
            />
            <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
