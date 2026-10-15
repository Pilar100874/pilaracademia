import { useEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HumanSilhouette, tapeToScales, computeDims, regionAnchor, type BodySex, type ZoneScales } from '@/components/HumanBodyFigure';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Parametric body figure                                              */
/* ------------------------------------------------------------------ */

const CX = 100;

/** ref = medida típica (cm); hw = meia-largura no desenho para essa medida */
const SHAPE: Record<string, { ref: number; hw: number }> = {
  neck_cm: { ref: 38, hw: 8 },
  shoulders_cm: { ref: 112, hw: 37 },
  chest_cm: { ref: 100, hw: 32 },
  arm_left_cm: { ref: 32, hw: 7 },
  arm_right_cm: { ref: 32, hw: 7 },
  forearm_left_cm: { ref: 27, hw: 5.5 },
  forearm_right_cm: { ref: 27, hw: 5.5 },
  waist_cm: { ref: 82, hw: 25 },
  abdomen_cm: { ref: 88, hw: 27 },
  hip_cm: { ref: 98, hw: 32 },
  thigh_left_cm: { ref: 56, hw: 13.5 },
  thigh_right_cm: { ref: 56, hw: 13.5 },
  calf_left_cm: { ref: 37, hw: 8 },
  calf_right_cm: { ref: 37, hw: 8 },
};

/** Numeração exibida nos marcadores (mesma ordem dos campos do formulário) */
export const MARKER_ORDER: Record<string, number> = {
  neck_cm: 1,
  shoulders_cm: 2,
  chest_cm: 3,
  arm_left_cm: 4,
  arm_right_cm: 5,
  forearm_left_cm: 6,
  forearm_right_cm: 7,
  waist_cm: 8,
  abdomen_cm: 9,
  hip_cm: 10,
  thigh_left_cm: 11,
  thigh_right_cm: 12,
  calf_left_cm: 13,
  calf_right_cm: 14,
};

type Values = Partial<Record<string, number | null>>;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Ajusta a medida de referência por sexo: ombros mais largos no homem, quadril
 *  mais largo na mulher — assim o desenho lê o formato certo. */
const SEX_REF: Record<'male' | 'female', Record<string, number>> = {
  male: { shoulders_cm: 0.94, chest_cm: 0.95, waist_cm: 1.0, abdomen_cm: 1.0, hip_cm: 1.08, thigh_left_cm: 1.05, thigh_right_cm: 1.05 },
  female: { shoulders_cm: 1.12, chest_cm: 1.05, waist_cm: 1.05, abdomen_cm: 1.05, hip_cm: 0.9, thigh_left_cm: 0.95, thigh_right_cm: 0.95 },
};

function scaledHw(key: string, values: Values, fallback?: number, sex?: BodySex): number {
  const spec = SHAPE[key];
  const raw = values[key];
  const v = raw != null && Number.isFinite(raw) && raw > 0 ? raw : fallback;
  const f = sex === 'male' || sex === 'female' ? SEX_REF[sex][key] ?? 1 : 1;
  const scale = v != null ? clamp(v / (spec.ref * f), 0.55, 1.6) : 1;
  return spec.hw * scale;
}

/** Catmull-Rom -> bezier cúbica para um contorno suave */
function smooth(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/** Contorno fechado a partir de pontos centrais com meia-largura */
function outline(pts: { y: number; cx: number; hw: number }[]): string {
  const right = pts.map((p) => ({ x: p.cx + p.hw, y: p.y }));
  const left = pts.map((p) => ({ x: p.cx - p.hw, y: p.y })).reverse();
  return `${smooth([...right, ...left])} Z`;
}

const fmtShort = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ','));

export function BodyFigure({
  values,
  activeKey,
  onMarkerClick,
  showValues = true,
  showMarkers = true,
  className,
  sex,
}: {
  values: Values;
  activeKey?: string | null;
  onMarkerClick?: (key: string) => void;
  showValues?: boolean;
  showMarkers?: boolean;
  className?: string;
  sex?: BodySex;
}) {
  // Meia-larguras escaladas (lados esq/dir usam a média quando ambos existem)
  const pairAvg = (a: string, b: string): number | undefined => {
    const va = values[a];
    const vb = values[b];
    const nums = [va, vb].filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
    if (nums.length === 0) return undefined;
    return nums.reduce((s, v) => s + v, 0) / nums.length;
  };

  const nkHW = scaledHw('neck_cm', values, undefined, sex);
  const shHW = scaledHw('shoulders_cm', values, undefined, sex);
  const chHW = scaledHw('chest_cm', values, undefined, sex);
  const waHW = scaledHw('waist_cm', values, undefined, sex);
  const abHW = scaledHw('abdomen_cm', values, values.waist_cm ?? undefined, sex);
  const hpHW = scaledHw('hip_cm', values, undefined, sex);
  const armHW = clamp(SHAPE.arm_left_cm.hw * ((pairAvg('arm_left_cm', 'arm_right_cm') ?? SHAPE.arm_left_cm.ref) / SHAPE.arm_left_cm.ref), 4, 12);
  const foHW = clamp(SHAPE.forearm_left_cm.hw * ((pairAvg('forearm_left_cm', 'forearm_right_cm') ?? SHAPE.forearm_left_cm.ref) / SHAPE.forearm_left_cm.ref), 3.5, 9);
  const thHW = scaledHw('thigh_left_cm', values, pairAvg('thigh_left_cm', 'thigh_right_cm'), sex);
  const cfHW = scaledHw('calf_left_cm', values, pairAvg('calf_left_cm', 'calf_right_cm'), sex);

  const torso = outline([
    { y: 58, cx: CX, hw: shHW },
    { y: 96, cx: CX, hw: chHW },
    { y: 136, cx: CX, hw: waHW },
    { y: 158, cx: CX, hw: abHW },
    { y: 190, cx: CX, hw: hpHW },
  ]);

  const leg = (side: 1 | -1) =>
    outline([
      { y: 188, cx: CX + side * hpHW * 0.45, hw: thHW },
      { y: 236, cx: CX + side * (thHW * 0.55 + 4), hw: thHW },
      { y: 286, cx: CX + side * (cfHW * 0.7 + 4), hw: (thHW + cfHW) * 0.42 },
      { y: 326, cx: CX + side * (cfHW * 0.55 + 4), hw: cfHW },
      { y: 366, cx: CX + side * 7, hw: 4.5 },
    ]);

  const arm = (side: 1 | -1) =>
    outline([
      { y: 64, cx: CX + side * (shHW + armHW * 0.4), hw: armHW },
      { y: 122, cx: CX + side * (shHW + armHW * 0.8), hw: (armHW + foHW) / 2 },
      { y: 184, cx: CX + side * (hpHW + foHW + 2), hw: foHW * 0.85 },
    ]);

  const ink = 'hsl(var(--primary))';
  const fill = 'hsl(var(--primary) / 0.10)';

  const markers: { key: string; x: number; y: number }[] = [
    { key: 'neck_cm', x: CX, y: 50 },
    { key: 'shoulders_cm', x: CX, y: 63 },
    { key: 'chest_cm', x: CX, y: 96 },
    { key: 'arm_right_cm', x: CX - (shHW + armHW + 7), y: 86 },
    { key: 'arm_left_cm', x: CX + (shHW + armHW + 7), y: 86 },
    { key: 'forearm_right_cm', x: CX - (hpHW + foHW + 9), y: 152 },
    { key: 'forearm_left_cm', x: CX + (hpHW + foHW + 9), y: 152 },
    { key: 'waist_cm', x: CX, y: 136 },
    { key: 'abdomen_cm', x: CX, y: 158 },
    { key: 'hip_cm', x: CX, y: 190 },
    { key: 'thigh_right_cm', x: CX - (thHW * 0.55 + 4), y: 236 },
    { key: 'thigh_left_cm', x: CX + (thHW * 0.55 + 4), y: 236 },
    { key: 'calf_right_cm', x: CX - (cfHW * 0.55 + 4), y: 326 },
    { key: 'calf_left_cm', x: CX + (cfHW * 0.55 + 4), y: 326 },
  ];

  const interactive = !!onMarkerClick;

  return (
    <svg
      viewBox="0 0 200 400"
      className={cn('w-full max-w-[190px] mx-auto select-none', className)}
      role="img"
      aria-label="Figura corporal com os pontos de medida"
    >
      {/* braços (atrás do tronco) */}
      <path d={arm(-1)} fill={fill} stroke={ink} strokeWidth={1.4} strokeLinejoin="round" />
      <path d={arm(1)} fill={fill} stroke={ink} strokeWidth={1.4} strokeLinejoin="round" />
      <circle cx={CX - (hpHW + foHW + 2)} cy={188} r={foHW} fill={fill} stroke={ink} strokeWidth={1.2} />
      <circle cx={CX + (hpHW + foHW + 2)} cy={188} r={foHW} fill={fill} stroke={ink} strokeWidth={1.2} />

      {/* pernas */}
      <path d={leg(-1)} fill={fill} stroke={ink} strokeWidth={1.4} strokeLinejoin="round" />
      <path d={leg(1)} fill={fill} stroke={ink} strokeWidth={1.4} strokeLinejoin="round" />
      <ellipse cx={CX - 7} cy={368} rx={8} ry={3.6} fill={fill} stroke={ink} strokeWidth={1.1} />
      <ellipse cx={CX + 7} cy={368} rx={8} ry={3.6} fill={fill} stroke={ink} strokeWidth={1.1} />

      {/* tronco */}
      <path d={torso} fill={fill} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />

      {/* pescoço + cabeça */}
      <path
        d={`M ${CX - nkHW} 40 L ${CX - nkHW * 0.9} 58 L ${CX + nkHW * 0.9} 58 L ${CX + nkHW} 40 Z`}
        fill={fill}
        stroke={ink}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <circle cx={CX} cy={26} r={15} fill={fill} stroke={ink} strokeWidth={1.4} />

      {/* marcadores numerados */}
      {showMarkers && markers.map((m) => {
        const n = MARKER_ORDER[m.key];
        const v = values[m.key];
        const filled = v != null && Number.isFinite(v) && v > 0;
        const active = activeKey === m.key;
        return (
          <g
            key={m.key}
            onClick={interactive ? () => onMarkerClick(m.key) : undefined}
            className={interactive ? 'cursor-pointer' : undefined}
          >
            {interactive && <circle cx={m.x} cy={m.y} r={13} fill="transparent" />}
            <circle
              cx={m.x}
              cy={m.y}
              r={8}
              style={{
                fill: filled ? 'hsl(var(--primary))' : 'hsl(var(--background))',
                stroke: 'hsl(var(--primary))',
                strokeWidth: active ? 2.4 : 1.1,
              }}
            />
            <text
              x={m.x}
              y={m.y + 2.5}
              textAnchor="middle"
              fontSize={7.5}
              fontWeight={700}
              style={{ fill: filled ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))' }}
            >
              {n}
            </text>
            {showValues && filled && (
              <text
                x={m.x}
                y={m.y + 14}
                textAnchor="middle"
                fontSize={7}
                fontWeight={600}
                style={{ fill: 'hsl(var(--muted-foreground))' }}
              >
                {fmtShort(v)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Morph comparativo com barra de arrastar                             */
/* ------------------------------------------------------------------ */

/** Rótulo com seta do morph: valor interpolado entre A e B, já formatado. */
export interface MorphCallout {
  side: 'left' | 'right';
  region: 'leftArm' | 'rightArm' | 'trunk' | 'leftLeg' | 'rightLeg';
  label: string;
  a: number | null;
  b: number | null;
  unit: string;
  y: number;
}

export function BodyMorph({
  valuesA,
  valuesB,
  labelA,
  labelB,
  showValues = true,
  showMarkers = true,
  sex,
  callouts,
}: {
  valuesA: Values;
  valuesB: Values;
  labelA: string;
  labelB: string;
  showValues?: boolean;
  showMarkers?: boolean;
  sex?: BodySex;
  /** Quando informado, substitui os rótulos em cm (ex.: kg de gordura/músculo por região) */
  callouts?: MorphCallout[];
}) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    const duration = 1800;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      // ease in-out
      setT(p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  const values = useMemo(() => {
    const out: Values = {};
    for (const key of Object.keys(SHAPE)) {
      const a = valuesA[key];
      const b = valuesB[key];
      const va = a != null && Number.isFinite(a) && a > 0 ? a : null;
      const vb = b != null && Number.isFinite(b) && b > 0 ? b : null;
      if (va == null && vb == null) {
        out[key] = null;
      } else {
        const from = va ?? vb!;
        const to = vb ?? va!;
        out[key] = Math.round((from + (to - from) * t) * 10) / 10;
      }
    }
    return out;
  }, [valuesA, valuesB, t]);

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Evolução visual do corpo</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setT(0);
            setPlaying(true);
          }}
          disabled={playing}
        >
          <Play className="h-3.5 w-3.5 mr-1.5" />
          Animar
        </Button>
      </div>

      <MorphFigure
        values={values}
        valuesA={valuesA}
        valuesB={valuesB}
        sex={sex}
        showValues={showValues}
        callouts={callouts}
        t={t}
      />

      <div className="space-y-1.5">
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(t * 100)}
          onChange={(e) => {
            setPlaying(false);
            setT(Number(e.target.value) / 100);
          }}
          className="w-full accent-primary cursor-pointer"
          aria-label="Arrastar entre a medição A e a medição B"
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate max-w-[45%]">A · {labelA}</span>
          <span className="truncate max-w-[45%] text-right">B · {labelB}</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Arraste para ver o corpo mudar de A para B. O desenho é uma ilustração proporcional às
        medidas — medidas não preenchidas mantêm a proporção da outra medição.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Figura do morph: amplifica a diferença A->B e mostra os valores    */
/* com setas, como no relatório de gordura por região                 */
/* ------------------------------------------------------------------ */

/** Amplifica a diferença A->B em torno do ponto médio das duas medições,
 *  para a animação mostrar a mudança mesmo quando ela é pequena em cm. */
function amplifyScales(now: ZoneScales, a: ZoneScales, b: ZoneScales): ZoneScales {
  // Fator adaptativo: a maior diferença A<->B vira uma mudança clara no desenho,
  // mesmo quando a diferença real é de poucos centímetros.
  let maxDev = 0;
  for (const k of Object.keys(a) as (keyof ZoneScales)[]) {
    const va = a[k];
    const vb = b[k];
    if (va != null && vb != null) maxDev = Math.max(maxDev, Math.abs(va - vb) / 2);
  }
  const k = maxDev > 0.001 ? Math.min(20, 0.22 / maxDev) : 2;
  const out: ZoneScales = {};
  const keys = new Set([...Object.keys(now), ...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const kk = key as keyof ZoneScales;
    const vn = now[kk];
    const va = a[kk];
    const vb = b[kk];
    if (vn == null) continue;
    if (va != null && vb != null) {
      const mid = (va + vb) / 2;
      out[kk] = mid + (vn - mid) * k;
    } else {
      out[kk] = 1 + (vn - 1) * 2;
    }
  }
  return out;
}

function MorphFigure({
  values,
  valuesA,
  valuesB,
  sex,
  showValues,
  callouts: customCallouts,
  t,
}: {
  values: Values;
  valuesA: Values;
  valuesB: Values;
  sex?: BodySex;
  showValues: boolean;
  callouts?: MorphCallout[];
  t: number;
}) {
  const pairAvg = (a: string, b: string): number | null => {
    const nums = [values[a], values[b]].filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
    return nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : null;
  };
  const single = (k: string): number | null => {
    const v = values[k];
    return v != null && Number.isFinite(v) && v > 0 ? v : null;
  };

  const scales = amplifyScales(tapeToScales(values), tapeToScales(valuesA), tapeToScales(valuesB));
  const dims = computeDims(scales, sex);
  const OFF = 34;

  type CalloutSpec = { side: 'left' | 'right'; region: 'leftArm' | 'rightArm' | 'trunk' | 'leftLeg' | 'rightLeg'; label: string; v: number | null; unit: string; y: number };
  const callouts: CalloutSpec[] = customCallouts
    ? customCallouts.map((c) => {
        const va = c.a != null && Number.isFinite(c.a) ? c.a : null;
        const vb = c.b != null && Number.isFinite(c.b) ? c.b : null;
        const v = va == null && vb == null ? null : (va ?? vb!) + ((vb ?? va!) - (va ?? vb!)) * t;
        return { side: c.side, region: c.region, label: c.label, v, unit: c.unit, y: c.y };
      })
    : [
        { side: 'left', region: 'leftArm', label: 'Braço', v: pairAvg('arm_left_cm', 'arm_right_cm'), unit: 'cm', y: 104 },
        { side: 'left', region: 'trunk', label: 'Cintura', v: single('waist_cm') ?? single('abdomen_cm'), unit: 'cm', y: 200 },
        { side: 'left', region: 'leftLeg', label: 'Coxa', v: pairAvg('thigh_left_cm', 'thigh_right_cm'), unit: 'cm', y: 304 },
        { side: 'right', region: 'rightArm', label: 'Peito', v: single('chest_cm'), unit: 'cm', y: 104 },
        { side: 'right', region: 'rightLeg', label: 'Quadril', v: single('hip_cm'), unit: 'cm', y: 236 },
        { side: 'right', region: 'rightLeg', label: 'Panturrilha', v: pairAvg('calf_left_cm', 'calf_right_cm'), unit: 'cm', y: 336 },
      ];

  return (
    <HumanSilhouette sex={sex} scales={scales} freeform offsetX={OFF} frameWidth={268} className="max-w-[240px]">
      {showValues &&
        callouts
          .filter((c) => c.v != null)
          .map((c) => {
            const dot = regionAnchor(c.region, dims);
            const dx = OFF + dot.x;
            const dy = dot.y;
            const sx = c.side === 'left' ? 52 : 216;
            const tx = c.side === 'left' ? 2 : 266;
            const anchor = c.side === 'left' ? 'start' : 'end';
            const connector =
              c.side === 'left'
                ? `M ${sx} ${c.y - 4} C ${sx + 18} ${c.y - 14}, ${dx - 16} ${dy}, ${dx} ${dy}`
                : `M ${sx} ${c.y - 4} C ${sx - 18} ${c.y - 14}, ${dx + 16} ${dy}, ${dx} ${dy}`;
            return (
              <g key={`${c.side}-${c.label}`}>
                <path d={connector} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={0.9} opacity={0.7} />
                <circle cx={dx} cy={dy} r={2.6} fill="hsl(var(--foreground))" />
                <text x={tx} y={c.y} textAnchor={anchor} fontSize={13} fontWeight={700} style={{ fill: 'hsl(var(--foreground))' }}>
                  {fmtShort(c.v!)}cm
                </text>
                <text x={tx} y={c.y + 13} textAnchor={anchor} fontSize={9.5} style={{ fill: 'hsl(var(--muted-foreground))' }}>
                  {c.label}
                </text>
              </g>
            );
          })}
    </HumanSilhouette>
  );
}
