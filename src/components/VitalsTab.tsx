import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { HeartPulse, Activity, Droplet, Moon, Footprints, Flame, Wind, Thermometer, Gauge, TrendingUp, TrendingDown, Minus, Route } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MetricDef {
  type: string;
  label: string;
  unit: string;
  icon: typeof HeartPulse;
  hint: string;
  format?: (v: number) => string;
  /** Rótulo do segundo valor (máx. do dia ou diastólica). */
  second?: string;
  /** true quando subir é bom. undefined = neutro. */
  higherIsBetter?: boolean;
}

const METRICS: MetricDef[] = [
  { type: 'heart_rate', label: 'Frequência cardíaca', unit: 'bpm', icon: HeartPulse, hint: 'Média do dia; linha clara = pico do dia.', second: 'Pico' },
  { type: 'resting_heart_rate', label: 'FC em repouso', unit: 'bpm', icon: HeartPulse, hint: 'Normal em adultos: 60–100 bpm. Mais baixa costuma indicar melhor condicionamento.', higherIsBetter: false },
  { type: 'blood_pressure', label: 'Pressão arterial', unit: 'mmHg', icon: Gauge, hint: 'Ideal abaixo de 120/80 mmHg.', second: 'Diastólica', higherIsBetter: false },
  { type: 'spo2', label: 'Oxigenação (SpO₂)', unit: '%', icon: Droplet, hint: 'Normal: 95–100%.', higherIsBetter: true },
  { type: 'hrv', label: 'Variabilidade cardíaca (VFC)', unit: 'ms', icon: Activity, hint: 'Valores mais altos indicam melhor recuperação.', higherIsBetter: true },
  { type: 'respiratory_rate', label: 'Frequência respiratória', unit: 'rpm', icon: Wind, hint: 'Normal em repouso: 12–20 respirações/min.' },
  { type: 'sleep', label: 'Sono', unit: 'h', icon: Moon, hint: 'Recomendado para adultos: 7–9 h.', format: (v) => `${Math.floor(v / 60)}h${String(Math.round(v % 60)).padStart(2, '0')}`, higherIsBetter: true },
  { type: 'steps', label: 'Passos', unit: 'passos', icon: Footprints, hint: 'Meta comum: 7.000–10.000 por dia.', higherIsBetter: true },
  { type: 'calories', label: 'Calorias ativas', unit: 'kcal', icon: Flame, hint: 'Gasto registrado pelo relógio.', higherIsBetter: true },
  { type: 'distance', label: 'Distância', unit: 'km', icon: Route, hint: 'Distância caminhada/corrida.', format: (v) => (v / 1000).toFixed(1), higherIsBetter: true },
  { type: 'vo2max', label: 'VO₂ máx.', unit: 'mL/kg/min', icon: TrendingUp, hint: 'Capacidade aeróbica — quanto maior, melhor.', higherIsBetter: true },
  { type: 'body_temperature', label: 'Temperatura corporal', unit: '°C', icon: Thermometer, hint: 'Normal: 36–37,5 °C.' },
  { type: 'glucose', label: 'Glicemia (relógio/sensor)', unit: 'mg/dL', icon: Droplet, hint: 'Jejum normal: 70–99 mg/dL.' },
];

const PERIODS = [7, 30, 90, 365] as const;

interface Row {
  metric_type: string;
  value: number;
  value2: number | null;
  recorded_at: string;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function VitalsTab() {
  const { user } = useAuth();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['health-metrics', user?.id, days],
    enabled: !!user,
    queryFn: async () => {
      // Busca o período atual + o anterior para comparar.
      const since = new Date(Date.now() - days * 2 * 86400000).toISOString();
      const all: Row[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from('health_metrics')
          .select('metric_type,value,value2,recorded_at')
          .eq('user_id', user!.id)
          .gte('recorded_at', since)
          .order('recorded_at', { ascending: true })
          .range(from, from + 999);
        if (error) throw error;
        all.push(...((data ?? []) as Row[]));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });

  const cutoff = Date.now() - days * 86400000;
  const byType = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows) m.set(r.metric_type, [...(m.get(r.metric_type) ?? []), r]);
    return m;
  }, [rows]);

  const available = METRICS.filter((d) => byType.has(d.type));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl">Sinais vitais</h2>
          <p className="text-xs text-muted-foreground">Dados do Samsung Health / relógio, comparados com o período anterior.</p>
        </div>
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted/60 p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setDays(p)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${days === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              {p === 365 ? '1 ano' : `${p}d`}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : available.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
          Nenhum dado ainda. No app Android, vá em <strong>Geral → Samsung Health → Importar do Samsung Health</strong> e marque
          "Histórico de sinais vitais".
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {available.map((def) => {
            const list = byType.get(def.type)!;
            const cur = list.filter((r) => new Date(r.recorded_at).getTime() >= cutoff);
            const prev = list.filter((r) => new Date(r.recorded_at).getTime() < cutoff);
            const fmt = def.format ?? ((v: number) => (Math.round(v * 10) / 10).toLocaleString('pt-BR'));
            const curAvg = avg(cur.map((r) => r.value));
            const prevAvg = avg(prev.map((r) => r.value));
            const cur2 = avg(cur.map((r) => r.value2).filter((v): v is number => v != null));
            const last = cur[cur.length - 1];
            const diff = curAvg != null && prevAvg != null ? curAvg - prevAvg : null;
            const good = diff == null || def.higherIsBetter == null || Math.abs(diff) < 1e-6 ? null : (diff > 0) === def.higherIsBetter;
            const Icon = def.icon;
            const chart = cur.map((r) => ({ d: format(parseISO(r.recorded_at), 'dd/MM', { locale: ptBR }), v: r.value, v2: r.value2 }));
            return (
              <div key={def.type} className="min-w-0 rounded-md border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate text-sm font-medium">{def.label}</span>
                  </div>
                  {last && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {format(parseISO(last.recorded_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-serif text-3xl">
                    {last ? fmt(last.value) : '—'}
                    {def.type === 'blood_pressure' && last?.value2 != null ? `/${last.value2}` : ''}
                  </span>
                  <span className="text-xs text-muted-foreground">{def.unit}</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded bg-muted/50 p-2">
                    <div className="text-[10px] uppercase text-muted-foreground">Média</div>
                    <div className="text-sm font-medium">
                      {curAvg != null ? fmt(curAvg) : '—'}
                      {def.type === 'blood_pressure' && cur2 != null ? `/${Math.round(cur2)}` : ''}
                    </div>
                  </div>
                  <div className="rounded bg-muted/50 p-2">
                    <div className="text-[10px] uppercase text-muted-foreground">Anterior</div>
                    <div className="text-sm font-medium">{prevAvg != null ? fmt(prevAvg) : '—'}</div>
                  </div>
                  <div className="rounded bg-muted/50 p-2">
                    <div className="text-[10px] uppercase text-muted-foreground">Variação</div>
                    <div className={`flex items-center justify-center gap-0.5 text-sm font-medium ${good === true ? 'text-success' : good === false ? 'text-destructive' : ''}`}>
                      {diff == null ? '—' : (
                        <>
                          {diff > 0 ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {prevAvg ? `${((diff / prevAvg) * 100).toFixed(0)}%` : '—'}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {chart.length > 1 && (
                  <div className="mt-3 h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="d" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Line type="monotone" dataKey="v" name={def.type === 'blood_pressure' ? 'Sistólica' : def.label} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        {def.second && (
                          <Line type="monotone" dataKey="v2" name={def.second} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} connectNulls />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">{def.hint}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
