import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { TrendingDown, TrendingUp, Minus, LineChart as LineIcon } from 'lucide-react';
import type { BloodExamRow, BloodMarker } from '@/hooks/useBloodExams';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

interface MarkerSeries {
  key: string;
  label: string;
  unit: string | null;
  category: string;
  points: { date: string; value: number; status: BloodMarker['status']; ref_min?: number | null; ref_max?: number | null }[];
}

const CATEGORY_LABEL: Record<string, string> = {
  hemograma: 'Hemograma',
  glicemia: 'Glicemia',
  lipidios: 'Lipídios',
  hormonios: 'Hormônios',
  vitaminas_minerais: 'Vitaminas e minerais',
  rim_figado: 'Rim e fígado',
  outros: 'Outros',
};

function buildSeries(exams: BloodExamRow[]): MarkerSeries[] {
  const byKey = new Map<string, MarkerSeries>();

  // sort exams ascending by date for chart
  const sorted = [...exams].sort((a, b) => {
    const da = a.collected_at || a.created_at;
    const db = b.collected_at || b.created_at;
    return da.localeCompare(db);
  });

  for (const exam of sorted) {
    const date = exam.collected_at || exam.created_at;
    for (const m of exam.markers || []) {
      if (m.value == null || !Number.isFinite(m.value)) continue;
      if (!byKey.has(m.key)) {
        byKey.set(m.key, {
          key: m.key,
          label: m.label,
          unit: m.unit,
          category: m.category || 'outros',
          points: [],
        });
      }
      byKey.get(m.key)!.points.push({
        date,
        value: m.value,
        status: m.status,
        ref_min: m.ref_min ?? null,
        ref_max: m.ref_max ?? null,
      });
    }
  }

  // Only keep markers with 2+ data points (worth charting)
  return Array.from(byKey.values())
    .filter((s) => s.points.length >= 2)
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

function trendInfo(points: MarkerSeries['points']) {
  if (points.length < 2) return null;
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const delta = last - first;
  const pct = first !== 0 ? (delta / first) * 100 : 0;
  return { delta, pct, last, first };
}

/* ------------------------------------------------------------------ */
/* Mini chart                                                         */
/* ------------------------------------------------------------------ */

function MarkerMiniChart({ series }: { series: MarkerSeries }) {
  const data = series.points.map((p) => ({
    ...p,
    label: format(parseISO(p.date), 'dd/MM/yy', { locale: ptBR }),
  }));

  // Reference range: use first available ref_min/ref_max
  const refMin = series.points.find((p) => p.ref_min != null)?.ref_min ?? null;
  const refMax = series.points.find((p) => p.ref_max != null)?.ref_max ?? null;

  const values = series.points.map((p) => p.value);
  const dataMin = Math.min(...values, refMin ?? Infinity);
  const dataMax = Math.max(...values, refMax ?? -Infinity);
  const padding = (dataMax - dataMin) * 0.15 || 1;
  const yMin = dataMin - padding;
  const yMax = dataMax + padding;

  const trend = trendInfo(series.points);

  const lastStatus = series.points[series.points.length - 1].status;
  const lineColor =
    lastStatus === 'high' || lastStatus === 'low'
      ? 'hsl(0 70% 45%)'
      : lastStatus === 'borderline'
        ? 'hsl(35 90% 45%)'
        : 'hsl(var(--primary))';

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <p className="text-sm font-medium truncate">{series.label}</p>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center text-[11px] shrink-0',
              Math.abs(trend.pct) < 5
                ? 'text-muted-foreground'
                : trend.delta > 0
                  ? 'text-amber-700'
                  : 'text-emerald-700',
            )}
          >
            {Math.abs(trend.pct) < 5 ? (
              <Minus className="h-3 w-3 mr-0.5" />
            ) : trend.delta > 0 ? (
              <TrendingUp className="h-3 w-3 mr-0.5" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-0.5" />
            )}
            {trend.delta > 0 ? '+' : ''}
            {trend.delta.toFixed(trend.delta < 1 ? 2 : 1)}
            {series.unit ? ` ${series.unit}` : ''}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">
        {series.points.length} medições · último valor: {series.points[series.points.length - 1].value}
        {series.unit ? ` ${series.unit}` : ''}
      </p>

      <div className="h-32 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            {refMin != null && refMax != null && (
              <ReferenceArea
                y1={refMin}
                y2={refMax}
                fill="hsl(142 70% 45%)"
                fillOpacity={0.08}
                stroke="hsl(142 70% 45%)"
                strokeOpacity={0.2}
                strokeDasharray="3 3"
              />
            )}
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 6,
                fontSize: 11,
                padding: '6px 8px',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              formatter={(value: number) => [
                `${value}${series.unit ? ' ' + series.unit : ''}`,
                series.label,
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={2}
              dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {refMin != null || refMax != null ? (
        <p className="text-[10px] text-muted-foreground mt-1">
          Faixa de referência:{' '}
          {refMin != null && refMax != null
            ? `${refMin} – ${refMax}`
            : refMin != null
              ? `≥ ${refMin}`
              : `≤ ${refMax}`}
          {series.unit ? ` ${series.unit}` : ''} (área verde)
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

export function BloodMarkerTrendChart({ exams }: { exams: BloodExamRow[] }) {
  const series = useMemo(() => buildSeries(exams), [exams]);

  const categories = useMemo(() => {
    const set = new Set(series.map((s) => s.category));
    return ['all', ...Array.from(set)];
  }, [series]);

  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? series : series.filter((s) => s.category === filter);

  if (series.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card p-6 text-center space-y-2">
        <LineIcon className="h-6 w-6 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">Sem histórico ainda</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Envie pelo menos 2 exames com o mesmo marcador para ver a evolução em gráfico.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categories.length > 2 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={cn(
                'shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                filter === c
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted/50',
              )}
            >
              {c === 'all' ? 'Todos' : CATEGORY_LABEL[c] || c}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((s) => (
          <MarkerMiniChart key={s.key} series={s} />
        ))}
      </div>
    </div>
  );
}
