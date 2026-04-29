// Compartilhado entre a edge function `analyze-exercise-video` e a UI.
// Mantém a ordem para exibição agrupada e os rótulos em PT-BR.

export type BodyAnalysisKey =
  | 'abdomen_superior'
  | 'abdomen_inferior'
  | 'cintura_flancos'
  | 'lombar'
  | 'postura_pelvica'
  | 'core_geral'
  | 'gluteos'
  | 'coxa_anterior'
  | 'coxa_posterior'
  | 'adutores'
  | 'panturrilhas'
  | 'joelhos_alinhamento'
  | 'biceps_triceps'
  | 'ombros'
  | 'peitoral'
  | 'costas_superiores'
  | 'escapulas_postura_ombros';

export type AestheticAnalysisKey =
  | 'flacidez'
  | 'retencao_edema'
  | 'assimetria_corporal'
  | 'postura'
  | 'gordura_localizada'
  | 'definicao_muscular';

export type MobilityAnalysisKey =
  | 'mobilidade_quadril'
  | 'mobilidade_ombro'
  | 'mobilidade_coluna'
  | 'mobilidade_tornozelo'
  | 'flexibilidade_posterior'
  | 'flexibilidade_anterior_coxa'
  | 'flexibilidade_adutores'
  | 'flexibilidade_peitoral_ombro'
  | 'amplitude_articular_geral'
  | 'equilibrio_coordenacao';

export type BodyAnalysis = Record<BodyAnalysisKey, number>;
export type AestheticAnalysis = Record<AestheticAnalysisKey, number>;
export type MobilityAnalysis = Record<MobilityAnalysisKey, number>;

export const BODY_GROUPS: { group: string; items: { key: BodyAnalysisKey; label: string }[] }[] = [
  {
    group: 'Tronco / Core',
    items: [
      { key: 'abdomen_superior', label: 'Abdômen superior' },
      { key: 'abdomen_inferior', label: 'Abdômen inferior' },
      { key: 'cintura_flancos', label: 'Cintura / flancos' },
      { key: 'lombar', label: 'Lombar' },
      { key: 'postura_pelvica', label: 'Postura pélvica' },
      { key: 'core_geral', label: 'Core geral' },
    ],
  },
  {
    group: 'Membros inferiores',
    items: [
      { key: 'gluteos', label: 'Glúteos' },
      { key: 'coxa_anterior', label: 'Coxa anterior (quadríceps)' },
      { key: 'coxa_posterior', label: 'Posterior de coxa' },
      { key: 'adutores', label: 'Adutores' },
      { key: 'panturrilhas', label: 'Panturrilhas' },
      { key: 'joelhos_alinhamento', label: 'Joelhos / alinhamento' },
    ],
  },
  {
    group: 'Membros superiores',
    items: [
      { key: 'biceps_triceps', label: 'Braços (bíceps / tríceps)' },
      { key: 'ombros', label: 'Ombros' },
      { key: 'peitoral', label: 'Peitoral' },
      { key: 'costas_superiores', label: 'Costas superiores' },
      { key: 'escapulas_postura_ombros', label: 'Escápulas / postura' },
    ],
  },
];

export const AESTHETIC_ITEMS: { key: AestheticAnalysisKey; label: string }[] = [
  { key: 'flacidez', label: 'Flacidez' },
  { key: 'retencao_edema', label: 'Retenção / edema' },
  { key: 'assimetria_corporal', label: 'Assimetria corporal' },
  { key: 'postura', label: 'Postura' },
  { key: 'gordura_localizada', label: 'Gordura localizada' },
  { key: 'definicao_muscular', label: 'Definição muscular' },
];

export const MOBILITY_ITEMS: { key: MobilityAnalysisKey; label: string }[] = [
  { key: 'mobilidade_quadril', label: 'Mobilidade de quadril' },
  { key: 'mobilidade_ombro', label: 'Mobilidade de ombro' },
  { key: 'mobilidade_coluna', label: 'Mobilidade de coluna' },
  { key: 'mobilidade_tornozelo', label: 'Mobilidade de tornozelo' },
  { key: 'flexibilidade_posterior', label: 'Flexibilidade posterior (cadeia)' },
  { key: 'flexibilidade_anterior_coxa', label: 'Flexibilidade anterior de coxa' },
  { key: 'flexibilidade_adutores', label: 'Flexibilidade de adutores' },
  { key: 'flexibilidade_peitoral_ombro', label: 'Flexibilidade peitoral / ombro' },
  { key: 'amplitude_articular_geral', label: 'Amplitude articular geral' },
  { key: 'equilibrio_coordenacao', label: 'Equilíbrio e coordenação' },
];

export const MOBILITY_GROUPS: { group: string; items: { key: MobilityAnalysisKey; label: string }[] }[] = [
  {
    group: 'Mobilidade articular',
    items: [
      { key: 'mobilidade_quadril', label: 'Quadril' },
      { key: 'mobilidade_ombro', label: 'Ombro' },
      { key: 'mobilidade_coluna', label: 'Coluna' },
      { key: 'mobilidade_tornozelo', label: 'Tornozelo' },
    ],
  },
  {
    group: 'Flexibilidade muscular',
    items: [
      { key: 'flexibilidade_posterior', label: 'Cadeia posterior (isquios/lombar)' },
      { key: 'flexibilidade_anterior_coxa', label: 'Anterior de coxa (quadríceps)' },
      { key: 'flexibilidade_adutores', label: 'Adutores (parte interna)' },
      { key: 'flexibilidade_peitoral_ombro', label: 'Peitoral / ombro' },
    ],
  },
  {
    group: 'Geral',
    items: [
      { key: 'amplitude_articular_geral', label: 'Amplitude articular geral' },
      { key: 'equilibrio_coordenacao', label: 'Equilíbrio e coordenação' },
    ],
  },
];

const BODY_LABEL_MAP: Record<BodyAnalysisKey, string> = BODY_GROUPS.flatMap((g) => g.items).reduce(
  (acc, it) => ({ ...acc, [it.key]: it.label }),
  {} as Record<BodyAnalysisKey, string>
);

export const labelForBodyKey = (k: BodyAnalysisKey): string => BODY_LABEL_MAP[k] ?? k;

const AESTHETIC_LABEL_MAP: Record<AestheticAnalysisKey, string> = AESTHETIC_ITEMS.reduce(
  (acc, it) => ({ ...acc, [it.key]: it.label }),
  {} as Record<AestheticAnalysisKey, string>
);
export const labelForAestheticKey = (k: AestheticAnalysisKey): string => AESTHETIC_LABEL_MAP[k] ?? k;

const MOBILITY_LABEL_MAP: Record<MobilityAnalysisKey, string> = MOBILITY_ITEMS.reduce(
  (acc, it) => ({ ...acc, [it.key]: it.label }),
  {} as Record<MobilityAnalysisKey, string>
);
export const labelForMobilityKey = (k: MobilityAnalysisKey): string => MOBILITY_LABEL_MAP[k] ?? k;

/** Retorna as N áreas com maior % no body_analysis (ignora valores <= 0). */
export function topBodyAreas(
  analysis: BodyAnalysis | null | undefined,
  n = 3
): { key: BodyAnalysisKey; label: string; value: number }[] {
  if (!analysis) return [];
  return (Object.entries(analysis) as [BodyAnalysisKey, number][])
    .filter(([, v]) => typeof v === 'number' && v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, value]) => ({ key, label: labelForBodyKey(key), value }));
}

/**
 * Agrega classificações de uma lista de exercícios (somando %) e retorna o top N
 * para cada dimensão: body, aesthetic, mobility. Usado para resumo de um treino.
 */
export function summarizeWorkout(
  exercises: Array<{
    body_analysis?: Record<string, number> | null;
    aesthetic_analysis?: Record<string, number> | null;
    mobility_analysis?: Record<string, number> | null;
  }>,
  n = 3
) {
  const accBody: Record<string, number> = {};
  const accAesth: Record<string, number> = {};
  const accMob: Record<string, number> = {};
  let analyzedCount = 0;

  for (const ex of exercises) {
    const hasAny = ex.body_analysis || ex.aesthetic_analysis || ex.mobility_analysis;
    if (hasAny) analyzedCount++;
    if (ex.body_analysis) {
      for (const [k, v] of Object.entries(ex.body_analysis)) {
        if (typeof v === 'number' && v > 0) accBody[k] = (accBody[k] ?? 0) + v;
      }
    }
    if (ex.aesthetic_analysis) {
      for (const [k, v] of Object.entries(ex.aesthetic_analysis)) {
        if (typeof v === 'number' && v > 0) accAesth[k] = (accAesth[k] ?? 0) + v;
      }
    }
    if (ex.mobility_analysis) {
      for (const [k, v] of Object.entries(ex.mobility_analysis)) {
        if (typeof v === 'number' && v > 0) accMob[k] = (accMob[k] ?? 0) + v;
      }
    }
  }

  const denom = Math.max(1, analyzedCount);
  const pickTop = <T extends string>(
    acc: Record<string, number>,
    labelFn: (k: T) => string
  ) =>
    Object.entries(acc)
      .map(([k, sum]) => ({ key: k as T, label: labelFn(k as T), value: Math.round(sum / denom) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, n);

  return {
    analyzedCount,
    body: pickTop<BodyAnalysisKey>(accBody, labelForBodyKey),
    aesthetic: pickTop<AestheticAnalysisKey>(accAesth, labelForAestheticKey),
    mobility: pickTop<MobilityAnalysisKey>(accMob, labelForMobilityKey),
  };
}
