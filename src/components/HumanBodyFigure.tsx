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
// Amplitude restrita e suavizada: o desenho deve continuar um corpo-padrão
// natural, mesmo com medidas extremas (a diferença é transmitida com sutileza).
const S = (v?: number) => {
  const s = v != null && Number.isFinite(v) && v > 0 ? clamp(v, 0.82, 1.22) : 1;
  return 1 + (s - 1) * 0.6;
};

/** Sexo usado apenas para as proporções do desenho — não altera nenhum cálculo. */
export type BodySex = 'male' | 'female' | 'unknown' | null | undefined;

type SexKey = 'male' | 'female' | 'neutral';

interface SexBase {
  nk: number;
  sh: number;
  ch: number;
  wa: number;
  hp: number;
  up: number;
  fo: number;
  th: number;
  cf: number;
}

/** Meia-larguras de um corpo-padrão (cânone de 8 cabeças, altura ~400).
 *  Masculino: ombros bem mais largos que o quadril, cintura menos marcada.
 *  Feminino: quadril quase tão largo quanto os ombros, cintura mais fina. */
const SEX_BASE: Record<SexKey, SexBase> = {
  male: { nk: 9.5, sh: 46, ch: 31, wa: 27, hp: 29.5, up: 16.5, fo: 13.5, th: 28, cf: 16.5 },
  female: { nk: 8, sh: 36.5, ch: 28, wa: 23.5, hp: 34, up: 14.5, fo: 12, th: 27, cf: 15.5 },
  neutral: { nk: 9, sh: 44, ch: 30, wa: 25, hp: 31, up: 16, fo: 13, th: 27.5, cf: 16 },
};

const sexKey = (sex: BodySex): SexKey => (sex === 'male' || sex === 'female' ? sex : 'neutral');

export function computeDims(scales: ZoneScales, sex?: BodySex, opts?: { freeform?: boolean }): BodyDims {
  const key = sexKey(sex);
  const b = SEX_BASE[key];
  if (opts?.freeform) {
    // Modo evolução/morph: sem amortecimento nem vínculos anatômicos, para a
    // diferença entre duas medições aparecer de forma clara no desenho.
    const F = (v?: number) => (v != null && Number.isFinite(v) && v > 0 ? clamp(v, 0.6, 1.6) : 1);
    return {
      nk: b.nk * F(scales.neck),
      sh: b.sh * F(scales.shoulders ?? scales.chest),
      ch: b.ch * F(scales.chest),
      wa: b.wa * F(scales.waist),
      hp: b.hp * F(scales.hip),
      upL: b.up * F(scales.armL),
      upR: b.up * F(scales.armR),
      foL: b.fo * F(scales.forearmL ?? scales.armL),
      foR: b.fo * F(scales.forearmR ?? scales.armR),
      thL: b.th * F(scales.thighL),
      thR: b.th * F(scales.thighR),
      cfL: b.cf * F(scales.calfL ?? scales.thighL),
      cfR: b.cf * F(scales.calfR ?? scales.thighR),
    };
  }
  const ch = b.ch * S(scales.chest);
  let sh = b.sh * S(scales.shoulders);
  let wa = b.wa * S(scales.waist);
  let hp = b.hp * S(scales.hip);
  // Vínculos anatômicos: ombros mais largos que o peito, cintura mais fina que
  // peito e quadril, quadril nunca mais largo que os ombros.
  if (key === 'female') {
    sh = clamp(sh, ch * 1.12, ch * 1.38);
    wa = clamp(wa, ch * 0.68, ch * 0.95);
    hp = clamp(hp, wa * 1.14, Math.min(ch * 1.28, sh * 1.06));
  } else if (key === 'male') {
    sh = clamp(sh, ch * 1.4, ch * 1.68);
    wa = clamp(wa, ch * 0.8, ch * 1.05);
    hp = clamp(hp, wa * 0.98, Math.min(ch * 1.04, sh * 0.82));
  } else {
    sh = clamp(sh, ch * 1.35, ch * 1.6);
    wa = clamp(wa, ch * 0.75, ch * 1.0);
    hp = clamp(hp, wa * 1.06, Math.min(ch * 1.12, sh * 0.8));
  }
  return {
    nk: b.nk * S(scales.neck),
    sh,
    ch,
    wa,
    hp,
    upL: b.up * S(scales.armL),
    upR: b.up * S(scales.armR),
    foL: b.fo * S(scales.forearmL ?? scales.armL),
    foR: b.fo * S(scales.forearmR ?? scales.armR),
    thL: b.th * S(scales.thighL),
    thR: b.th * S(scales.thighR),
    cfL: b.cf * S(scales.calfL ?? scales.thighL),
    cfR: b.cf * S(scales.calfR ?? scales.thighR),
  };
}

/** Ponto de ancoragem de uma região no corpo (coordenadas do corpo, sem offset) */
export function regionAnchor(region: keyof RegionTones, d: BodyDims): { x: number; y: number } {
  switch (region) {
    case 'leftArm': {
      const g = armGeom({ sh: d.sh, ch: d.ch, up: d.upL, fo: d.foL, hp: d.hp, th: d.thL });
      return { x: CX - g.outSh + 0.5, y: 135 };
    }
    case 'rightArm': {
      const g = armGeom({ sh: d.sh, ch: d.ch, up: d.upR, fo: d.foR, hp: d.hp, th: d.thR });
      return { x: CX + g.outSh - 0.5, y: 135 };
    }
    case 'trunk':
      return { x: CX - d.wa, y: 178 };
    case 'leftLeg': {
      const g = armGeom({ sh: d.sh, ch: d.ch, up: d.upL, fo: d.foL, hp: d.hp, th: d.thL });
      return { x: CX - g.thOut + 1.5, y: 278 };
    }
    case 'rightLeg': {
      const g = armGeom({ sh: d.sh, ch: d.ch, up: d.upR, fo: d.foR, hp: d.hp, th: d.thR });
      return { x: CX + g.thOut - 1.5, y: 278 };
    }
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

/** Geometria do braço. Ele pende do ombro e fica encostado no corpo: a linha
 *  interna é uma reta suave da axila ao pulso — o quadril largo não empurra o
 *  braço para fora, o braço simplesmente passa por cima dele. */
interface ArmGeom {
  ax: number;
  outSh: number;
  elIn: number;
  elOut: number;
  foIn: number;
  foOut: number;
  wrIn: number;
  wrOut: number;
  thOut: number;
}

function armGeom(o: { sh: number; ch: number; up: number; fo: number; hp: number; th: number }): ArmGeom {
  const ax = o.ch - 2;
  const outSh = Math.max(o.sh + 1.5, ax + o.up * 1.05);
  const thOut = Math.min(o.hp - 0.5, 3 + o.th);
  const wrIn = Math.max(ax + 2, thOut - 1);
  const wrOut = wrIn + o.fo * 0.72;
  const elIn = ax + (wrIn - ax) * 0.42;
  const elOut = elIn + o.up * 0.85;
  const foIn = ax + (wrIn - ax) * 0.72;
  const foOut = foIn + o.fo * 0.95;
  return { ax, outSh, elIn, elOut, foIn, foOut, wrIn, wrOut, thOut };
}

/** Meio contorno do tronco (um lado), sem os braços. Cânone de 8 cabeças:
 *  altura ~400, cabeça 48, virilha na metade da altura. */
function sidePoints(o: SideDims, dir: 1 | -1): { x: number; y: number }[] {
  const X = (dx: number) => CX + dir * dx;
  const { thOut } = armGeom(o);
  const kx = 14; // centro do joelho
  const tf = o.th / 27;
  const cf = o.cf;
  return [
    { x: X(0), y: 10 },
    { x: X(0), y: 10 }, // topo da cabeça
    { x: X(9), y: 12 },
    { x: X(14), y: 20 },
    { x: X(15.5), y: 32 },
    { x: X(14), y: 44 },
    { x: X(10), y: 54 }, // mandíbula
    { x: X(o.nk), y: 61 }, // pescoço
    { x: X(o.nk), y: 69 },
    { x: X(o.nk + 9), y: 76 }, // trapézio
    { x: X(o.sh * 0.82), y: 80 },
    { x: X(o.sh * 0.95), y: 85 },
    { x: X(o.sh), y: 90 }, // ponta do ombro
    { x: X(o.sh * 0.98), y: 97 },
    { x: X(o.sh * 0.96), y: 104 }, // ombro -> peito (fica sob o braço)
    { x: X(o.ch), y: 128 },
    { x: X(o.ch * 0.98), y: 146 },
    { x: X(o.wa + (o.ch - o.wa) * 0.4), y: 160 },
    { x: X(o.wa), y: 178 }, // cintura
    { x: X(o.wa + (o.hp - o.wa) * 0.7), y: 202 },
    { x: X(o.hp), y: 222 }, // quadril
    { x: X(thOut + (o.hp - thOut) * 0.5), y: 242 },
    { x: X(thOut), y: 262 }, // coxa externa
    { x: X(kx + (thOut - kx) * 0.6), y: 290 },
    { x: X(kx + cf * 0.5), y: 314 }, // joelho externo
    { x: X(kx + cf * 0.62), y: 342 }, // panturrilha externa
    { x: X(12 + cf * 0.36), y: 372 },
    { x: X(12 + 5), y: 388 }, // tornozelo externo
    { x: X(19), y: 398 },
    { x: X(23), y: 404 },
    { x: X(22.5), y: 408 }, // ponta do pé
    { x: X(6.5), y: 409 },
    { x: X(6.5), y: 409 },
    { x: X(7.5), y: 398 },
    { x: X(8), y: 388 }, // tornozelo interno
    { x: X(kx - cf * 0.5), y: 346 }, // panturrilha interna
    { x: X(kx - cf * 0.48), y: 314 }, // joelho interno
    { x: X(Math.max(2, 3.5 * (2 - tf))), y: 268 }, // coxa interna
    { x: X(1.5), y: 246 },
    { x: X(0), y: 238 },
    { x: X(0), y: 238 }, // virilha
  ];
}

/** Contorno fechado de um braço (peça própria, desenhada por cima do tronco). */
function armPoints(o: SideDims, dir: 1 | -1): { x: number; y: number }[] {
  const X = (dx: number) => CX + dir * dx;
  const { ax, outSh, elIn, elOut, foIn, foOut, wrIn, wrOut } = armGeom(o);
  return [
    { x: X(o.sh * 0.92), y: 84 }, // topo do ombro (sob o trapézio)
    { x: X(outSh), y: 94 }, // deltóide
    { x: X(outSh - 0.5), y: 128 }, // braço externo
    { x: X(elOut), y: 164 }, // cotovelo externo
    { x: X(foOut), y: 196 }, // antebraço externo
    { x: X(wrOut), y: 228 }, // pulso externo
    { x: X(wrOut + 1.2), y: 240 }, // mão externa
    { x: X(wrOut - 1), y: 251 }, // ponta dos dedos
    { x: X(wrIn + 1.5), y: 249 }, // dedos internos
    { x: X(wrIn), y: 238 }, // mão interna
    { x: X(wrIn), y: 228 }, // pulso interno
    { x: X(foIn), y: 196 }, // antebraço interno
    { x: X(elIn), y: 164 }, // cotovelo interno
    { x: X(ax), y: 122 }, // braço interno
    { x: X(ax + 0.5), y: 110 },
    { x: X(ax - 1.5), y: 102 }, // dobra da axila
    { x: X(ax - 4), y: 96 }, // axila
  ];
}

export interface BodyPaths {
  torso: string;
  armL: string;
  armR: string;
  /** contorno do braço sem o topo (a borda que encosta no ombro não é desenhada) */
  armLLine: string;
  armRLine: string;
}

/** Tronco + braços como peças próprias (o braço passa por cima do quadril). */
export function bodyPaths(dims: BodyDims): BodyPaths {
  const right: SideDims = { nk: dims.nk, sh: dims.sh, ch: dims.ch, wa: dims.wa, hp: dims.hp, up: dims.upR, fo: dims.foR, th: dims.thR, cf: dims.cfR };
  const left: SideDims = { nk: dims.nk, sh: dims.sh, ch: dims.ch, wa: dims.wa, hp: dims.hp, up: dims.upL, fo: dims.foL, th: dims.thL, cf: dims.cfL };
  const pts = [...sidePoints(right, 1), ...sidePoints(left, -1).reverse().slice(2)];
  const armLpts = armPoints(left, -1);
  const armRpts = armPoints(right, 1);
  return {
    torso: `${smooth(pts)} Z`,
    armL: `${smooth(armLpts)} Z`,
    armR: `${smooth(armRpts)} Z`,
    armLLine: smooth(armLpts.slice(1)),
    armRLine: smooth(armRpts.slice(1)),
  };
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
  good: 'hsl(150 55% 48% / 0.9)',
  std: 'hsl(205 60% 60% / 0.85)',
  warn: 'hsl(40 90% 52% / 0.9)',
  bad: 'hsl(0 70% 58% / 0.9)',
};

const fmtShort = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ','));

/** Paletas estilo relatório: bege para gordura, verde-azulado para músculo */
const PALETTES: Record<'neutral' | 'fat' | 'muscle', [string, string, string, string]> = {
  neutral: ['#D9B36A', '#A9BE6E', '#3E9C8C', 'hsl(165 35% 28% / 0.55)'],
  fat: ['#EFD3A8', '#DDAF77', '#B9834F', 'hsl(28 40% 32% / 0.5)'],
  muscle: ['#E8C65C', '#9CC26A', '#2E9484', 'hsl(165 40% 26% / 0.55)'],
};

export function HumanSilhouette({
  scales = {},
  sex,
  tones,
  badges = false,
  chipValues,
  showChips = false,
  offsetX = 0,
  frameWidth = 200,
  palette = 'neutral',
  freeform = false,
  className,
  children,
}: {
  scales?: ZoneScales;
  sex?: BodySex;
  tones?: RegionTones;
  /** Cor base da figura: neutra, gordura (bege) ou músculo (verde-azulado) */
  palette?: 'neutral' | 'fat' | 'muscle';
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
  const dims = computeDims(scales, sex);
  const paths = bodyPaths(dims);
  const [g0, g1, g2, outlineColor] = PALETTES[palette];

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

  const gR = armGeom({ sh: dims.sh, ch: dims.ch, up: dims.upR, fo: dims.foR, hp: dims.hp, th: dims.thR });
  const gL = armGeom({ sh: dims.sh, ch: dims.ch, up: dims.upL, fo: dims.foL, hp: dims.hp, th: dims.thL });

  const chips: { x: number; y: number; anchor: 'start' | 'end'; v: number | null }[] = showChips
    ? [
        { x: CX - dims.nk - 10, y: 66, anchor: 'end', v: single('neck_cm') },
        { x: CX - dims.sh - 8, y: 86, anchor: 'end', v: single('shoulders_cm') },
        { x: CX + gR.outSh + 8, y: 112, anchor: 'start', v: single('chest_cm') },
        { x: CX + gR.outSh + 8, y: 140, anchor: 'start', v: pairVal('arm_left_cm', 'arm_right_cm') },
        { x: CX - gL.foOut - 8, y: 200, anchor: 'end', v: pairVal('forearm_left_cm', 'forearm_right_cm') },
        { x: CX - gL.elOut - 7, y: 160, anchor: 'end', v: single('waist_cm') },
        { x: CX + gR.foOut + 8, y: 192, anchor: 'start', v: single('abdomen_cm') },
        { x: CX - dims.hp - 8, y: 226, anchor: 'end', v: single('hip_cm') },
        { x: CX + gR.thOut + 10, y: 280, anchor: 'start', v: pairVal('thigh_left_cm', 'thigh_right_cm') },
        { x: CX - 14 - dims.cfL * 0.62 - 6, y: 346, anchor: 'end', v: pairVal('calf_left_cm', 'calf_right_cm') },
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
          <stop offset="0%" stopColor={g0} />
          <stop offset="45%" stopColor={g1} />
          <stop offset="100%" stopColor={g2} />
        </radialGradient>
        <filter id={`hb${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1" />
        </filter>
        <filter id={`ht${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <clipPath id={`hc${uid}`}>
          <path d={paths.torso} />
          <path d={paths.armL} />
          <path d={paths.armR} />
        </clipPath>
      </defs>

      <g transform={offsetX ? `translate(${offsetX} 0)` : undefined}>
        {/* corpo com gradiente suave */}
        <path d={paths.torso} fill={`url(#hg${uid})`} filter={`url(#hb${uid})`} />
        {/* contorno subtil por cima do blur para definição */}
        <path d={paths.torso} fill="none" stroke={outlineColor} strokeWidth={1.1} />
        {/* braços por cima do tronco: encostados no corpo, passando sobre o quadril */}
        <path d={paths.armL} fill={`url(#hg${uid})`} filter={`url(#hb${uid})`} />
        <path d={paths.armR} fill={`url(#hg${uid})`} filter={`url(#hb${uid})`} />
        <path d={paths.armLLine} fill="none" stroke={outlineColor} strokeWidth={1.1} />
        <path d={paths.armRLine} fill="none" stroke={outlineColor} strokeWidth={1.1} />

        {/* tons por região (gordura/músculo) */}
        {tones && (
          <g clipPath={`url(#hc${uid})`} filter={`url(#ht${uid})`}>
            {tones.trunk && (
              <rect x={CX - dims.ch} y={72} width={dims.ch * 2} height={156} fill={TONE_COLOR[tones.trunk]} />
            )}
            {tones.leftArm && (
              <rect x={CX - 80} y={90} width={80 - dims.ch - 1} height={180} fill={TONE_COLOR[tones.leftArm]} />
            )}
            {tones.rightArm && (
              <rect x={CX + dims.ch + 1} y={90} width={80 - dims.ch - 1} height={180} fill={TONE_COLOR[tones.rightArm]} />
            )}
            {tones.leftLeg && (
              <rect x={CX - 62} y={228} width={64} height={190} fill={TONE_COLOR[tones.leftLeg]} />
            )}
            {tones.rightLeg && (
              <rect x={CX - 2} y={228} width={64} height={190} fill={TONE_COLOR[tones.rightLeg]} />
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
                <circle cx={b.x} cy={84} r={7.5} fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={1} />
                <text x={b.x} y={87} textAnchor="middle" fontSize={8} fontWeight={600} style={{ fill: 'hsl(var(--muted-foreground))' }}>
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
