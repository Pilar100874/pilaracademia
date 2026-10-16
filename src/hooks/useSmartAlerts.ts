import { useMemo } from 'react';
import type { AdherenceBreakdown } from './useAdherenceScore';

export interface SmartAlert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  action?: { label: string; route: string };
}

interface Args {
  adherence: AdherenceBreakdown;
  consumed: { calories: number; protein: number };
  goals: { calories: number; protein: number };
  liquidMl: number;
  liquidGoal: number;
  hasAnyEntry: boolean;
}

export function useSmartAlerts(a: Args): SmartAlert[] {
  return useMemo(() => {
    const alerts: SmartAlert[] = [];

    if (!a.hasAnyEntry) return alerts;

    // Protein gap mid-day
    const proteinPct = a.goals.protein ? a.consumed.protein / a.goals.protein : 0;
    if (proteinPct < 0.3 && new Date().getHours() >= 16) {
      alerts.push({
        id: 'low-protein',
        level: 'warning',
        title: 'Proteína baixa hoje',
        description: `Você comeu ${Math.round(a.consumed.protein)}g de ${a.goals.protein}g. Inclua uma fonte proteica no jantar.`,
      });
    }

    // Hydration alert late in the day
    if (a.liquidGoal > 0 && a.liquidMl / a.liquidGoal < 0.5 && new Date().getHours() >= 17) {
      alerts.push({
        id: 'low-water',
        level: 'info',
        title: 'Hidratação atrasada',
        description: `Faltam ${Math.max(0, a.liquidGoal - a.liquidMl)}ml para a sua meta diária.`,
      });
    }

    // Heavy calorie surplus
    if (a.goals.calories && a.consumed.calories > a.goals.calories * 1.2) {
      alerts.push({
        id: 'over-cal',
        level: 'warning',
        title: 'Acima da meta calórica',
        description: `Você ultrapassou em ${Math.round(a.consumed.calories - a.goals.calories)} kcal. Compense com caminhada ou cardio leve.`,
      });
    }

    return alerts.slice(0, 3);
  }, [
    a.adherence.total,
    a.consumed.calories,
    a.consumed.protein,
    a.goals.calories,
    a.goals.protein,
    a.liquidMl,
    a.liquidGoal,
    a.hasAnyEntry,
  ]);
}
