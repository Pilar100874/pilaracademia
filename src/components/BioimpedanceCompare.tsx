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
import { bioToTapeValues } from '@/components/BioReport';
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

/** Rótulos com seta do morph: gordura e músculo por região (dados reais do exame). */
function segCallouts(a: ExtractedBioimpedance, b: ExtractedBioimpedance): MorphCallout[] {
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
  type Seg = ExtractedBioimpedance['segmental_fat'];
  const pair = (
    seg: Seg,
    l: 'left_arm_kg' | 'left_leg_kg',
    r: 'right_arm_kg' | 'right_leg_kg',
  ): number | null => {
    const vals = [num(seg?.[l]), num(seg?.[r])].filter((v): v is number => v != null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };
  const fatA = a.segmental_fat;
  const fatB = b.segmental_fat;
  const musA = a.segmental_muscle;
  const musB = b.segmental_muscle;
  return [
    { side: 'left', region: 'leftArm', label: 'Gordura braço', a: pair(fatA, 'left_arm_kg', 'right_arm_kg'), b: pair(fatB, 'left_arm_kg', 'right_arm_kg'), unit: 'kg', y: 104 },
    { side: 'left', region: 'trunk', label: 'Gordura tronco', a: num(fatA?.trunk_kg), b: num(fatB?.trunk_kg), unit: 'kg', y: 200 },
    { side: 'left', region: 'leftLeg', label: 'Gordura perna', a: pair(fatA, 'left_leg_kg', 'right_leg_kg'), b: pair(fatB, 'left_leg_kg', 'right_leg_kg'), unit: 'kg', y: 304 },
    { side: 'right', region: 'rightArm', label: 'Músculo braço', a: pair(musA, 'left_arm_kg', 'right_arm_kg'), b: pair(musB, 'left_arm_kg', 'right_arm_kg'), unit: 'kg', y: 104 },
    { side: 'right', region: 'trunk', label: 'Músculo tronco', a: num(musA?.trunk_kg), b: num(musB?.trunk_kg), unit: 'kg', y: 200 },
    { side: 'right', region: 'rightLeg', label: 'Músculo perna', a: pair(musA, 'left_leg_kg', 'right_leg_kg'), b: pair(musB, 'left_leg_kg', 'right_leg_kg'), unit: 'kg', y: 304 },
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
  const [idA, setIdA] = useState<string>(rows[1]?.id ?? rows[0].id);
  const [idB, setIdB] = useState<string>(rows[0].id);

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
