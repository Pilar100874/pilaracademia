import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity,
  Droplet,
  Flame,
  HeartPulse,
  Scale,
  Dumbbell,
  Bone,
  Brain,
  ArrowRight,
  Info,
  TrendingDown,
  TrendingUp,
  Minus,
  Upload,
  GitCompareArrows,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BioimpedanceCompare } from '@/components/BioimpedanceCompare';
import { ScaleBleCard } from '@/components/ScaleBleCard';
import { useBodyAnalyses } from '@/hooks/useBodyAnalyses';
import { useBackgroundAnalysis } from '@/contexts/BackgroundAnalysisContext';
import type { BodyAnalysisRow, ExtractedBioimpedance } from '@/types/bodyAnalysis';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

export interface MetricSpec {
  key: keyof ExtractedBioimpedance;
  label: string;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Plain-language explanation for non-experts. */
  explain: string;
  /** Returns a friendly status label (e.g. "Saudável") + tone color. */
  classify?: (value: number, e: ExtractedBioimpedance) => { label: string; tone: 'good' | 'warn' | 'bad' | 'neutral' } | null;
  /** Format displayed value. */
  format?: (value: number) => string;
}

export const fmtN = (v: number, digits = 1) =>
  Number.isFinite(v) ? v.toFixed(digits).replace(/\.0$/, '') : '—';

export const METRICS: MetricSpec[] = [
  {
    key: 'weight_kg',
    label: 'Peso',
    unit: 'kg',
    icon: Scale,
    explain:
      'Quanto seu corpo pesa hoje. É o número da balança comum — útil para acompanhar tendências, mas sozinho não diz se você ganhou músculo ou gordura.',
  },
  {
    key: 'bmi',
    label: 'IMC',
    icon: Activity,
    explain:
      'Índice de Massa Corporal. Compara seu peso com sua altura. É um indicador grosseiro: pessoas musculosas costumam ter IMC alto sem estar gordas.',
    classify: (v) => {
      if (v < 18.5) return { label: 'Abaixo do peso', tone: 'warn' };
      if (v < 25) return { label: 'Saudável', tone: 'good' };
      if (v < 30) return { label: 'Sobrepeso', tone: 'warn' };
      return { label: 'Obesidade', tone: 'bad' };
    },
    format: (v) => fmtN(v, 1),
  },
  {
    key: 'body_fat_pct',
    label: '% de Gordura',
    unit: '%',
    icon: Flame,
    explain:
      'Que parte do seu peso é gordura corporal. É um dos números mais importantes: dois corpos com mesmo peso podem ter composições muito diferentes.',
    classify: (v, e) => {
      const male = e.sex === 'male';
      if (male) {
        if (v < 10) return { label: 'Muito baixo', tone: 'warn' };
        if (v < 20) return { label: 'Atlético / saudável', tone: 'good' };
        if (v < 25) return { label: 'Aceitável', tone: 'neutral' };
        return { label: 'Elevado', tone: 'bad' };
      }
      if (v < 18) return { label: 'Muito baixo', tone: 'warn' };
      if (v < 28) return { label: 'Atlética / saudável', tone: 'good' };
      if (v < 32) return { label: 'Aceitável', tone: 'neutral' };
      return { label: 'Elevado', tone: 'bad' };
    },
    format: (v) => fmtN(v, 1),
  },
  {
    key: 'fat_mass_kg',
    label: 'Massa de gordura',
    unit: 'kg',
    icon: Flame,
    explain: 'Quantos quilos do seu peso são gordura. Reduzir esse número de forma saudável melhora estética e saúde metabólica.',
  },
  {
    key: 'muscle_mass_kg',
    label: 'Massa muscular',
    unit: 'kg',
    icon: Dumbbell,
    explain:
      'Quanto do seu corpo é músculo (incluindo coração, intestinos etc.). Mais músculo = metabolismo mais alto e corpo mais funcional.',
  },
  {
    key: 'skeletal_muscle_kg',
    label: 'Músculo esquelético',
    unit: 'kg',
    icon: Dumbbell,
    explain:
      'Apenas os músculos que você treina (braços, pernas, costas). É o que cresce com musculação e o que mais protege contra perdas com a idade.',
  },
  {
    key: 'body_water_kg',
    label: 'Água corporal',
    unit: 'kg',
    icon: Droplet,
    explain:
      'Quanta água tem dentro do seu corpo. Pouca hidratação afeta força, foco e queima de gordura. Geralmente representa 50–65% do peso.',
  },
  {
    key: 'bone_mass_kg',
    label: 'Massa óssea',
    unit: 'kg',
    icon: Bone,
    explain:
      'Estimativa do peso dos seus ossos. Tende a se manter estável; quedas grandes podem indicar perda óssea (mais comum após os 50).',
  },
  {
    key: 'visceral_fat',
    label: 'Gordura visceral',
    icon: HeartPulse,
    explain:
      'Gordura escondida ao redor dos órgãos (fígado, intestino). Diferente da gordura sob a pele — essa é a que mais aumenta risco cardíaco e diabetes.',
    classify: (v) => {
      if (v <= 9) return { label: 'Saudável', tone: 'good' };
      if (v <= 14) return { label: 'Atenção', tone: 'warn' };
      return { label: 'Elevada', tone: 'bad' };
    },
    format: (v) => fmtN(v, 0),
  },
  {
    key: 'bmr_kcal',
    label: 'Metabolismo basal',
    unit: 'kcal',
    icon: Brain,
    explain:
      'Calorias que seu corpo gasta parado, só para manter os órgãos funcionando. É a base do seu plano alimentar — quanto mais músculo, maior tende a ser.',
    format: (v) => fmtN(v, 0),
  },
  {
    key: 'body_age',
    label: 'Idade corporal',
    unit: 'anos',
    icon: Activity,
    explain:
      'Estimativa de quão jovem (ou velho) seu corpo está em relação à sua idade real. Reduz com mais músculo, menos gordura e melhor hidratação.',
    format: (v) => fmtN(v, 0),
  },
];

const toneClasses: Record<string, string> = {
  good: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  warn: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  bad: 'bg-red-500/10 text-red-700 border-red-500/30',
  neutral: 'bg-muted text-muted-foreground border-border',
};

/* ------------------------------------------------------------------ */
/* Tab content                                                        */
/* ------------------------------------------------------------------ */

export function BioimpedanceTab() {
  const { list } = useBodyAnalyses();
  const { startBioimpedance, jobs } = useBackgroundAnalysis();
  const analyzing = jobs.some((j) => j.kind === 'bioimpedance');
  const fileRef = useRef<HTMLInputElement>(null);
  const [comparing, setComparing] = useState(false);
  const rows = list.data ?? [];

  const latest = rows[0] as BodyAnalysisRow | undefined;
  const previous = rows[1] as BodyAnalysisRow | undefined;

  const e = (latest?.extracted || {}) as ExtractedBioimpedance;
  const ePrev = (previous?.extracted || {}) as ExtractedBioimpedance;

  const measuredAt = latest?.measured_at || latest?.created_at;

  const summary = useMemo(() => {
    if (!latest) return null;
    return buildPlainSummary(e, ePrev);
  }, [latest, e, ePrev]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Envie a foto do relatório de bioimpedância. A IA extrai os números e monta seu plano.
        </p>
        <Button
          size="sm"
          className="shrink-0"
          disabled={analyzing}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5 mr-1" />
          {analyzing ? 'Analisando…' : 'Enviar'}
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(ev) => {
          const f = ev.target.files?.[0];
          if (f) startBioimpedance(f);
          ev.target.value = '';
        }}
      />
      <ScaleBleCard onSaved={() => list.refetch()} />
      {rows.length >= 2 && !comparing && (
        <Button variant="outline" className="w-full" onClick={() => setComparing(true)}>
          <GitCompareArrows className="h-4 w-4 mr-1.5" />
          Comparar exames lado a lado
        </Button>
      )}
      {comparing && rows.length >= 2 ? (
        <BioimpedanceCompare rows={rows} onClose={() => setComparing(false)} />
      ) : !latest ? (
        <EmptyState onUpload={() => fileRef.current?.click()} />
      ) : (
        <>
          {/* Date + summary */}
          <div className="rounded-md border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              Última medição{' '}
              {measuredAt
                ? format(parseISO(measuredAt), "d 'de' MMMM, yyyy", { locale: ptBR })
                : '—'}
            </p>
            {summary && (
              <p className="text-sm leading-relaxed mt-2 text-foreground/90">{summary}</p>
            )}
            {previous && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Comparação com a medição anterior de{' '}
                {format(parseISO(previous.measured_at || previous.created_at), 'd MMM', { locale: ptBR })}
                .
              </p>
            )}
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 gap-3">
            {METRICS.map((m) => {
              const value = e[m.key] as number | null | undefined;
              if (value == null || !Number.isFinite(value as number)) return null;
              const v = value as number;
              const prevValue = ePrev[m.key] as number | null | undefined;
              const status = m.classify ? m.classify(v, e) : null;
              const Icon = m.icon;
              const formatted = m.format ? m.format(v) : fmtN(v, 1);
              const delta =
                prevValue != null && Number.isFinite(prevValue as number)
                  ? v - (prevValue as number)
                  : null;
              return (
                <div key={m.key as string}>
                  <div className="rounded-md border border-border bg-card p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 flex-wrap">
                          <p className="text-sm font-medium">{m.label}</p>
                          {status && (
                            <span
                              className={cn(
                                'text-[10px] px-2 py-0.5 rounded-full border',
                                toneClasses[status.tone],
                              )}
                            >
                              {status.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-2xl font-semibold leading-none">
                            {formatted}
                          </span>
                          {m.unit && (
                            <span className="text-xs text-muted-foreground">{m.unit}</span>
                          )}
                          {delta != null && Math.abs(delta) >= 0.05 && (
                            <span
                              className={cn(
                                'inline-flex items-center text-[11px] ml-1',
                                delta > 0 ? 'text-amber-700' : 'text-emerald-700',
                              )}
                            >
                              {delta > 0 ? (
                                <TrendingUp className="h-3 w-3 mr-0.5" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-0.5" />
                              )}
                              {delta > 0 ? '+' : ''}
                              {fmtN(delta, 1)}
                              {m.unit ? ` ${m.unit}` : ''}
                            </span>
                          )}
                          {delta != null && Math.abs(delta) < 0.05 && (
                            <span className="inline-flex items-center text-[11px] ml-1 text-muted-foreground">
                              <Minus className="h-3 w-3 mr-0.5" />
                              estável
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
                          {m.explain}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer info */}
          <div className="rounded-md border border-border bg-muted/40 p-4 flex gap-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              As classificações (saudável, atenção, elevado) são referências gerais e podem
              variar conforme idade, sexo e nível de atividade. Não substituem orientação
              médica.
            </p>
          </div>

          <Button asChild variant="outline" className="w-full">
            <Link to="/body-analysis">
              Ver análise completa e plano
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty                                                              */
/* ------------------------------------------------------------------ */

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-card p-8 text-center space-y-3">
      <Activity className="h-8 w-8 text-muted-foreground mx-auto" />
      <h2 className="text-base font-semibold">Nenhum exame ainda</h2>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Envie uma foto do seu laudo de bioimpedância para vermos seu corpo em números —
        peso, gordura, músculos, água e mais — explicados de forma simples.
      </p>
      <Button className="mt-2" onClick={onUpload}>
        Enviar exame
        <ArrowRight className="h-4 w-4 ml-1.5" />
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plain-language summary builder                                     */
/* ------------------------------------------------------------------ */

function buildPlainSummary(e: ExtractedBioimpedance, prev: ExtractedBioimpedance): string {
  const parts: string[] = [];

  if (e.weight_kg != null && prev.weight_kg != null) {
    const d = e.weight_kg - prev.weight_kg;
    if (Math.abs(d) >= 0.3) {
      parts.push(
        `Você ${d > 0 ? 'ganhou' : 'perdeu'} ${fmtN(Math.abs(d), 1)} kg desde a última medição.`,
      );
    } else {
      parts.push('Seu peso está estável em relação à última medição.');
    }
  }

  if (e.body_fat_pct != null && prev.body_fat_pct != null) {
    const d = e.body_fat_pct - prev.body_fat_pct;
    if (Math.abs(d) >= 0.3) {
      parts.push(
        `Sua gordura corporal ${d > 0 ? 'subiu' : 'caiu'} ${fmtN(Math.abs(d), 1)} ponto(s) percentual(is).`,
      );
    }
  }

  if (e.muscle_mass_kg != null && prev.muscle_mass_kg != null) {
    const d = e.muscle_mass_kg - prev.muscle_mass_kg;
    if (Math.abs(d) >= 0.3) {
      parts.push(
        `Sua massa muscular ${d > 0 ? 'aumentou' : 'diminuiu'} ${fmtN(Math.abs(d), 1)} kg — ${
          d > 0 ? 'ótimo sinal de progresso!' : 'fique de olho na proteína e treino de força.'
        }`,
      );
    }
  }

  if (parts.length === 0) {
    if (e.body_fat_pct != null && e.muscle_mass_kg != null) {
      parts.push(
        `Você tem ${fmtN(e.body_fat_pct, 1)}% de gordura e ${fmtN(e.muscle_mass_kg, 1)} kg de músculo.`,
      );
    }
    if (e.visceral_fat != null) {
      const tone =
        e.visceral_fat <= 9
          ? 'em nível saudável'
          : e.visceral_fat <= 14
            ? 'em zona de atenção'
            : 'elevada — vale priorizar redução';
      parts.push(`Sua gordura visceral está ${tone}.`);
    }
  }

  return parts.join(' ');
}
