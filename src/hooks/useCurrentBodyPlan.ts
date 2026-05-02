import { useMemo } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { useBodyAnalyses } from './useBodyAnalyses';
import type { BodyAnalysisRow, BodyPlan, BodyPlanPhase } from '@/types/bodyAnalysis';

export interface CurrentPlanInfo {
  row: BodyAnalysisRow;
  plan: BodyPlan;
  /** 1-based current week within the 12-week plan (clamped). */
  currentWeek: number;
  totalWeeks: number;
  /** Current phase based on the periodization weeks string (e.g. "1-4"). */
  currentPhase?: BodyPlanPhase;
  currentPhaseIndex: number;
  daysSinceStart: number;
}

/**
 * Picks the most recent body_analyses row (the active plan) and computes
 * which week of the 12-week periodization the user is on.
 */
export function useCurrentBodyPlan(): CurrentPlanInfo | null {
  const { list } = useBodyAnalyses();

  return useMemo(() => {
    const rows = list.data || [];
    if (rows.length === 0) return null;
    const row = rows[0]; // already ordered desc by created_at
    const plan = row.plan as BodyPlan;
    if (!plan) return null;

    const startIso = row.measured_at || row.created_at;
    const start = startIso ? parseISO(startIso) : new Date();
    const days = Math.max(0, differenceInDays(new Date(), start));
    const totalWeeks = 12;
    const currentWeek = Math.min(totalWeeks, Math.max(1, Math.floor(days / 7) + 1));

    let currentPhase: BodyPlanPhase | undefined;
    let currentPhaseIndex = -1;
    if (plan.periodization?.length) {
      for (let i = 0; i < plan.periodization.length; i++) {
        const p = plan.periodization[i];
        const m = (p.weeks || '').match(/(\d+)\s*[-–]\s*(\d+)/);
        if (m) {
          const a = parseInt(m[1], 10);
          const b = parseInt(m[2], 10);
          if (currentWeek >= a && currentWeek <= b) {
            currentPhase = p;
            currentPhaseIndex = i;
            break;
          }
        }
      }
      if (!currentPhase) {
        // Fallback by index proportional
        const idx = Math.min(plan.periodization.length - 1, Math.floor((currentWeek - 1) / 4));
        currentPhase = plan.periodization[idx];
        currentPhaseIndex = idx;
      }
    }

    return {
      row,
      plan,
      currentWeek,
      totalWeeks,
      currentPhase,
      currentPhaseIndex,
      daysSinceStart: days,
    };
  }, [list.data]);
}
