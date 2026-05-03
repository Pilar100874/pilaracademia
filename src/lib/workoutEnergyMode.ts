// Autorregulação por estado do dia ("Modo de Hoje").
// Aplica regras determinísticas sobre os exercícios do treino padrão para
// gerar uma versão mais leve sem precisar de IA. Funciona em qualquer treino
// (manual, antigo ou gerado por IA).

export type EnergyMode = 'normal' | 'tired' | 'exhausted';

export interface EnergyAdjustedExercise {
  // forma vaga para acomodar tipos diferentes (WorkoutPlan.exercises[i])
  [key: string]: any;
  sets: number;
  reps: string;
  rest_seconds?: number | null;
  _energyAdjusted?: boolean;
  _energyOriginal?: { sets: number; reps: string; rest_seconds?: number | null };
}

const REPS_FACTOR: Record<EnergyMode, number> = {
  normal: 1,
  tired: 0.75,
  exhausted: 0.6,
};

const SETS_DELTA: Record<EnergyMode, number> = {
  normal: 0,
  tired: -1,
  exhausted: -2,
};

const REST_DELTA: Record<EnergyMode, number> = {
  normal: 0,
  tired: 30,
  exhausted: 60,
};

const MIN_SETS = 2;
const MIN_REPS = 4;

/**
 * Heurística simples de intensidade. Usa `body_analysis` (0-100 por grupo
 * muscular) — se o maior valor for alto, o exercício é considerado intenso.
 * Quando não há análise, retorna 0.
 */
export function exerciseIntensity(ex: any): number {
  const body = ex?.body_analysis;
  if (!body || typeof body !== 'object') return 0;
  let max = 0;
  for (const v of Object.values(body)) {
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

const isIntense = (ex: any) => exerciseIntensity(ex) >= 70;

/** Reduz reps preservando o formato original ("12", "8-10", "30s", "Até falha"). */
function adjustReps(reps: unknown, factor: number): string {
  if (factor === 1) return String(reps ?? '');
  const raw = String(reps ?? '').trim();
  if (!raw) return raw;

  // formato "min-max"
  const range = raw.match(/^(\d+)\s*[-–]\s*(\d+)(.*)$/);
  if (range) {
    const a = Math.max(MIN_REPS, Math.round(parseInt(range[1], 10) * factor));
    const b = Math.max(MIN_REPS, Math.round(parseInt(range[2], 10) * factor));
    return `${a}-${b}${range[3] ?? ''}`;
  }

  // formato "30s" ou "30 seg"
  const time = raw.match(/^(\d+)\s*(s|seg|segundos?|min|minutos?)\b(.*)$/i);
  if (time) {
    const n = Math.max(5, Math.round(parseInt(time[1], 10) * factor));
    return `${n}${time[2]}${time[3] ?? ''}`;
  }

  // formato "12" puro
  const num = raw.match(/^(\d+)(.*)$/);
  if (num) {
    const n = Math.max(MIN_REPS, Math.round(parseInt(num[1], 10) * factor));
    return `${n}${num[2] ?? ''}`;
  }

  // texto livre (ex: "Até falha") — mantém
  return raw;
}

export interface ApplyResult<T> {
  exercises: T[];
  removedCount: number;
}

/**
 * Aplica o modo escolhido aos exercícios. No modo `exhausted`, exercícios
 * intensos (intensidade >= 70) são removidos da sessão.
 */
export function applyEnergyMode<T extends Record<string, any>>(
  exercises: T[],
  mode: EnergyMode
): ApplyResult<T> {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return { exercises: [], removedCount: 0 };
  }
  if (mode === 'normal') {
    return { exercises, removedCount: 0 };
  }

  const setsDelta = SETS_DELTA[mode];
  const repsFactor = REPS_FACTOR[mode];
  const restDelta = REST_DELTA[mode];

  const filtered = mode === 'exhausted' ? exercises.filter((e) => !isIntense(e)) : exercises;
  const removedCount = exercises.length - filtered.length;

  const adjusted = filtered.map((e) => {
    const origSets = Number(e.sets) || MIN_SETS;
    const origReps = e.reps;
    const origRest = (e as any).rest_seconds ?? null;

    return {
      ...e,
      sets: Math.max(MIN_SETS, origSets + setsDelta),
      reps: adjustReps(origReps, repsFactor),
      rest_seconds: origRest != null ? origRest + restDelta : origRest,
      _energyAdjusted: true,
      _energyOriginal: { sets: origSets, reps: String(origReps ?? ''), rest_seconds: origRest },
    } as T;
  });

  return { exercises: adjusted, removedCount };
}

export const ENERGY_MODE_LABEL: Record<EnergyMode, string> = {
  normal: 'Normal',
  tired: 'Cansado',
  exhausted: 'Muito cansado',
};
