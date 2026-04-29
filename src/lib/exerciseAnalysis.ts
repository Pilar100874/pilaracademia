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

const BODY_LABEL_MAP: Record<BodyAnalysisKey, string> = BODY_GROUPS.flatMap((g) => g.items).reduce(
  (acc, it) => ({ ...acc, [it.key]: it.label }),
  {} as Record<BodyAnalysisKey, string>
);

export const labelForBodyKey = (k: BodyAnalysisKey): string => BODY_LABEL_MAP[k] ?? k;

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
