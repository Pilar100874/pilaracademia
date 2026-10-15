import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Figura humana compartilhada (bioimpedância + evolução visual)      */
/* Silhueta suave estilo relatório, com gradiente e tons por região.  */
/* ------------------------------------------------------------------ */

export interface ZoneScales {
  neck?: number;
  shoulders?: number;
  chest?: number;
  waist?: number;
  hip?: number;
  armL?: number;
  armR?: number;
  forearmL?: number;
  forearmR?: number;
  thighL?: number;
  thighR?: number;
  calfL?: number;
  calfR?: number;
}

export type RegionTone = 'good' | 'std' | 'warn' | 'bad';

export interface RegionTones {
  leftArm?: RegionTone;
  rightArm?: RegionTone;
  trunk?: RegionTone;
  leftLeg?: RegionTone;
  rightLeg?: RegionTone;
}

export interface BodyDims {
  nk: number;
  sh: number;
  ch: number;
  wa: number;
  hp: number;
  upL: number;
  upR: number;
  foL: number;
  foR: number;
  thL: number;
  thR: number;
  cfL: number;
  cfR: number;
}

const CX = 100;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const S = (v?: number) => (v != null && Number.isFinite(v) && v > 0 ? clamp(v, 0.55, 1.7) : 1);

export function computeDims(scales: ZoneScales): BodyDims {
  return {
    nk: 7 * S(scales.neck),
    sh: 38 * S(scales.shoulders),
    ch: 31 * S(scales.chest),
    wa: 23 * S(scales.waist),
    hp: 30 * S(scales.hip),
    upL: 8 * S(scales.armL),
    upR: 8 * S(scales.armR),
    foL: 6 * S(scales.forearmL ?? scales.armL),
    foR: 6 * S(scales.forearmR ?? scales.armR),
    thL: 14 * S(scales.thighL),
    thR: 14 * S(scales.thighR),
    cfL: 7.5 * S(scales.calfL ?? scales.thighL),
    cfR: 7.5 * S(scales.calfR ?? scales.thighR),
  };
}

/** Ponto de ancoragem de uma região no corpo (coordenadas do corpo, sem offset) */
export function regionAnchor(region: keyof RegionTones, d: BodyDims): { x: number; y: number } {
  switch (region) {
    case 'leftArm':
      return { x: CX - d.sh - d.upL * 0.5, y: 128 };
    case 'rightArm':
      return { x: CX + d.sh + d.upR * 0.5, y: 128 };
    case 'trunk':
      return { x: CX - d.wa - 2, y: 178 };
    case 'leftLeg':
      return { x: CX - d.thL - 6, y: 282 };
    case 'rightLeg':
      return { x: CX + d.thR + 6, y: 282 };
  }
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

type SideDims = { nk: number; sh: number; ch: number; wa: number; hp: number; up: number; fo: number; th: number; cf: number };

/** Contorno de um lado do corpo, do topo da cabeça até a virilha */
function sidePoints(o: SideDims, dir: 1 | -1): { x: number; y: number }[] {
  const X = (dx: number) => CX + dir * dx;
  return [
    { x: X(0), y: 10 },
    { x: X(0), y: 10 }, // canto: topo da cabeça
    { x: X(12), y: 13 },
    { x: X(14), y: 26 },
    { x: X(11.5), y: 38 },
    { x: X(o.nk * 0.9), y: 46 },
    { x: X(o.nk), y: 56 },
    { x: X(o.nk + 6), y: 64 },
    { x: X(o.sh * 0.75), y: 73 },
    { x: X(o.sh), y: 84 }, // ponta do ombro
    { x: X(o.sh + o.up * 0.5), y: 104 },
    { x: X(o.sh + o.up * 0.45), y: 140 },
    { x: X(o.sh * 0.9 + o.up), y: 176 }, // cotovelo externo
    { x: X(o.hp + o.fo + 8), y: 212 },
    { x: X(o.hp + o.fo + 6), y: 238 },
    { x: X(o.hp + o.fo + 4), y: 250 },
    { x: X(o.hp + o.fo + 1), y: 258 },
    { x: X(o.hp + o.fo + 1), y: 258 }, // canto: ponta dos dedos
    { x: X(o.hp + 2), y: 250 },
    { x: X(o.hp + 1), y: 230 },
    { x: X(o.wa + o.fo + 4), y: 198 }, // antebraço interno
    { x: X(o.wa + o.up), y: 166 },
    { x: X(o.ch + o.up * 0.4), y: 134 },
    { x: X(o.ch * 0.9), y: 118 }, // axila
    { x: X(o.ch), y: 126 },
    { x: X(o.ch * 0.96), y: 150 },
    { x: X(o.wa), y: 172 }, // cintura
    { x: X((o.wa + o.hp) / 2 + 1), y: 192 },
    { x: X(o.hp), y: 210 }, // quadril
    { x: X(o.hp * 0.96), y: 236 },
    { x: X(o.th + 3), y: 274 }, // coxa externa
    { x: X((o.th + o.cf) / 2 + 1), y: 306 }, // joelho externo
    { x: X(o.cf + 3), y: 328 },
    { x: X(o.cf + 2), y: 352 }, // panturrilha externa
    { x: X(6.5), y: 380 }, // tornozelo externo
    { x: X(7), y: 394 },
    { x: X(9), y: 401 },
    { x: X(10), y: 404 },
    { x: X(10), y: 404 }, // canto: ponta do pé
    { x: X(1.5), y: 404 },
    { x: X(2.5), y: 392 }, // tornozelo interno
    { x: X(o.cf * 0.55 + 1), y: 350 },
    { x: X(o.cf * 0.5 + 1), y: 312 }, // joelho interno
    { x: X(o.th * 0.45 + 1), y: 272 }, // coxa interna
    { x: X(6), y: 250 },
    { x: X(0), y: 242 },
    { x: X(0), y: 242 }, // canto: virilha
  ];
}

export function bodyPath(dims: BodyDims): string {
  const right: SideDims = { nk: dims.nk, sh: dims.sh, ch: dims.ch, wa: dims.wa, hp: dims.hp, up: dims.upR, fo: dims.foR, th: dims.thR, cf: dims.cfR };
  const left: SideDims = { nk: dims.nk, sh: dims.sh, ch: dims.ch, wa: dims.wa, hp: dims.hp, up: dims.upL, fo: dims.foL, th: dims.thL, cf: dims.cfL };
  const pts = [...sidePoints(right, 1), ...sidePoints(left, -1).reverse().slice(2)];
  return `${smooth(pts)} Z`;
}

/* ------------------------------------------------------------------ */
/* Conversão de medidas de trena -> escalas das zonas                 */
/* ------------------------------------------------------------------ */

const TAPE_REF: Record<string, number> = {
  neck_cm: 38,
  shoulders_cm: 112,
  chest_cm: 100,
  waist_cm: 82,
  abdomen_cm: 88,
  hip_cm: 98,
  arm_left_cm: 32,
  arm_right_cm: 32,
  forearm_left_cm: 27,
  forearm_right_cm: 27,
  thigh_left_cm: 56,
  thigh_right_cm: 56,
  calf_left_cm: 37,
  calf_right_cm: 37,
};

export function tapeToScales(values: Partial<Record<string, number | null>>): ZoneScales {
  const get = (k: string): number | undefined => {
    const v = values[k];
    return v != null && Number.isFinite(v) && v > 0 ? v / TAPE_REF[k] : undefined;
  };
  const pair = (a: string, b: string): number | undefined => {
    const nums = [get(a), get(b)].filter((v): v is number => v != null);
    return nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : undefined;
  };
  return {
    neck: get('neck_cm'),
    shoulders: get('shoulders_cm') ?? get('chest_cm'),
    chest: get('chest_cm'),
    waist: get('waist_cm') ?? get('abdomen_cm'),
    hip: get('hip_cm') ?? get('abdomen_cm'),
    armL: get('arm_left_cm') ?? pair('arm_left_cm', 'arm_right_cm'),
    armR: get('arm_right_cm') ?? pair('arm_left_cm', 'arm_right_cm'),
    forearmL: get('forearm_left_cm') ?? pair('forearm_left_cm', 'forearm_right_cm'),
    forearmR: get('forearm_right_cm') ?? pair('forearm_left_cm', 'forearm_right_cm'),
    thighL: get('thigh_left_cm') ?? pair('thigh_left_cm', 'thigh_right_cm'),
    thighR: get('thigh_right_cm') ?? pair('thigh_left_cm', 'thigh_right_cm'),
    calfL: get('calf_left_cm') ?? pair('calf_left_cm', 'calf_right_cm'),
    calfR: get('calf_right_cm') ?? pair('calf_left_cm', 'calf_right_cm'),
  };
}

/* ------------------------------------------------------------------ */
/* Componente                                                         */
/* ------------------------------------------------------------------ */

const TONE_COLOR: Record<RegionTone, string> = {
  good: 'hsl(150 55% 50% / 0.75)',
  std: 'hsl(205 60% 62% / 0.70)',
  warn: 'hsl(40 90% 55% / 0.75)',
  bad: 'hsl(0 70% 60% / 0.75)',
};

const fmtShort = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ','));

export function HumanSilhouette({
  scales = {},
  tones,
  badges = false,
  chipValues,
  showChips = false,
  offsetX = 0,
  frameWidth = 200,
  className,
  children,
}: {
  scales?: ZoneScales;
  tones?: RegionTones;
  /** Selos E/D nos ombros (perspectiva de quem vê a tela) */
  badges?: boolean;
  chipValues?: Partial<Record<string, number | null>>;
  showChips?: boolean;
  /** Deslocamento horizontal do corpo dentro do viewBox (para rótulos laterais) */
  offsetX?: number;
  frameWidth?: number;
  className?: string;
  children?: ReactNode;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const dims = computeDims(scales);
  const d = bodyPath(dims);

  const pairVal = (a: string, b: string): number | null => {
    const nums = [chipValues?.[a], chipValues?.[b]].filter(
      (v): v is number => v != null && Number.isFinite(v) && v > 0,
    );
    return nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : null;
  };
  const single = (k: string): number | null => {
    const v = chipValues?.[k];
    return v != null && Number.isFinite(v) && v > 0 ? v : null;
  };

  const chips: { x: number; y: number; anchor: 'start' | 'end'; v: number | null }[] = showChips
    ? [
        { x: CX - dims.nk - 10, y: 50, anchor: 'end', v: single('neck_cm') },
        { x: CX - dims.sh - 8, y: 68, anchor: 'end', v: single('shoulders_cm') },
        { x: CX + dims.ch + 8, y: 128, anchor: 'start', v: single('chest_cm') },
        { x: CX + dims.sh + dims.upR + 12, y: 142, anchor: 'start', v: pairVal('arm_left_cm', 'arm_right_cm') },
        { x: CX - dims.hp - dims.foL - 16, y: 214, anchor: 'end', v: pairVal('forearm_left_cm', 'forearm_right_cm') },
        { x: CX - dims.wa - 8, y: 174, anchor: 'end', v: single('waist_cm') },
        { x: CX + dims.wa + 16, y: 192, anchor: 'start', v: single('abdomen_cm') },
        { x: CX - dims.hp - 8, y: 214, anchor: 'end', v: single('hip_cm') },
        { x: CX + dims.thR + 12, y: 278, anchor: 'start', v: pairVal('thigh_left_cm', 'thigh_right_cm') },
        { x: CX - dims.cfL - 12, y: 354, anchor: 'end', v: pairVal('calf_left_cm', 'calf_right_cm') },
      ]
    : [];

  return (
    <svg
      viewBox={`0 0 ${frameWidth} 430`}
      className={cn('w-full max-w-[200px] mx-auto select-none', className)}
      role="img"
      aria-label="Figura corporal"
    >
      <defs>
        <radialGradient id={`hg${uid}`} cx="50%" cy="26%" r="85%">
          <stop offset="0%" stopColor="#F2D06B" />
          <stop offset="45%" stopColor="#C9D47E" />
          <stop offset="100%" stopColor="#6FBFB2" />
        </radialGradient>
        <filter id={`hb${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
        <filter id={`ht${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <clipPath id={`hc${uid}`}>
          <path d={d} />
        </clipPath>
      </defs>

      <g transform={offsetX ? `translate(${offsetX} 0)` : undefined}>
        {/* corpo com gradiente suave */}
        <path d={d} fill={`url(#hg${uid})`} filter={`url(#hb${uid})`} />

        {/* tons por região (gordura/músculo) */}
        {tones && (
          <g clipPath={`url(#hc${uid})`} filter={`url(#ht${uid})`}>
            {tones.trunk && (
              <rect x={CX - dims.sh} y={58} width={dims.sh * 2} height={160} fill={TONE_COLOR[tones.trunk]} />
            )}
            {tones.leftArm && (
              <rect x={CX - 78} y={75} width={78 - dims.ch * 0.55} height={188} fill={TONE_COLOR[tones.leftArm]} />
            )}
            {tones.rightArm && (
              <rect x={CX + dims.ch * 0.55} y={75} width={78 - dims.ch * 0.55} height={188} fill={TONE_COLOR[tones.rightArm]} />
            )}
            {tones.leftLeg && (
              <rect x={CX - 62} y={205} width={64} height={225} fill={TONE_COLOR[tones.leftLeg]} />
            )}
            {tones.rightLeg && (
              <rect x={CX - 2} y={205} width={64} height={225} fill={TONE_COLOR[tones.rightLeg]} />
            )}
          </g>
        )}

        {/* selos E/D */}
        {badges && (
          <>
            {[
              { x: CX - dims.sh + 2, label: 'E' },
              { x: CX + dims.sh - 2, label: 'D' },
            ].map((b) => (
              <g key={b.label}>
                <circle cx={b.x} cy={68} r={7.5} fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={1} />
                <text x={b.x} y={71} textAnchor="middle" fontSize={8} fontWeight={600} style={{ fill: 'hsl(var(--muted-foreground))' }}>
                  {b.label}
                </text>
              </g>
            ))}
          </>
        )}

        {/* valores das medidas */}
        {chips
          .filter((c) => c.v != null)
          .map((c, i) => (
            <text
              key={i}
              x={c.x}
              y={c.y}
              textAnchor={c.anchor}
              fontSize={8.5}
              fontWeight={600}
              style={{ fill: 'hsl(var(--muted-foreground))' }}
            >
              {fmtShort(c.v!)}
            </text>
          ))}
      </g>

      {children}
    </svg>
  );
}
