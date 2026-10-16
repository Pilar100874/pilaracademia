import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  AlertCircle,
  Apple,
  Calendar,
  HeartPulse,
  Scale,
  Loader2,
  Stethoscope,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ProfessionalReportRecords } from '@/components/ProfessionalReportRecords';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

interface SharedPayload {
  generated_at: string;
  period_days: number;
  expires_at: string;
  profile: any;
  weight_series: { date: string; weight_kg: number }[];
  daily_totals: any[];
  latest_body_analysis: any;
  blood_exams?: any[];
  sections: { key: string; title: string; records: any[] }[];
}

const goalLabels: Record<string, string> = {
  lose: 'Perda de peso',
  maintain: 'Manutenção',
  gain: 'Hipertrofia',
};

export default function SharedSummaryPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) {
        setError('Token inválido');
        setLoading(false);
        return;
      }
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke(
          'share-summary',
          {
            body: { token },
          },
        );
        if (cancelled) return;
        if (fnError) throw fnError;
        if (result?.error) {
          setError(result.error);
        } else {
          setData(result.data);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erro ao carregar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-5">
        <div className="rounded-md border border-border bg-card p-6 max-w-md text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <h1 className="text-base font-semibold">Não foi possível abrir</h1>
          <p className="text-sm text-muted-foreground">{error || 'Erro desconhecido'}</p>
        </div>
      </div>
    );
  }

  const { profile, weight_series, daily_totals } = data;

  // Compute averages from daily_totals
  const last7 = daily_totals.filter((day: any) => new Date(`${day.date}T12:00:00-03:00`).getTime() >= Date.now() - 7 * 86400000);
  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
  const avgCalories = Math.round(avg(last7.filter((d: any) => d.calories != null).map((d: any) => d.calories)));
  const avgProtein = Math.round(avg(last7.filter((d: any) => d.protein != null).map((d: any) => d.protein)));
  const avgLiquid = Math.round(avg(last7.filter((d: any) => d.liquid_ml != null).map((d: any) => d.liquid_ml)));

  const weightChartData = [...weight_series].sort((a, b) => a.date.localeCompare(b.date)).map((w) => ({
    label: format(parseISO(w.date), 'dd/MM', { locale: ptBR }),
    weight: w.weight_kg,
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-5 py-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Pilar Saúde · Resumo compartilhado
          </p>
          <h1 className="text-2xl font-semibold mt-1">
            {profile.name || 'Resumo do paciente'}
          </h1>
          <p className="text-xs text-muted-foreground mt-2">
            Últimos {data.period_days} dias · gerado em{' '}
            {format(parseISO(data.generated_at), "d 'de' MMM, yyyy 'às' HH:mm", {
              locale: ptBR,
            })}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {/* Profile */}
        <section className="rounded-md border border-border bg-card p-4 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Perfil
          </h2>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <Field label="Sexo" value={profile.gender === 'male' ? 'Masculino' : profile.gender === 'female' ? 'Feminino' : '—'} />
            <Field
              label="Data de nascimento"
              value={profile.birth_date ? format(parseISO(profile.birth_date), 'dd/MM/yyyy') : '—'}
            />
            <Field label="Altura" value={profile.height_cm ? `${profile.height_cm} cm` : '—'} />
            <Field label="Peso" value={profile.weight_kg ? `${profile.weight_kg} kg` : '—'} />
            <Field label="Objetivo" value={goalLabels[profile.goal] || '—'} />
            <Field
              label="Meta calórica"
              value={profile.daily_calories ? `${profile.daily_calories} kcal` : '—'}
            />
          </div>
        </section>

        {/* Adherence summary */}
        <section className="rounded-md border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Apple className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Médias dos últimos 7 dias com registros
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Calorias" value={`${avgCalories}`} unit="kcal/dia" />
            <Metric label="Proteína" value={`${avgProtein}`} unit="g/dia" />
            <Metric label="Líquidos" value={`${avgLiquid}`} unit="ml/dia" />
          </div>
        </section>

        {/* Weight evolution */}
        {weightChartData.length >= 2 && (
          <section className="rounded-md border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Evolução do peso
              </h2>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
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
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Todos os registros compartilhados</h2>
          <p className="text-sm text-muted-foreground">Dados do período selecionado e cadastros atuais. Dias sem registro não representam zero. Fotos, vídeos e arquivos originais permanecem no aplicativo.</p>
          <Accordion type="multiple">
            {(data.sections ?? []).map(section => <AccordionItem key={section.key} value={section.key}>
              <AccordionTrigger className="gap-3 text-left hover:no-underline"><span>{section.title} <span className="text-xs font-normal text-muted-foreground">({section.records.length})</span></span></AccordionTrigger>
              <AccordionContent><ProfessionalReportRecords records={section.records} /></AccordionContent>
            </AccordionItem>)}
          </Accordion>
        </section>

        {/* Disclaimer */}
        <section className="rounded-md border border-border bg-muted/40 p-4 flex gap-3">
          <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Este resumo foi gerado automaticamente pelo aplicativo Pilar Saúde para fins
            informativos. Os dados são autorrelatados e a interpretação clínica deve ser feita pelo
            profissional de saúde.
          </p>
        </section>

        <p className="text-[10px] text-center text-muted-foreground py-3">
          Link válido até{' '}
          {format(parseISO(data.expires_at), "d 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm">{value || '—'}</p>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-xl font-semibold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{unit}</p>
    </div>
  );
}
