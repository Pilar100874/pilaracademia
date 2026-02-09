import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfWeek, endOfWeek, addDays, format } from 'date-fns';

export function useDayIndicators(referenceDate: Date) {
  const { user } = useAuth();
  const [daysWithData, setDaysWithData] = useState<Set<string>>(new Set());

  const fetchIndicators = useCallback(async () => {
    if (!user) return;

    const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
    const startISO = weekStart.toISOString();
    const endISO = addDays(weekEnd, 1).toISOString();

    // Fetch from all relevant tables in parallel
    const [foodRes, liquidRes, exerciseRes, glycemiaRes] = await Promise.all([
      supabase
        .from('food_entries')
        .select('consumed_at')
        .eq('user_id', user.id)
        .gte('consumed_at', startISO)
        .lt('consumed_at', endISO),
      supabase
        .from('liquid_entries')
        .select('consumed_at')
        .eq('user_id', user.id)
        .gte('consumed_at', startISO)
        .lt('consumed_at', endISO),
      supabase
        .from('exercise_entries')
        .select('performed_at')
        .eq('user_id', user.id)
        .gte('performed_at', startISO)
        .lt('performed_at', endISO),
      supabase
        .from('glycemia_entries')
        .select('measured_at')
        .eq('user_id', user.id)
        .gte('measured_at', startISO)
        .lt('measured_at', endISO),
    ]);

    const days = new Set<string>();

    const addDates = (data: { [key: string]: string }[] | null, field: string) => {
      data?.forEach((row) => {
        const date = format(new Date(row[field]), 'yyyy-MM-dd');
        days.add(date);
      });
    };

    addDates(foodRes.data as any, 'consumed_at');
    addDates(liquidRes.data as any, 'consumed_at');
    addDates(exerciseRes.data as any, 'performed_at');
    addDates(glycemiaRes.data as any, 'measured_at');

    setDaysWithData(days);
  }, [user, referenceDate]);

  useEffect(() => {
    fetchIndicators();
  }, [fetchIndicators]);

  const hasData = (date: Date): boolean => {
    return daysWithData.has(format(date, 'yyyy-MM-dd'));
  };

  return { hasData, refetch: fetchIndicators };
}
