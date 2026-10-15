import { Activity, Bone, Droplet, Dumbbell, Flame, Scale, Zap } from 'lucide-react';
import type { BodyAnalysisRow, ExtractedBioimpedance } from '@/types/bodyAnalysis';
import { fmtN } from '@/components/BioimpedanceTab';
import {
  HumanSilhouette,
  computeDims,
  regionAnchor,
  type RegionTones,
  type ZoneScales,
} from '@/components/HumanBodyFigure';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Heurísticas de referência (aproximadas, uso ilustrativo)            */
/* ------------------------------------------------------------------ */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const num = (v: number | null | undefined) =>
  v != null && Number.isFinite(v) ? v : null;

function fatStandardRange(e: ExtractedBioimpedance): [number, number] {
  return e.sex === 'female' ? [18, 28] : [10, 20];
}

function bmiStandard(e: ExtractedBioimpedance): [number, number] | null {
  return [18.5, 25];
}

function skeletalMuscleRange(e: ExtractedBioimpedance): [number, number] | null {
  const w = num(e.weight_kg);
  if (w == null) return null;
  // músculo esquelético típico: ~33–40% do peso (H), ~24–30% (M)
  const [lo, hi] = e.sex === 'female' ? [0.24, 0.3] : [0.33, 0.4];
  return [w * lo, w * hi];
}

function waterPctRange(): [number, number] {
  return [50, 65];
}

/** Índice de músculo esquelético (kg/m²) — base da matriz de tipo corporal */
function smi(e: ExtractedBioimpedance): number | null {
  const h = num(e.height_cm);
  const sm = num(e.skeletal_muscle_kg) ?? (num(e.muscle_mass_kg) != null ? num(e.muscle_mass_kg)! * 0.55 : null);
  if (h == null || sm == null || h <= 0) return null;
  const m = h / 100;
  return sm / (m * m);
}

function smiLevel(e: ExtractedBioimpedance): 0 | 1 | 2 | null {
  const v = smi(e);
  if (v == null) return null;
  const [lo, hi] = e.sex === 'female' ? [5.5, 7.5] : [7.0, 9.5];
  return v < lo ? 0 : v > hi ? 2 : 1;
}

function fatLevel(e: ExtractedBioimpedance): 0 | 1 | 2 | null {
  const bf = num(e.body_fat_pct);
  if (bf == null) return null;
  const [lo, hi] = fatStandardRange(e);
  return bf < lo ? 0 : bf > hi ? 2 : 1;
}

/* ------------------------------------------------------------------ */
/* Converte bioimpedância em "medidas" para o desenho/morph corporal   */
/* (ilustração proporcional — não são medidas de trena)                */
/* ------------------------------------------------------------------ */

export function bioToTapeValues(e: ExtractedBioimpedance): Partial<Record<string, number | null>> {
  const w = num(e.weight_kg);
  const bf = num(e.body_fat_pct);
  const fat = num(e.fat_mass_kg) ?? (w != null && bf != null ? (w * bf) / 100 : null);
  const sm = num(e.skeletal_muscle_kg) ?? (num(e.muscle_mass_kg) != null ? num(e.muscle_mass_kg)! * 0.6 : null);
  const segM = e.segmental_muscle ?? {};
  const segF = e.segmental_fat ?? {};
  const armM = ((num(segM.left_arm_kg) ?? 0) + (num(segM.right_arm_kg) ?? 0)) / 2 || (sm != null ? sm * 0.09 : null);
  const legM = ((num(segM.left_leg_kg) ?? 0) + (num(segM.right_leg_kg) ?? 0)) / 2 || (sm != null ? sm * 0.24 : null);
  const armF = ((num(segF.left_arm_kg) ?? 0) + (num(segF.right_arm_kg) ?? 0)) / 2 || (fat != null ? fat * 0.06 : null);
  const legF = ((num(segF.left_leg_kg) ?? 0) + (num(segF.right_leg_kg) ?? 0)) / 2 || (fat != null ? fat * 0.17 : null);

  const waist = fat != null ? 60 + fat * 1.15 : null;
  const chest = sm != null ? 72 + sm * 1.1 : null;
  const arm = armM != null ? 22 + armM * 2.4 + (armF ?? 0) * 1.4 : null;
  const thigh = legM != null ? 36 + legM * 1.7 + (legF ?? 0) * 0.9 : null;

  return {
    neck_cm: 37,
    shoulders_cm: chest != null ? chest + 11 : null,
    chest_cm: chest,
    waist_cm: waist,
    abdomen_cm: waist != null ? waist + 5 : null,
    hip_cm: fat != null ? 70 + fat * 1.0 + (w != null ? (w - fat) * 0.16 : 0) : null,
    arm_left_cm: arm,
    arm_right_cm: arm,
    forearm_left_cm: arm != null ? arm * 0.82 : null,
    forearm_right_cm: arm != null ? arm * 0.82 : null,
    thigh_left_cm: thigh,
    thigh_right_cm: thigh,
    calf_left_cm: legM != null ? 29 + legM * 0.6 : null,
    calf_right_cm: legM != null ? 29 + legM * 0.6 : null,
  };
}

/* ------------------------------------------------------------------ */
/* Barra de posição (abaixo / padrão / acima)                          */
/* ------------------------------------------------------------------ */

function RangeBar({
  value,
  min,
  max,
  std,
  formatVal,
}: {
  value: number;
  min: number;
  max: number;
  std: [number, number] | null;
  formatVal: (v: number) => string;
}) {
  const pct = clamp(((value - min) / (max - min)) * 100, 0, 100);
  const s1 = std ? clamp(((std[0] - min) / (max - min)) * 100, 0, 100) : null;
  const s2 = std ? clamp(((std[1] - min) / (max - min)) * 100, 0, 100) : null;
  const inStd = std ? value >= std[0] && value <= std[1] : null;
  return (
    <div className="space-y-1">
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        {s1 != null && s2 != null && (
          <div
            className="absolute top-0 h-full bg-emerald-500/30"
            style={{ left: `${s1}%`, width: `${s2 - s1}%` }}
          />
        )}
        <div
          className="absolute top-[-2px] h-3 w-1.5 rounded-full"
          style={{
            left: `calc(${pct}% - 3px)`,
            backgroundColor:
              inStd == null
                ? 'hsl(var(--primary))'
                : inStd
                  ? 'hsl(150 60% 40%)'
                  : 'hsl(40 90% 45%)',
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{formatVal(min)}</span>
        {std && (
          <span className="text-emerald-700">
            padrão {formatVal(std[0])}–{formatVal(std[1])}
          </span>
        )}
        <span>{formatVal(max)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Figura segmentar (gordura / músculo) estilo relatório               */
/* ------------------------------------------------------------------ */

type SegKey = 'trunk_kg' | 'left_arm_kg' | 'right_arm_kg' | 'left_leg_kg' | 'right_leg_kg';
type SegValues = Partial<Record<SegKey, number>>;

type Tone = 'good' | 'std' | 'warn' | 'bad';

const FAT_SHARE: Record<SegKey, number> = {
  trunk_kg: 0.5,
  left_arm_kg: 0.065,
  right_arm_kg: 0.065,
  left_leg_kg: 0.175,
  right_leg_kg: 0.175,
};

const REF: Record<'fat' | 'muscle', Record<'trunk' | 'arm' | 'leg', number>> = {
  fat: { trunk: 11, arm: 1.0, leg: 4.0 },
  muscle: { trunk: 24, arm: 3.2, leg: 9.5 },
};

/** Referência por segmento proporcional ao peso, quando disponível */
function segRef(kind: 'fat' | 'muscle', seg: 'trunk' | 'arm' | 'leg', weightKg?: number): number {
  if (weightKg == null || weightKg <= 0) return REF[kind][seg];
  const share = kind === 'fat'
    ? { trunk: 0.1, arm: 0.013, leg: 0.028 }
    : { trunk: 0.3, arm: 0.045, leg: 0.115 };
  return weightKg * share[seg];
}

const CLS_COLOR: Record<'good' | 'warn' | 'bad', string> = {
  good: 'hsl(150 55% 36%)',
  warn: 'hsl(35 85% 36%)',
  bad: 'hsl(0 65% 44%)',
};

export function SegmentalFigure({
  kind,
  values,
  weightKg,
}: {
  kind: 'fat' | 'muscle';
  values: SegValues;
  weightKg?: number;
}) {
  const ref = {
    trunk: segRef(kind, 'trunk', weightKg),
    arm: segRef(kind, 'arm', weightKg),
    leg: segRef(kind, 'leg', weightKg),
  };
  const total = (Object.values(values).filter((v): v is number => v != null) as number[]).reduce(
    (s, v) => s + v,
    0,
  );

  const toneFor = (key: SegKey): Tone => {
    const v = values[key];
    if (v == null || total <= 0) return 'std';
    if (kind === 'fat') {
      const ratio = v / total / FAT_SHARE[key];
      if (ratio < 0.85) return 'good';
      if (ratio <= 1.15) return 'std';
      if (ratio <= 1.4) return 'warn';
      return 'bad';
    }
    // músculo: simetria entre os lados
    if (key === 'trunk_kg') return 'std';
    const pair: SegKey =
      key === 'left_arm_kg'
        ? 'right_arm_kg'
        : key === 'right_arm_kg'
          ? 'left_arm_kg'
          : key === 'left_leg_kg'
            ? 'right_leg_kg'
            : 'left_leg_kg';
    const other = values[pair];
    if (other == null) return 'std';
    const asym = Math.abs(v - other) / ((v + other) / 2);
    if (asym < 0.08) return 'good';
    if (asym < 0.15) return 'warn';
    return 'bad';
  };

  // Amortece a proporção para o desenho continuar humano mesmo com valores extremos
  const damp = (s: number | undefined, f = 0.45) =>
    s == null ? undefined : clamp(1 + (s - 1) * f, 0.72, 1.35);

  const sc = (kg: number | undefined, refKg: number) => (kg != null ? kg / refKg : undefined);
  const trunkS = sc(values.trunk_kg, ref.trunk);
  const legAvg =
    values.left_leg_kg != null || values.right_leg_kg != null
      ? (((values.left_leg_kg ?? values.right_leg_kg)! + (values.right_leg_kg ?? values.left_leg_kg)!) / 2) / ref.leg
      : undefined;

  const scales: ZoneScales = {
    shoulders: damp(trunkS, 0.3),
    chest: damp(trunkS, 0.5),
    waist: kind === 'fat' ? damp(trunkS, 0.6) : undefined,
    hip: kind === 'fat' ? damp(trunkS, 0.55) : damp(legAvg, 0.5),
    armL: damp(sc(values.left_arm_kg, ref.arm), 0.55),
    armR: damp(sc(values.right_arm_kg, ref.arm), 0.55),
    thighL: damp(sc(values.left_leg_kg, ref.leg), 0.55),
    thighR: damp(sc(values.right_leg_kg, ref.leg), 0.55),
  };

  const tones: RegionTones = {
    leftArm: toneFor('left_arm_kg'),
    rightArm: toneFor('right_arm_kg'),
    trunk: toneFor('trunk_kg'),
    leftLeg: toneFor('left_leg_kg'),
    rightLeg: toneFor('right_leg_kg'),
  };

  const dims = computeDims(scales);
  const OFF = 30;

  const classify = (
    kg: number | undefined,
    refKg: number,
  ): { pct: number; label: string; tone: 'good' | 'warn' | 'bad' } | null => {
    if (kg == null) return null;
    const pct = (kg / refKg) * 100;
    if (pct < 90) return { pct, label: 'Baixo', tone: kind === 'muscle' ? 'warn' : 'good' };
    if (pct <= 110) return { pct, label: 'Padrão', tone: 'good' };
    return { pct, label: 'Acima', tone: kind === 'muscle' ? 'good' : 'bad' };
  };

  const callout = (side: 'left' | 'right', region: keyof RegionTones, kg: number | undefined, refKg: number, y: number) => {
    const dot = regionAnchor(region, dims);
    const dx = OFF + dot.x;
    const dy = dot.y;
    const sx = side === 'left' ? 50 : 210;
    const tx = side === 'left' ? 2 : 258;
    const anchor = side === 'left' ? 'start' : 'end';
    const c = classify(kg, refKg);
    const connector =
      side === 'left'
        ? `M ${sx} ${y - 4} C ${sx + 18} ${y - 14}, ${dx - 16} ${dy}, ${dx} ${dy}`
        : `M ${sx} ${y - 4} C ${sx - 18} ${y - 14}, ${dx + 16} ${dy}, ${dx} ${dy}`;
    return (
      <g key={`${side}-${region}`}>
        <path d={connector} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={0.9} opacity={0.7} />
        <circle cx={dx} cy={dy} r={2.6} fill="hsl(var(--foreground))" />
        <text x={tx} y={y} textAnchor={anchor} fontSize={13} fontWeight={700} style={{ fill: 'hsl(var(--foreground))' }}>
          {kg != null ? `${fmtN(kg, 1)}kg` : '—'}
        </text>
        {c && (
          <>
            <text x={tx} y={y + 14} textAnchor={anchor} fontSize={11.5} fontWeight={600} style={{ fill: 'hsl(var(--foreground))' }}>
              {fmtN(c.pct, 1)}%
            </text>
            <text x={tx} y={y + 26} textAnchor={anchor} fontSize={9} style={{ fill: CLS_COLOR[c.tone] }}>
              {c.label}
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <HumanSilhouette scales={scales} tones={tones} badges palette={kind} offsetX={OFF} frameWidth={260} className="max-w-[280px]">
      {callout('left', 'leftArm', values.left_arm_kg, ref.arm, 100)}
      {callout('left', 'trunk', values.trunk_kg, ref.trunk, 196)}
      {callout('left', 'leftLeg', values.left_leg_kg, ref.leg, 300)}
      {callout('right', 'rightArm', values.right_arm_kg, ref.arm, 100)}
      {callout('right', 'rightLeg', values.right_leg_kg, ref.leg, 300)}
    </HumanSilhouette>
  );
}

/* ------------------------------------------------------------------ */
/* Matriz de tipo corporal (músculo × gordura)                          */
/* ------------------------------------------------------------------ */

const BODY_TYPE_LABELS: string[][] = [
  ['Atlético magro', 'Atlético', 'Muscular com gordura'],
  ['Magro', 'Equilibrado', 'Sobrepeso'],
  ['Baixo músculo', 'Falso magro', 'Obeso'],
];

function BodyTypeMatrix({ e }: { e: ExtractedBioimpedance }) {
  const m = smiLevel(e);
  const f = fatLevel(e);
  if (m == null || f == null) return null;
  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Tipo corporal</p>
      <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1 text-[10px]">
        <span />
        {['Gordura baixa', 'Gordura normal', 'Gordura alta'].map((l) => (
          <span key={l} className={cn('text-center text-muted-foreground', f === ['Gordura baixa', 'Gordura normal', 'Gordura alta'].indexOf(l) && 'font-semibold text-foreground')}>
            {l}
          </span>
        ))}
        {['Músculo alto', 'Músculo médio', 'Músculo baixo'].map((rowLabel, r) => (
          <>
            <span key={rowLabel} className={cn('self-center text-muted-foreground pr-1', m === r && 'font-semibold text-foreground')}>
              {rowLabel}
            </span>
            {[0, 1, 2].map((c) => {
              const active = m === r && f === c;
              return (
                <div
                  key={`${r}-${c}`}
                  className={cn(
                    'rounded-sm border px-1 py-2 text-center leading-tight',
                    active
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-muted/40 text-muted-foreground',
                  )}
                >
                  {BODY_TYPE_LABELS[r][c]}
                </div>
              );
            })}
          </>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Estimativa a partir do músculo esquelético por altura e do percentual de gordura.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Controle de peso (peso ideal estimado pela altura)                  */
/* ------------------------------------------------------------------ */

function WeightControlCard({
  e,
  weight,
  fatMass,
  lean,
}: {
  e: ExtractedBioimpedance;
  weight: number | null;
  fatMass: number | null;
  lean: number | null;
}) {
  const h = num(e.height_cm);
  if (h == null || weight == null) return null;
  const m = h / 100;
  const ideal = (e.sex === 'female' ? 21 : 22) * m * m;
  const adjust = weight - ideal;
  const [flo, fhi] = fatStandardRange(e);
  const targetFat = (ideal * ((flo + fhi) / 2)) / 100;
  const fatCtl = fatMass != null ? fatMass - targetFat : null;
  const muscleCtl = lean != null ? lean - (ideal - targetFat) : null;

  const rows = [
    { label: 'Peso ideal estimado', v: `${fmtN(ideal, 1)} kg`, tone: 'text-foreground' },
    {
      label: 'Ajuste de peso',
      v: `${adjust > 0 ? '+' : ''}${fmtN(adjust, 1)} kg`,
      tone: Math.abs(adjust) < 2 ? 'text-emerald-700' : 'text-amber-700',
    },
    fatCtl != null
      ? {
          label: 'Controle de gordura',
          v: `${fatCtl > 0 ? '-' : '+'}${fmtN(Math.abs(fatCtl), 1)} kg`,
          tone: Math.abs(fatCtl) < 2 ? 'text-emerald-700' : 'text-amber-700',
        }
      : null,
    muscleCtl != null
      ? {
          label: 'Controle muscular',
          v: `${muscleCtl > 0 ? '+' : ''}${fmtN(muscleCtl, 1)} kg`,
          tone: muscleCtl >= -1 ? 'text-emerald-700' : 'text-amber-700',
        }
      : null,
  ].filter((r): r is NonNullable<typeof r> => r != null);

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-2">
      <p className="text-sm font-medium">Controle de peso</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{r.label}</span>
          <span className={cn('font-semibold', r.tone)}>{r.v}</span>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Estimativa a partir da altura e da faixa de gordura padrão para o seu sexo.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Outros indicadores                                                  */
/* ------------------------------------------------------------------ */

function statusChip(ok: boolean | null): { label: string; cls: string } {
  if (ok == null) return { label: '—', cls: 'bg-muted text-muted-foreground' };
  return ok
    ? { label: 'Padrão', cls: 'bg-emerald-500/15 text-emerald-700' }
    : { label: 'Atenção', cls: 'bg-amber-500/15 text-amber-700' };
}

function OtherIndicatorsCard({ e, weight }: { e: ExtractedBioimpedance; weight: number | null }) {
  const protein = num(e.protein_mass_kg);
  const proteinPct = protein != null && weight != null && weight > 0 ? (protein / weight) * 100 : null;
  const visceral = num(e.visceral_fat);
  const whr = num(e.whr);
  const bodyAge = num(e.body_age);
  const age = num(e.age);
  const whrStd = e.sex === 'female' ? 0.85 : 0.9;

  const rows: { label: string; value: string; ok: boolean | null }[] = [
    protein != null
      ? {
          label: 'Proteína',
          value: `${fmtN(protein, 1)} kg${proteinPct != null ? ` (${fmtN(proteinPct, 1)}%)` : ''}`,
          ok: proteinPct != null ? proteinPct >= 14 && proteinPct <= 22 : null,
        }
      : null,
    num(e.bone_mass_kg) != null
      ? { label: 'Massa óssea', value: `${fmtN(num(e.bone_mass_kg)!, 1)} kg`, ok: null }
      : null,
    visceral != null
      ? { label: 'Gordura visceral', value: `nível ${fmtN(visceral, 0)}`, ok: visceral <= 9 }
      : null,
    num(e.bmr_kcal) != null
      ? { label: 'Metabolismo basal', value: `${fmtN(num(e.bmr_kcal)!, 0)} kcal`, ok: null }
      : null,
    bodyAge != null
      ? {
          label: 'Idade corporal',
          value: `${fmtN(bodyAge, 0)} anos${age != null ? ` (real: ${fmtN(age, 0)})` : ''}`,
          ok: age != null ? bodyAge <= age : null,
        }
      : null,
    whr != null
      ? { label: 'Relação cintura-quadril', value: fmtN(whr, 2), ok: whr <= whrStd }
      : null,
  ].filter((r): r is NonNullable<typeof r> => r != null);

  if (rows.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-2">
      <p className="text-sm font-medium">Outros indicadores</p>
      {rows.map((r) => {
        const chip = statusChip(r.ok);
        return (
          <div key={r.label} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="flex items-center gap-2">
              <span className="font-semibold">{r.value}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', chip.cls)}>
                {chip.label}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Equilíbrio corporal (superior × inferior)                            */
/* ------------------------------------------------------------------ */

function BodyBalanceCard({ e, weight }: { e: ExtractedBioimpedance; weight: number | null }) {
  const seg = e.segmental_muscle;
  if (!seg) return null;
  const armAvg =
    ((num(seg.left_arm_kg) ?? 0) + (num(seg.right_arm_kg) ?? 0)) / 2 || null;
  const legAvg =
    ((num(seg.left_leg_kg) ?? 0) + (num(seg.right_leg_kg) ?? 0)) / 2 || null;
  const trunk = num(seg.trunk_kg);
  if (armAvg == null && legAvg == null && trunk == null) return null;

  const refArm = segRef('muscle', 'arm', weight ?? undefined);
  const refLeg = segRef('muscle', 'leg', weight ?? undefined);
  const refTrunk = segRef('muscle', 'trunk', weight ?? undefined);

  const evalPart = (v: number | null, ref: number): boolean | null => {
    if (v == null) return null;
    const ratio = v / ref;
    return ratio >= 0.85 && ratio <= 1.2;
  };

  const rows = [
    { label: 'Parte superior (braços)', ok: evalPart(armAvg, refArm) },
    { label: 'Tronco', ok: evalPart(trunk, refTrunk) },
    { label: 'Parte inferior (pernas)', ok: evalPart(legAvg, refLeg) },
  ];

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-2">
      <p className="text-sm font-medium">Avaliação do equilíbrio corporal</p>
      {rows.map((r) => {
        const chip = r.ok == null
          ? { label: '—', cls: 'bg-muted text-muted-foreground' }
          : r.ok
            ? { label: 'Equilibrado', cls: 'bg-emerald-500/15 text-emerald-700' }
            : { label: 'Desequilibrado', cls: 'bg-amber-500/15 text-amber-700' };
        return (
          <div key={r.label} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', chip.cls)}>
              {chip.label}
            </span>
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Compara o músculo de cada parte com a referência proporcional ao seu peso.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gasto estimado em exercícios (30 min)                                */
/* ------------------------------------------------------------------ */

function ExerciseBurnCard({ weight }: { weight: number | null }) {
  if (weight == null || weight <= 0) return null;
  const activities = [
    { icon: Activity, label: 'Caminhada', met: 3.5 },
    { icon: Zap, label: 'Corrida', met: 9 },
    { icon: Activity, label: 'Ciclismo', met: 7 },
    { icon: Droplet, label: 'Natação', met: 8 },
    { icon: Dumbbell, label: 'Musculação', met: 5 },
  ];
  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Gasto estimado em exercícios (30 min)</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {activities.map((a) => {
          const Icon = a.icon;
          const kcal = a.met * weight * 0.5;
          return (
            <div key={a.label} className="rounded-md border border-border bg-muted/30 p-2.5 text-center">
              <Icon className="h-4 w-4 mx-auto text-primary" />
              <p className="text-sm font-semibold mt-1">{fmtN(kcal, 0)} kcal</p>
              <p className="text-[10px] text-muted-foreground">{a.label}</p>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Estimativa pelo seu peso atual — valores reais variam com a intensidade.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Relatório estilo Fitdays                                            */
/* ------------------------------------------------------------------ */

export function BioReport({ e, row }: { e: ExtractedBioimpedance; row: BodyAnalysisRow }) {
  const weight = num(e.weight_kg);
  const bf = num(e.body_fat_pct);
  const bmi = num(e.bmi);
  const fatMass = num(e.fat_mass_kg) ?? (weight != null && bf != null ? (weight * bf) / 100 : null);
  const sm = num(e.skeletal_muscle_kg);
  const muscle = num(e.muscle_mass_kg);
  const water = num(e.body_water_kg);
  const waterPct = water != null && weight != null && weight > 0 ? (water / weight) * 100 : null;
  const visceral = num(e.visceral_fat);

  const goal = row.plan?.goal;
  const weightControl = goal?.target_weight_kg != null && weight != null ? goal.target_weight_kg - weight : null;
  const targetFatMass =
    goal?.target_weight_kg != null && goal?.target_body_fat_pct != null
      ? (goal.target_weight_kg * goal.target_body_fat_pct) / 100
      : null;
  const fatControl = targetFatMass != null && fatMass != null ? targetFatMass - fatMass : null;
  const lean = num(e.lean_mass_kg) ?? (weight != null && fatMass != null ? weight - fatMass : null);
  const muscleControl =
    goal?.target_weight_kg != null && targetFatMass != null && lean != null
      ? goal.target_weight_kg - targetFatMass - lean
      : null;

  const hasSegmentalFat = e.segmental_fat && Object.values(e.segmental_fat).some((v) => v != null);
  const hasSegmentalMuscle = e.segmental_muscle && Object.values(e.segmental_muscle).some((v) => v != null);

  const tiles = [
    { icon: Scale, label: 'Peso', value: weight, unit: 'kg' },
    { icon: Flame, label: 'Gordura', value: bf, unit: '%' },
    { icon: Dumbbell, label: 'Músculo', value: muscle, unit: 'kg' },
    { icon: Droplet, label: 'Água', value: waterPct, unit: '%' },
    { icon: Bone, label: 'Ossos', value: num(e.bone_mass_kg), unit: 'kg' },
    { icon: Zap, label: 'Metabolismo basal', value: num(e.bmr_kcal), unit: 'kcal' },
    { icon: Activity, label: 'Idade corporal', value: num(e.body_age), unit: 'anos' },
  ].filter((t) => t.value != null);

  return (
    <div className="space-y-4">
      {/* Score + metas de controle */}
      <div className="grid gap-3 sm:grid-cols-2">
        {row.score != null && (
          <div className="rounded-md border border-border bg-card p-4 text-center">
            <p className="text-[11px] text-muted-foreground">Score corporal</p>
            <p className="text-4xl font-bold text-primary leading-tight">
              {Math.round(row.score)}
              <span className="text-base font-medium text-muted-foreground">/100</span>
            </p>
            {row.profile_label && (
              <p className="text-[11px] text-muted-foreground mt-1">{row.profile_label}</p>
            )}
          </div>
        )}
        {(weightControl != null || fatControl != null || muscleControl != null) && (
          <div className="rounded-md border border-border bg-card p-4 space-y-2">
            <p className="text-[11px] text-muted-foreground">Metas de controle</p>
            {[
              { label: 'Peso', v: weightControl, upGood: false },
              { label: 'Gordura', v: fatControl, upGood: false },
              { label: 'Músculo', v: muscleControl, upGood: true },
            ]
              .filter((r) => r.v != null)
              .map((r) => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span>{r.label}</span>
                  <span
                    className={cn(
                      'font-semibold',
                      r.v! === 0
                        ? 'text-muted-foreground'
                        : r.upGood
                          ? r.v! > 0
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                          : r.v! < 0
                            ? 'text-emerald-700'
                            : 'text-amber-700',
                    )}
                  >
                    {r.v! > 0 ? '+' : ''}
                    {fmtN(r.v!, 1)} kg
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Mosaico principal */}
      {tiles.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="rounded-md border border-border bg-card p-3 text-center">
                <Icon className="h-4 w-4 mx-auto text-primary" />
                <p className="text-lg font-semibold leading-tight mt-1">
                  {fmtN(t.value!, 1)}
                  <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{t.unit}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">{t.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Análise de obesidade */}
      {(bmi != null || bf != null || visceral != null) && (
        <div className="rounded-md border border-border bg-card p-4 space-y-4">
          <p className="text-sm font-medium">Análise de obesidade</p>
          {bmi != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>IMC</span>
                <span className="font-semibold">{fmtN(bmi, 1)} kg/m²</span>
              </div>
              <RangeBar value={bmi} min={13} max={40} std={bmiStandard(e)} formatVal={(v) => fmtN(v, 0)} />
            </div>
          )}
          {bf != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Gordura corporal</span>
                <span className="font-semibold">{fmtN(bf, 1)}%</span>
              </div>
              <RangeBar
                value={bf}
                min={3}
                max={e.sex === 'female' ? 45 : 40}
                std={fatStandardRange(e)}
                formatVal={(v) => `${fmtN(v, 0)}%`}
              />
            </div>
          )}
          {visceral != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Gordura visceral</span>
                <span className="font-semibold">nível {fmtN(visceral, 0)}</span>
              </div>
              <RangeBar value={visceral} min={1} max={30} std={[1, 9]} formatVal={(v) => fmtN(v, 0)} />
            </div>
          )}
        </div>
      )}

      {/* Análise músculo-gordura */}
      {(weight != null || sm != null || fatMass != null || waterPct != null) && (
        <div className="rounded-md border border-border bg-card p-4 space-y-4">
          <p className="text-sm font-medium">Análise músculo-gordura</p>
          {weight != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Peso</span>
                <span className="font-semibold">{fmtN(weight, 1)} kg</span>
              </div>
              {num(e.height_cm) != null ? (
                (() => {
                  const h = num(e.height_cm)! / 100;
                  return (
                    <RangeBar
                      value={weight}
                      min={13 * h * h}
                      max={40 * h * h}
                      std={[18.5 * h * h, 25 * h * h]}
                      formatVal={(v) => `${fmtN(v, 0)}kg`}
                    />
                  );
                })()
              ) : (
                <p className="text-[10px] text-muted-foreground">Informe a altura no exame para ver a faixa padrão.</p>
              )}
            </div>
          )}
          {sm != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Músculo esquelético</span>
                <span className="font-semibold">{fmtN(sm, 1)} kg</span>
              </div>
              {skeletalMuscleRange(e) ? (
                <RangeBar
                  value={sm}
                  min={skeletalMuscleRange(e)![0] * 0.6}
                  max={skeletalMuscleRange(e)![1] * 1.5}
                  std={skeletalMuscleRange(e)}
                  formatVal={(v) => `${fmtN(v, 0)}kg`}
                />
              ) : null}
            </div>
          )}
          {fatMass != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Massa de gordura</span>
                <span className="font-semibold">{fmtN(fatMass, 1)} kg</span>
              </div>
              {weight != null ? (
                (() => {
                  const [lo, hi] = fatStandardRange(e);
                  return (
                    <RangeBar
                      value={fatMass}
                      min={weight * 0.03}
                      max={weight * 0.5}
                      std={[(weight * lo) / 100, (weight * hi) / 100]}
                      formatVal={(v) => `${fmtN(v, 0)}kg`}
                    />
                  );
                })()
              ) : null}
            </div>
          )}
          {waterPct != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Água corporal</span>
                <span className="font-semibold">{fmtN(waterPct, 1)}%</span>
              </div>
              <RangeBar value={waterPct} min={35} max={75} std={waterPctRange()} formatVal={(v) => `${fmtN(v, 0)}%`} />
            </div>
          )}
        </div>
      )}

      {/* Figuras segmentares */}
      {(hasSegmentalFat || hasSegmentalMuscle) && (
        <div className={cn('grid gap-3', hasSegmentalFat && hasSegmentalMuscle && 'sm:grid-cols-2')}>
          {hasSegmentalFat && (
            <div className="rounded-md border border-border bg-card p-4 space-y-2">
              <p className="text-sm font-medium">Gordura por região</p>
              <SegmentalFigure kind="fat" values={e.segmental_fat!} weightKg={weight ?? undefined} />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Verde: abaixo do esperado · azul: dentro do padrão · amarelo/vermelho: acima,
                comparando a distribuição entre as regiões.
              </p>
            </div>
          )}
          {hasSegmentalMuscle && (
            <div className="rounded-md border border-border bg-card p-4 space-y-2">
              <p className="text-sm font-medium">Equilíbrio muscular</p>
              <SegmentalFigure kind="muscle" values={e.segmental_muscle!} weightKg={weight ?? undefined} />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Verde: lados equilibrados · amarelo/vermelho: assimetria entre esquerdo e direito.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tipo corporal */}
      <BodyTypeMatrix e={e} />
    </div>
  );
}
