import { useMemo } from 'react';

interface Args {
  consumed: { calories: number; protein: number; carbs: number; fat: number };
  goals: { calories: number; protein: number; carbs: number; fat: number; liquid_ml: number };
  liquidMl: number;
  caloriesBurned: number;
  /** true se houve treino registrado no dia */
  hasWorkout?: boolean;
}

export interface AdherenceBreakdown {
  protein: number; // 0-100
  calories: number;
  hydration: number;
  workout: number;
  total: number; // weighted 0-100
  label: string;
  color: 'emerald' | 'amber' | 'rose' | 'muted';
}

/**
 * Adherence score (0–100):
 * - Proteína: 35% (clamp 0..1 = consumed/goal, com penalidade quando passa muito de 1.2x)
 * - Calorias: 25% (1 - |consumed - goal| / goal, clamped)
 * - Hidratação: 20% (consumed/goal clamp 0..1)
 * - Treino: 20% (binário)
 *
 * Retorna 0 / "—" quando não há nenhum dado registrado.
 */
export function useAdherenceScore(a: Args): AdherenceBreakdown {
  return useMemo(() => {
    const proteinRatio = a.goals.protein > 0 ? a.consumed.protein / a.goals.protein : 0;
    let proteinScore = Math.min(1, proteinRatio);
    if (proteinRatio > 1.3) proteinScore = Math.max(0.85, 1 - (proteinRatio - 1.3) * 0.5);

    const calDiff = a.goals.calories > 0 ? Math.abs(a.consumed.calories - a.goals.calories) / a.goals.calories : 1;
    const calScore = Math.max(0, 1 - calDiff);

    const hydrationRatio = a.goals.liquid_ml > 0 ? a.liquidMl / a.goals.liquid_ml : 0;
    const hydrationScore = Math.min(1, hydrationRatio);

    const workoutScore = a.hasWorkout || a.caloriesBurned > 50 ? 1 : 0;

    const totalRaw =
      proteinScore * 0.35 + calScore * 0.25 + hydrationScore * 0.2 + workoutScore * 0.2;
    const total = Math.round(totalRaw * 100);

    let label = 'Iniciando';
    let color: AdherenceBreakdown['color'] = 'muted';
    if (a.consumed.calories === 0 && a.liquidMl === 0 && !a.hasWorkout) {
      label = '—';
      color = 'muted';
    } else if (total >= 80) {
      label = 'Excelente';
      color = 'emerald';
    } else if (total >= 60) {
      label = 'Bom';
      color = 'emerald';
    } else if (total >= 40) {
      label = 'Regular';
      color = 'amber';
    } else {
      label = 'Atenção';
      color = 'rose';
    }

    return {
      protein: Math.round(proteinScore * 100),
      calories: Math.round(calScore * 100),
      hydration: Math.round(hydrationScore * 100),
      workout: workoutScore * 100,
      total,
      label,
      color,
    };
  }, [
    a.consumed.calories,
    a.consumed.protein,
    a.goals.calories,
    a.goals.protein,
    a.goals.liquid_ml,
    a.liquidMl,
    a.caloriesBurned,
    a.hasWorkout,
  ]);
}
