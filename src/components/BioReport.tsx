import { Activity, Bone, Droplet, Dumbbell, Flame, Scale } from 'lucide-react';
import type { BodyAnalysisRow, ExtractedBioimpedance } from '@/types/bodyAnalysis';
import { fmtN } from '@/components/BioimpedanceTab';
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

const toneFill: Record<Tone, string> = {
  good: 'hsl(150 60% 45% / 0.30)',
  std: 'hsl(var(--primary) / 0.18)',
  warn: 'hsl(40 90% 50% / 0.32)',
  bad: 'hsl(0 70% 55% / 0.32)',
};
const toneStroke: Record<Tone, string> = {
  good: 'hsl(150 60% 40%)',
  std: 'hsl(var(--primary))',
  warn: 'hsl(40 90% 42%)',
  bad: 'hsl(0 70% 50%)',
};
const toneText: Record<Tone, string> = {
  good: 'text-emerald-700',
  std: 'text-primary',
  warn: 'text-amber-700',
  bad: 'text-red-700',
};

const FAT_SHARE: Record<SegKey, number> = {
  trunk_kg: 0.5,
  left_arm_kg: 0.065,
  right_arm_kg: 0.065,
  left_leg_kg: 0.175,
  right_leg_kg: 0.175,
};

const REF: Record<'fat' | 'muscle', Record<'trunk' | 'arm' | 'leg', number>> = {
  fat: { trunk: 11, arm: 1.0, leg: 4.0 },
  muscle: { trunk: 16, arm: 3.0, leg: 9.0 },
};

function SegmentalFigure({ kind, values }: { kind: 'fat' | 'muscle'; values: SegValues }) {
  const CX = 110;
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

  const ref = REF[kind];
  const widthOf = (seg: 'trunk' | 'arm' | 'leg', kg: number | undefined, base: number) =>
    base * clamp((kg ?? ref[seg]) / ref[seg], 0.6, 1.5);

  const tw = widthOf('trunk', values.trunk_kg, kind === 'fat' ? 26 : 24);
  const awL = widthOf('arm', values.left_arm_kg, 6.5);
  const awR = widthOf('arm', values.right_arm_kg, 6.5);
  const lwL = widthOf('leg', values.left_leg_kg, 11);
  const lwR = widthOf('leg', values.right_leg_kg, 11);

  const chip = (
    x: number,
    y: number,
    anchor: 'start' | 'end',
    label: string,
    kg: number | undefined,
    tone: Tone,
  ) => (
    <g>
      <text x={x} y={y} textAnchor={anchor} fontSize={8} style={{ fill: 'hsl(var(--muted-foreground))' }}>
        {label}
      </text>
      <text
        x={x}
        y={y + 11}
        textAnchor={anchor}
        fontSize={10.5}
        fontWeight={700}
        style={{ fill: toneStroke[tone] }}
      >
        {kg != null ? `${fmtN(kg, 1)} kg` : '—'}
      </text>
    </g>
  );

  const line = (x1: number, y1: number, x2: number, y2: number) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="2 2" />
  );

  return (
    <svg viewBox="0 0 220 400" className="w-full max-w-[220px] mx-auto select-none" role="img">
      {/* cabeça */}
      <circle cx={CX} cy={24} r={14} fill="hsl(var(--muted))" stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
      <rect x={CX - 6} y={36} width={12} height={12} rx={3} fill="hsl(var(--muted))" stroke="hsl(var(--muted-foreground))" strokeWidth={1} />

      {/* braços */}
      <rect x={CX - tw - awL * 2 - 4} y={58} width={awL * 2} height={118} rx={awL} fill={toneFill[toneFor('left_arm_kg')]} stroke={toneStroke[toneFor('left_arm_kg')]} strokeWidth={1.4} />
      <rect x={CX + tw + 4} y={58} width={awR * 2} height={118} rx={awR} fill={toneFill[toneFor('right_arm_kg')]} stroke={toneStroke[toneFor('right_arm_kg')]} strokeWidth={1.4} />

      {/* pernas */}
      <rect x={CX - lwL * 2 - 5} y={196} width={lwL * 2} height={160} rx={lwL * 0.8} fill={toneFill[toneFor('left_leg_kg')]} stroke={toneStroke[toneFor('left_leg_kg')]} strokeWidth={1.4} />
      <rect x={CX + 5} y={196} width={lwR * 2} height={160} rx={lwR * 0.8} fill={toneFill[toneFor('right_leg_kg')]} stroke={toneStroke[toneFor('right_leg_kg')]} strokeWidth={1.4} />

      {/* tronco */}
      <path
        d={`M ${CX - tw} 52 Q ${CX} 44 ${CX + tw} 52 L ${CX + tw * 0.92} 186 Q ${CX} 196 ${CX - tw * 0.92} 186 Z`}
        fill={toneFill[toneFor('trunk_kg')]}
        stroke={toneStroke[toneFor('trunk_kg')]}
        strokeWidth={1.5}
      />

      {/* conectores + rótulos */}
      {line(CX - tw - awL * 2 - 2, 76, 46, 66)}
      {chip(44, 60, 'end', 'Braço esq.', values.left_arm_kg, toneFor('left_arm_kg'))}
      {line(CX + tw + awR * 2 + 2, 76, 174, 66)}
      {chip(176, 60, 'start', 'Braço dir.', values.right_arm_kg, toneFor('right_arm_kg'))}
      {line(CX + tw * 0.95, 130, 174, 122)}
      {chip(176, 116, 'start', 'Tronco', values.trunk_kg, toneFor('trunk_kg'))}
      {line(CX - lwL - 3, 270, 46, 262)}
      {chip(44, 256, 'end', 'Perna esq.', values.left_leg_kg, toneFor('left_leg_kg'))}
      {line(CX + lwR + 3, 270, 174, 262)}
      {chip(176, 256, 'start', 'Perna dir.', values.right_leg_kg, toneFor('right_leg_kg'))}
    </svg>
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
              <SegmentalFigure kind="fat" values={e.segmental_fat!} />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Verde: abaixo do esperado · azul: dentro do padrão · amarelo/vermelho: acima,
                comparando a distribuição entre as regiões.
              </p>
            </div>
          )}
          {hasSegmentalMuscle && (
            <div className="rounded-md border border-border bg-card p-4 space-y-2">
              <p className="text-sm font-medium">Equilíbrio muscular</p>
              <SegmentalFigure kind="muscle" values={e.segmental_muscle!} />
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
