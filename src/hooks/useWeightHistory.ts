import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface WeightEntry {
  id: string;
  user_id: string;
  weight_kg: number;
  recorded_at: string;
  created_at: string;
}

export function useWeightHistory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('weight_history')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: true })
      .limit(30);

    if (!error && data) {
      setEntries(data as WeightEntry[]);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addWeightEntry = async (weightKg: number) => {
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('weight_history')
      .insert({
        user_id: user.id,
        weight_kg: weightKg,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    
    setEntries((prev) => [...prev, data as WeightEntry]);
    return data as WeightEntry;
  };

  return {
    entries,
    isLoading,
    addWeightEntry,
    refetch: fetchEntries,
  };
}
