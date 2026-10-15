import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDown, ArrowLeft, ArrowRightLeft, ArrowUp, Info, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { METRICS, fmtN, type MetricSpec } from '@/components/BioimpedanceTab';
import { BodyMorph, type MorphCallout } from '@/components/BodyFigure';
import { bioToTapeValues, segmentalLegendItems, segmentalTones } from '@/components/BioReport';
import type { BodyAnalysisRow, ExtractedBioimpedance } from '@/types/bodyAnalysis';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Direction semantics: which way is "good" for each metric           */
/* ------------------------------------------------------------------ */

type Direction = 'down-good' | 'up-good' | 'neutral';

const DIRECTION: Partial<Record<keyof ExtractedBioimpedance, Direction>> = {
  body_fat_pct: 'down-good',
  fat_mass_kg: 'down-good',
  visceral_fat: 'down-good',
  body_age: 'down-good',
  muscle_mass_kg: 'up-good',
  skeletal_muscle_kg: 'up-good',
  body_water_kg: 'up-good',
  bone_mass_kg: 'up-good',
  bmr_kcal: 'up-good',
  score: 'up-good',
};

const toneClasses: Record<string, string> = {
  good: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  warn: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  bad: 'bg-red-500/10 text-red-700 border-red-500/30',
  neutral: 'bg-muted text-muted-foreground border-border',
};

const rowDate = (r: BodyAnalysisRow) => r.measured_at || r.created_at;

const rowLabel = (r: BodyAnalysisRow) =>
  format(parseISO(rowDate(r)), "d 'de' MMM, yyyy", { locale: ptBR });

/** Rótulos com seta do morph, por tipo: gordura por região OU equilíbrio muscular
 *  (dados reais do exame, lado esquerdo e direito separados, como no relatório). */
function segCallouts(
  kind: 'fat' | 'muscle',
  a: ExtractedBioimpedance,
  b: ExtractedBioimpedance,
): MorphCallout[] {
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
  const segA = kind === 'fat' ? a.segmental_fat : a.segmental_muscle;
  const segB = kind === 'fat' ? b.segmental_fat : b.segmental_muscle;
  // Classificação por cor de cada exame
  const toneA = segmentalTones(kind, segA ?? {});
  const toneB = segmentalTones(kind, segB ?? {});
  const word = kind === 'fat' ? 'Gordura' : 'Músculo';
  return [
    { side: 'left', region: 'leftArm', label: `${word} braço E`, a: num(segA?.left_arm_kg), b: num(segB?.left_arm_kg), unit: 'kg', y: 104, toneA: toneA.leftArm, toneB: toneB.leftArm },
    { side: 'left', region: 'trunk', label: `${word} tronco`, a: num(segA?.trunk_kg), b: num(segB?.trunk_kg), unit: 'kg', y: 200, toneA: toneA.trunk, toneB: toneB.trunk },
    { side: 'left', region: 'leftLeg', label: `${word} perna E`, a: num(segA?.left_leg_kg), b: num(segB?.left_leg_kg), unit: 'kg', y: 304, toneA: toneA.leftLeg, toneB: toneB.leftLeg },
    { side: 'right', region: 'rightArm', label: `${word} braço D`, a: num(segA?.right_arm_kg), b: num(segB?.right_arm_kg), unit: 'kg', y: 104, toneA: toneA.rightArm, toneB: toneB.rightArm },
    { side: 'right', region: 'rightLeg', label: `${word} perna D`, a: num(segA?.right_leg_kg), b: num(segB?.right_leg_kg), unit: 'kg', y: 304, toneA: toneA.rightLeg, toneB: toneB.rightLeg },
  ];
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function BioimpedanceCompare({
  rows,
  onClose,
}: {
  rows: BodyAnalysisRow[];
  onClose: () => void;
}) {
  // Padrão cronológico: A = exame mais antigo, B = mais recente (evita
  // animação "invertida" quando dois exames têm a mesma data).
  const chrono = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const d = rowDate(a).localeCompare(rowDate(b));
        return d !== 0 ? d : (a.created_at ?? '').localeCompare(b.created_at ?? '');
      }),
    [rows],
  );
  const [idA, setIdA] = useState<string>(chrono[0].id);
  const [idB, setIdB] = useState<string>(chrono[chrono.length - 1].id);

  const rowA = rows.find((r) => r.id === idA) ?? rows[0];
  const rowB = rows.find((r) => r.id === idB) ?? rows[0];
  const eA = (rowA?.extracted || {}) as ExtractedBioimpedance;
  const eB = (rowB?.extracted || {}) as ExtractedBioimpedance;

  const visibleMetrics = useMemo(
    () =>
      METRICS.filter((m) => {
        const a = eA[m.key] as number | null | undefined;
        const b = eB[m.key] as number | null | undefined;
        return (a != null && Number.isFinite(a)) || (b != null && Number.isFinite(b));
      }),
    [eA, eB],
  );

  const swap = () => {
    setIdA(idB);
    setIdB(idA);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Comparar exames</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Voltar
        </Button>
      </div>

      {/* Exam pickers */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">Exame A (antes)</p>
          <Select value={idA} onValueChange={setIdA}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rows.map((r) => (
                <SelectItem key={r.id} value={r.id} disabled={r.id === idB}>
                  {rowLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="icon" className="shrink-0" onClick={swap} aria-label="Inverter exames">
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">Exame B (depois)</p>
          <Select value={idB} onValueChange={setIdB}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rows.map((r) => (
                <SelectItem key={r.id} value={r.id} disabled={r.id === idA}>
                  {rowLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Score comparison */}
      {(rowA?.score != null || rowB?.score != null) && (
        <div className="rounded-md border border-border bg-card p-4 flex items-center justify-around">
          <ScoreBlock label="Exame A" score={rowA?.score} />
          <DeltaBadge
            delta={
              rowA?.score != null && rowB?.score != null ? rowB.score - rowA.score : null
            }
            direction="up-good"
            unit=" pts"
          />
          <ScoreBlock label="Exame B" score={rowB?.score} highlight />
        </div>
      )}

      {/* Evolução visual do corpo (A -> B) */}
      <BodyMorph
        sex={eB.sex ?? eA.sex}
        valuesA={bioToTapeValues(eA)}
        valuesB={bioToTapeValues(eB)}
        callouts={segCallouts(eA, eB)}
        labelA={rowLabel(rowA)}
        labelB={rowLabel(rowB)}
        showValues
        showMarkers={false}
      />

      {/* Metric rows */}
      <div className="space-y-3">
        {visibleMetrics.map((m) => (
          <CompareRow key={m.key as string} metric={m} eA={eA} eB={eB} />
        ))}
      </div>

      {visibleMetrics.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Os exames selecionados não têm métricas em comum para comparar.
        </p>
      )}

      <div className="rounded-md border border-border bg-muted/40 p-4 flex gap-3">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Verde indica evolução favorável e vermelho desfavorável, conforme a métrica.
          Referências gerais — não substituem orientação médica.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

function ScoreBlock({ label, score, highlight }: { label: string; score: number | null | undefined; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn('text-3xl font-bold leading-tight', highlight && 'text-primary')}>
        {score != null ? Math.round(score) : '—'}
      </p>
    </div>
  );
}

function DeltaBadge({
  delta,
  direction,
  unit,
}: {
  delta: number | null;
  direction: Direction;
  unit?: string;
}) {
  if (delta == null || !Number.isFinite(delta)) return <span className="text-xs text-muted-foreground">—</span>;
  if (Math.abs(delta) < 0.05) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
        <Minus className="h-3 w-3" /> estável
      </span>
    );
  }
  const good =
    direction === 'neutral' ? null : direction === 'down-good' ? delta < 0 : delta > 0;
  const cls =
    good == null
      ? 'bg-muted text-muted-foreground border-border'
      : good
        ? toneClasses.good
        : toneClasses.bad;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full border font-medium', cls)}>
      {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {delta > 0 ? '+' : ''}
      {fmtN(delta, 1)}
      {unit ?? ''}
    </span>
  );
}

function CompareRow({
  metric,
  eA,
  eB,
}: {
  metric: MetricSpec;
  eA: ExtractedBioimpedance;
  eB: ExtractedBioimpedance;
}) {
  const rawA = eA[metric.key] as number | null | undefined;
  const rawB = eB[metric.key] as number | null | undefined;
  const a = rawA != null && Number.isFinite(rawA) ? rawA : null;
  const b = rawB != null && Number.isFinite(rawB) ? rawB : null;
  const max = Math.max(a ?? 0, b ?? 0) || 1;
  const delta = a != null && b != null ? b - a : null;
  const status = b != null && metric.classify ? metric.classify(b, eB) : null;
  const Icon = metric.icon;
  const fmt = (v: number) => (metric.format ? metric.format(v) : fmtN(v, 1));

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium truncate">{metric.label}</p>
        </div>
        {status && (
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full border shrink-0', toneClasses[status.tone])}>
            {status.label}
          </span>
        )}
      </div>

      {/* Side-by-side columns */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: a, primary: false },
          { value: b, primary: true },
        ].map(({ value, primary }, idx) => (
          <div key={idx} className="space-y-1.5 min-w-0">
            <p className="text-[10px] text-muted-foreground">{idx === 0 ? 'Exame A' : 'Exame B'}</p>
            <p className={cn('text-xl font-semibold leading-none', primary && 'text-primary')}>
              {value != null ? fmt(value) : '—'}
              {value != null && metric.unit && (
                <span className="text-[11px] font-normal text-muted-foreground ml-1">{metric.unit}</span>
              )}
            </p>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              {value != null && (
                <div
                  className={cn('h-full rounded-full', primary ? 'bg-primary' : 'bg-muted-foreground/40')}
                  style={{ width: `${Math.max(4, Math.round((value / max) * 100))}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">Variação de A para B</p>
        <DeltaBadge
          delta={delta}
          direction={DIRECTION[metric.key] ?? 'neutral'}
          unit={metric.unit ? ` ${metric.unit}` : ''}
        />
      </div>
    </div>
  );
}
