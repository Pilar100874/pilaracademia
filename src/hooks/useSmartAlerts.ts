import { useMemo } from 'react';
import { useCurrentBodyPlan } from './useCurrentBodyPlan';
import { useWeightHistory } from './useWeightHistory';
import { differenceInDays, parseISO } from 'date-fns';
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

/**
 * Generates contextual alerts on the dashboard combining the active body plan
 * with today's consumption signals. Pure derivation — no DB/state of its own.
 */
export function useSmartAlerts(a: Args): SmartAlert[] {
  const plan = useCurrentBodyPlan();
  const { entries: weightEntries } = useWeightHistory();

  return useMemo(() => {
    const alerts: SmartAlert[] = [];

    // Critical alerts from the active plan (e.g. visceral fat / metabolic risk)
    if (plan?.plan?.alerts?.length) {
      const criticals = plan.plan.alerts.filter((al) => al.level === 'critical').slice(0, 1);
      criticals.forEach((al, i) =>
        alerts.push({
          id: `plan-crit-${i}`,
          level: 'critical',
          title: 'Alerta de saúde do seu plano',
          description: al.message,
          action: { label: 'Ver plano', route: '/body-analysis' },
        }),
      );
    }

    // Macro adjustment suggestion: weight diverged ≥0.7kg from projection after 14 days
    if (plan && plan.daysSinceStart >= 14 && weightEntries.length > 0) {
      const startIso = plan.row.measured_at || plan.row.created_at;
      const start = parseISO(startIso);
      const startWeight =
        weightEntries.find((w) => Math.abs(differenceInDays(parseISO(w.recorded_at), start)) <= 3)?.weight_kg ??
        (plan.row.extracted as any)?.weight_kg ??
        null;
      const latest = weightEntries[weightEntries.length - 1];
      const currentWeight = latest ? Number(latest.weight_kg) : null;
      const proj = plan.plan.projection;
      let expected: number | null = null;
      if (startWeight && proj?.day_90?.weight_kg) {
        expected = Number(startWeight) + ((proj.day_90.weight_kg - Number(startWeight)) / 90) * plan.daysSinceStart;
      } else if (startWeight && proj?.day_30?.weight_kg) {
        expected = Number(startWeight) + ((proj.day_30.weight_kg - Number(startWeight)) / 30) * plan.daysSinceStart;
      }
      if (expected != null && currentWeight != null && Math.abs(currentWeight - expected) >= 0.7) {
        const diff = currentWeight - expected;
        alerts.push({
          id: 'macro-divergence',
          level: 'warning',
          title: 'Macros podem precisar ajuste',
          description: `Seu peso divergiu ${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg do esperado. Recalcule com a IA.`,
          action: { label: 'Ajustar', route: '/body-analysis' },
        });
      }
    }

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
    plan,
    weightEntries,
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
