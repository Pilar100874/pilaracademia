import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';

/**
 * Calcula a sequência (streak) de dias consecutivos com pelo menos um registro
 * de alimentação. Considera o fuso local do usuário.
 */
export function useStreak() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['streak', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      // Pega os últimos 60 dias de food_entries (suficiente p/ streak grande)
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const { data, error } = await supabase
        .from('food_entries')
        .select('consumed_at')
        .eq('user_id', user!.id)
        .gte('consumed_at', since.toISOString())
        .order('consumed_at', { ascending: false });
      if (error) throw error;

      const days = new Set<string>();
      for (const row of data || []) {
        const d = startOfDay(parseISO(row.consumed_at as string));
        days.add(d.toISOString().slice(0, 10));
      }

      const today = startOfDay(new Date());
      let streak = 0;
      for (let i = 0; i < 60; i++) {
        const probe = new Date(today);
        probe.setDate(today.getDate() - i);
        const key = probe.toISOString().slice(0, 10);
        if (days.has(key)) streak++;
        else if (i === 0) {
          // se hoje ainda não tem registro, conta a partir de ontem
          continue;
        } else {
          break;
        }
      }
      return { streak, lastEntryDays: days.size };
    },
  });
}
