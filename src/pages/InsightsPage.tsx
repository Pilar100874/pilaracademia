import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Minus,
  Activity,
  AlertTriangle,
  Sparkles,
  Scale,
  HeartPulse,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/BottomNav';
import { EmptyState } from '@/components/EmptyState';
import { BeforeAfterCard } from '@/components/BeforeAfterCard';
import { useWeightHistory } from '@/hooks/useWeightHistory';
import { useAdherenceHistory } from '@/hooks/useAdherenceHistory';
import { useBloodExams } from '@/hooks/useBloodExams';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

/* ---------- helpers ---------- */

function avg(numbers: number[]) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

interface Insight {
  tone: 'good' | 'warn' | 'bad' | 'info';
  title: string;
  body: string;
}

const toneClasses: Record<Insight['tone'], string> = {
  good: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  warn: 'border-amber-300 bg-amber-50 text-amber-900',
  bad: 'border-rose-300 bg-rose-50 text-rose-900',
  info: 'border-border bg-card',
};

/* ---------- page ---------- */

export default function InsightsPage() {
  const navigate = useNavigate();
  const { entries: weightEntries } = useWeightHistory();
  const { history: adherenceHistory, loading: adherenceLoading } = useAdherenceHistory(30);
  const { list } = useBloodExams();
  const { profile } = useProfile();

  const exams = list.data || [];
  const lastExam = exams[0];
  const prevExam = exams[1];

  /* ----- weight trend (last 30d) ----- */
  const weightSeries = useMemo(() => {
    return weightEntries
      .map((w) => ({
        date: w.recorded_at.slice(0, 10),
        label: format(parseISO(w.recorded_at), 'dd/MM', { locale: ptBR }),
        weight: Number(w.weight_kg),
      }))
      .filter((p) => Number.isFinite(p.weight));
  }, [weightEntries]);

  const weightTrend = useMemo(() => {
    if (weightSeries.length < 2) return null;
    const first = weightSeries[0].weight;
    const last = weightSeries[weightSeries.length - 1].weight;
    const delta = last - first;
    return { delta, first, last, days: weightSeries.length };
  }, [weightSeries]);

  /* ----- adherence average ----- */
  const adherenceAvg = useMemo(() => {
    if (adherenceHistory.length === 0) return null;
    const recent = adherenceHistory.slice(-7);
    const score = avg(recent.map((d) => d.score));
    const protein = avg(recent.map((d) => d.protein));
    const calories = avg(recent.map((d) => d.calories));
    const hydration = avg(recent.map((d) => d.hydration));
    return {
      score: Math.round(score),
      protein: Math.round(protein),
      calories: Math.round(calories),
      hydration: Math.round(hydration),
    };
  }, [adherenceHistory]);

  /* ----- cross-correlations ----- */
  const insights = useMemo<Insight[]>(() => {
    const out: Insight[] = [];

    // 1. Weight + goal match
    if (weightTrend && profile?.goal) {
      const { delta, days } = weightTrend;
      const absDelta = Math.abs(delta);
      if (profile.goal === 'lose' && delta < -0.3) {
        out.push({
          tone: 'good',
          title: `Você perdeu ${absDelta.toFixed(1)} kg`,
          body: `Em ${days} medições recentes, sua tendência está alinhada ao seu objetivo de perder peso. Continue assim.`,
        });
      } else if (profile.goal === 'lose' && delta > 0.3) {
        out.push({
          tone: 'warn',
          title: `Peso subiu ${absDelta.toFixed(1)} kg`,
          body: `Seu objetivo é perder peso, mas a tendência está oposta. Vale revisar o saldo calórico ou a adesão ao plano.`,
        });
      } else if (profile.goal === 'gain' && delta > 0.3) {
        out.push({
          tone: 'good',
          title: `Você ganhou ${absDelta.toFixed(1)} kg`,
          body: `Tendência positiva para o seu objetivo de hipertrofia. Verifique se o ganho está vindo de músculo (bioimpedância).`,
        });
      } else if (profile.goal === 'maintain' && absDelta > 1) {
        out.push({
          tone: 'warn',
          title: `Variação de ${absDelta.toFixed(1)} kg`,
          body: `Seu objetivo é manter, mas seu peso oscilou bastante. Considere ajustar o saldo calórico.`,
        });
      }
    }

    // 2. Adherence
    if (adherenceAvg) {
      if (adherenceAvg.score >= 80) {
        out.push({
          tone: 'good',
          title: `Adesão de ${adherenceAvg.score}% nos últimos 7 dias`,
          body: `Excelente consistência. Os melhores resultados aparecem com adesão acima de 80%.`,
        });
      } else if (adherenceAvg.score < 50) {
        out.push({
          tone: 'warn',
          title: `Adesão baixa: ${adherenceAvg.score}%`,
          body: `Os registros estão incompletos ou as metas estão sendo perdidas. Pequenos ajustes diários multiplicam o resultado.`,
        });
      }

      if (adherenceAvg.protein < 60) {
        out.push({
          tone: 'warn',
          title: 'Proteína abaixo da meta',
          body: `Você atingiu em média ${adherenceAvg.protein}% do alvo proteico. Proteína baixa compromete saciedade, recuperação e preservação muscular.`,
        });
      }

      if (adherenceAvg.hydration < 60) {
        out.push({
          tone: 'info',
          title: 'Hidratação pode melhorar',
          body: `Você ficou em ${adherenceAvg.hydration}% da meta de água. Hidratação afeta saciedade, performance e até a leitura de bioimpedância.`,
        });
      }
    }

    // 3. Blood exam abnormal markers
    if (lastExam) {
      const abnormal = (lastExam.markers || []).filter(
        (m) => m.status === 'high' || m.status === 'low' || m.status === 'borderline',
      );
      if (abnormal.length > 0) {
        out.push({
          tone: abnormal.some((m) => m.status === 'high' || m.status === 'low') ? 'warn' : 'info',
          title: `${abnormal.length} marcador(es) fora da faixa`,
          body: `No último exame: ${abnormal
            .slice(0, 3)
            .map((m) => m.label)
            .join(', ')}${abnormal.length > 3 ? '…' : ''}. As recomendações nutricionais já consideram esses dados.`,
        });
      }

      // Compare with previous exam
      if (prevExam) {
        const lastByKey = new Map(lastExam.markers.map((m) => [m.key, m]));
        const improvements: string[] = [];
        const worsenings: string[] = [];
        for (const m of prevExam.markers) {
          const cur = lastByKey.get(m.key);
          if (!cur || cur.value == null || m.value == null) continue;
          const wasBad = m.status === 'high' || m.status === 'low' || m.status === 'borderline';
          const isBad =
            cur.status === 'high' || cur.status === 'low' || cur.status === 'borderline';
          if (wasBad && !isBad) improvements.push(m.label);
          if (!wasBad && isBad) worsenings.push(m.label);
        }
        if (improvements.length > 0) {
          out.push({
            tone: 'good',
            title: 'Melhora desde o último exame',
            body: `Marcadores que estavam fora da faixa e voltaram ao normal: ${improvements.slice(0, 4).join(', ')}.`,
          });
        }
        if (worsenings.length > 0) {
          out.push({
            tone: 'warn',
            title: 'Piora desde o último exame',
            body: `Marcadores que pioraram: ${worsenings.slice(0, 4).join(', ')}. Vale discutir com seu médico.`,
          });
        }
      }
    }

    return out;
  }, [weightTrend, profile, adherenceAvg, lastExam, prevExam]);

  const hasAnyData =
    weightSeries.length > 0 || adherenceHistory.length > 0 || exams.length > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-5 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Painel
            </p>
            <h1 className="text-lg font-semibold leading-tight truncate">Insights</h1>
          </div>
        </div>
      </header>

      <div className="px-5 py-5 space-y-5 max-w-md mx-auto">
        {!hasAnyData && (
          <EmptyState
            icon={Sparkles}
            title="Insights aparecem com o tempo"
            description="Registre suas refeições, peso e exames por alguns dias para ver tendências e correlações personalizadas."
          />
        )}

        {/* Insights cards */}
        {insights.length > 0 && (
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-md border p-3 flex gap-3',
                  toneClasses[ins.tone],
                )}
              >
                <div className="shrink-0 mt-0.5">
                  {ins.tone === 'good' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : ins.tone === 'warn' ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : ins.tone === 'bad' ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{ins.title}</p>
                  <p className="text-[12px] leading-relaxed mt-0.5">{ins.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Antes vs agora */}
        <BeforeAfterCard />

        {/* Weight chart */}
        {weightSeries.length >= 2 && (
          <section className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Evolução do peso</h2>
            </div>
            {weightTrend && (
              <p className="text-[11px] text-muted-foreground mb-3">
                {weightTrend.first.toFixed(1)} kg → {weightTrend.last.toFixed(1)} kg
                <span
                  className={cn(
                    'ml-2 inline-flex items-center',
                    Math.abs(weightTrend.delta) < 0.3
                      ? 'text-muted-foreground'
                      : weightTrend.delta > 0
                        ? 'text-amber-700'
                        : 'text-emerald-700',
                  )}
                >
                  {Math.abs(weightTrend.delta) < 0.3 ? (
                    <Minus className="h-3 w-3 mr-0.5" />
                  ) : weightTrend.delta > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                  )}
                  {weightTrend.delta > 0 ? '+' : ''}
                  {weightTrend.delta.toFixed(1)} kg
                </span>
              </p>
            )}
            <div className="h-40 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightSeries} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={20}
                  />
                  <YAxis
                    domain={['dataMin - 1', 'dataMax + 1']}
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
                    }}
                    formatter={(v: number) => [`${v} kg`, 'Peso']}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Adherence chart */}
        {adherenceHistory.length >= 3 && (
          <section className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Adesão diária</h2>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              Score 0–100 considerando proteína, calorias, hidratação e treino. Acima de 80% =
              ótima consistência.
            </p>
            <div className="h-40 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={adherenceHistory.slice(-14)}
                  margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <ReferenceLine
                    y={80}
                    stroke="hsl(142 70% 45%)"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={20}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                    formatter={(v: number) => [`${v}%`, 'Score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Blood exam highlight */}
        {lastExam && (
          <section className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <HeartPulse className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Último exame de sangue</h2>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              {format(
                parseISO(lastExam.collected_at || lastExam.created_at),
                "d 'de' MMMM, yyyy",
                { locale: ptBR },
              )}
            </p>
            {lastExam.summary && (
              <p className="text-sm leading-relaxed">{lastExam.summary}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={() => navigate('/bioimpedance')}
            >
              Ver detalhes em Corpo
            </Button>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
