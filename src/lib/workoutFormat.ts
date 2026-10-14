// Opções de duração de treino e quantidade de exercícios sugerida por duração.
export const DURATION_OPTIONS = ['15 min', '20 min', '30 min', '45 min', '60 min', '90 min'] as const;

export const COUNT_BY_DURATION: Record<string, number> = {
  '15 min': 4,
  '20 min': 6,
  '30 min': 8,
  '45 min': 12,
  '60 min': 15,
  '90 min': 20,
};

export const SETS_OPTIONS = ['2 séries', '3 séries', '4 séries'] as const;
export const REPS_OPTIONS = ['8 a 10', '12 a 15', '20 ou mais', 'Por tempo (30-45 s)'] as const;

export function setsFromOption(opt: string | null): number | null {
  if (!opt) return null;
  const n = parseInt(opt, 10);
  return Number.isFinite(n) ? n : null;
}

export function repsFromOption(opt: string | null): number | null {
  if (!opt) return null;
  if (opt.startsWith('8')) return 10;
  if (opt.startsWith('12')) return 12;
  if (opt.startsWith('20')) return 20;
  return null; // "Por tempo" não tem número fixo
}
