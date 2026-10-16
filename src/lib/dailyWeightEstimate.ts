/** ~7.700 kcal ≈ 1 kg de gordura corporal → 7,7 kcal por grama. */
export const KCAL_PER_GRAM = 7.7;
/** Movimento básico do dia (sem exercício) quando não há relógio medindo a atividade. */
export const BASELINE_MULTIPLIER = 1.2;

export interface DailyWeightEstimateInput {
  consumedKcal: number;
  exerciseKcal: number;
  bmrKcal: number;
  /** Calorias ativas do relógio já incluem o movimento do dia; não somar o movimento básico. */
  hasWatchActivity: boolean;
}

export interface DailyWeightEstimate {
  burnedKcal: number;
  balanceKcal: number;
  /** Positivo = perda estimada; negativo = ganho. */
  lossGrams: number;
}

export function estimateDailyWeightChange(input: DailyWeightEstimateInput): DailyWeightEstimate {
  const resting = input.hasWatchActivity ? input.bmrKcal : input.bmrKcal * BASELINE_MULTIPLIER;
  const burnedKcal = Math.round(resting + Math.max(0, input.exerciseKcal));
  const balanceKcal = Math.round(burnedKcal - Math.max(0, input.consumedKcal));
  return { burnedKcal, balanceKcal, lossGrams: Math.round(balanceKcal / KCAL_PER_GRAM) };
}
