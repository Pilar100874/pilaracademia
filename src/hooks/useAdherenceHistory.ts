import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export interface AdherenceDay {
  date: string; // yyyy-MM-dd
  label: string; // dd/MM
  score: number; // 0-100
  protein: number;
  calories: number;
  hydration: number;
  workout: number;
}

/**
 * Computes per-day adherence score for the last `days` days using current goals.
 * Pulls food, liquid and exercise entries grouped by day, then derives the same
 * weighted score used in `useAdherenceScore`.
 */
export function useAdherenceHistory(days = 7) {
  const { user } = useAuth();
  const { getGoals, profile } = useProfile();
  const [history, setHistory] = useState<AdherenceDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user) { setHistory([]); setLoading(false); return; }
      setLoading(true);
      const today = new Date();
      const start = startOfDay(subDays(today, days - 1));
      const end = endOfDay(today);

      const [{ data: foods }, { data: liquids }, { data: exercises }] = await Promise.all([
        supabase
          .from('food_entries')
          .select('consumed_at, calories, protein, carbs, fat')
          .eq('user_id', user.id)
          .gte('consumed_at', start.toISOString())
          .lte('consumed_at', end.toISOString()),
        supabase
          .from('liquid_entries')
          .select('consumed_at, amount_ml')
          .eq('user_id', user.id)
          .gte('consumed_at', start.toISOString())
          .lte('consumed_at', end.toISOString()),
        supabase
          .from('exercise_entries')
          .select('performed_at, calories_burned')
          .eq('user_id', user.id)
          .gte('performed_at', start.toISOString())
          .lte('performed_at', end.toISOString()),
      ]);

      const goals = getGoals();
      const buckets = new Map<string, { calories: number; protein: number; liquid: number; burned: number; hasWorkout: boolean }>();
      for (let i = 0; i < days; i++) {
        const d = subDays(today, days - 1 - i);
        buckets.set(format(d, 'yyyy-MM-dd'), { calories: 0, protein: 0, liquid: 0, burned: 0, hasWorkout: false });
      }
      foods?.forEach((f: any) => {
        const k = format(new Date(f.consumed_at), 'yyyy-MM-dd');
        const b = buckets.get(k); if (!b) return;
        b.calories += Number(f.calories) || 0;
        b.protein += Number(f.protein) || 0;
      });
      liquids?.forEach((l: any) => {
        const k = format(new Date(l.consumed_at), 'yyyy-MM-dd');
        const b = buckets.get(k); if (!b) return;
        b.liquid += Number(l.amount_ml) || 0;
      });
      exercises?.forEach((e: any) => {
        const k = format(new Date(e.performed_at), 'yyyy-MM-dd');
        const b = buckets.get(k); if (!b) return;
        b.burned += Number(e.calories_burned) || 0;
        b.hasWorkout = true;
      });

      const out: AdherenceDay[] = [];
      buckets.forEach((b, k) => {
        const proteinRatio = goals.protein > 0 ? b.protein / goals.protein : 0;
        let proteinScore = Math.min(1, proteinRatio);
        if (proteinRatio > 1.3) proteinScore = Math.max(0.85, 1 - (proteinRatio - 1.3) * 0.5);
        const calDiff = goals.calories > 0 ? Math.abs(b.calories - goals.calories) / goals.calories : 1;
        const calScore = b.calories === 0 ? 0 : Math.max(0, 1 - calDiff);
        const hydrationScore = goals.liquid_ml > 0 ? Math.min(1, b.liquid / goals.liquid_ml) : 0;
        const workoutScore = b.hasWorkout || b.burned > 50 ? 1 : 0;
        const total = Math.round((proteinScore * 0.35 + calScore * 0.25 + hydrationScore * 0.2 + workoutScore * 0.2) * 100);
        out.push({
          date: k,
          label: format(new Date(k), 'dd/MM'),
          score: total,
          protein: Math.round(proteinScore * 100),
          calories: Math.round(calScore * 100),
          hydration: Math.round(hydrationScore * 100),
          workout: workoutScore * 100,
        });
      });
      out.sort((a, b) => a.date.localeCompare(b.date));
      if (!cancelled) { setHistory(out); setLoading(false); }
    };
    run();
    return () => { cancelled = true; };
  }, [user, days, profile?.daily_calories, profile?.daily_protein, profile?.daily_carbs, profile?.daily_fat, profile?.daily_liquid_ml]);

  return { history, loading };
}
