import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';

export interface LiquidEntry {
  id: string;
  user_id: string;
  amount_ml: number;
  type: string;
  consumed_at: string;
  created_at: string;
}

const LIQUID_TYPES = {
  water: 'Água',
  juice: 'Suco',
  coffee: 'Café',
  tea: 'Chá',
  soda: 'Refrigerante',
  milk: 'Leite',
  other: 'Outro',
};

export function useLiquidEntries(selectedDate?: Date) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LiquidEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntries = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const targetDate = selectedDate || new Date();
    
    const { data, error } = await supabase
      .from('liquid_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('consumed_at', startOfDay(targetDate).toISOString())
      .lte('consumed_at', endOfDay(targetDate).toISOString())
      .order('consumed_at', { ascending: false });

    if (!error && data) {
      setEntries(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [user, selectedDate]);

  const addLiquidEntry = async (amountMl: number, type: string = 'water') => {
    if (!user) throw new Error('Usuário não autenticado');

    // Use selected date for consumed_at, or now
    const consumedDate = selectedDate || new Date();

    const { data, error } = await supabase
      .from('liquid_entries')
      .insert({
        user_id: user.id,
        amount_ml: amountMl,
        type,
        consumed_at: consumedDate.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    setEntries((prev) => [data, ...prev]);
    return data;
  };

  const updateLiquidEntry = async (id: string, amountMl: number) => {
    const { data, error } = await supabase
      .from('liquid_entries')
      .update({ amount_ml: amountMl })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setEntries((prev) => prev.map((e) => (e.id === id ? data : e)));
    return data;
  };

  const deleteLiquidEntry = async (id: string) => {
    const { error } = await supabase
      .from('liquid_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const getTodayTotal = () => {
    return entries.reduce((sum, entry) => sum + entry.amount_ml, 0);
  };

  return {
    entries,
    isLoading,
    addLiquidEntry,
    updateLiquidEntry,
    deleteLiquidEntry,
    getTodayTotal,
    liquidTypes: LIQUID_TYPES,
    refetch: fetchEntries,
  };
}
