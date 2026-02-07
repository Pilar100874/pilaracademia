import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfDay, endOfDay } from 'date-fns';

export interface GlycemiaEntry {
  id: string;
  user_id: string;
  glucose_mg_dl: number;
  measurement_type: string;
  measured_at: string;
  notes: string | null;
  created_at: string;
}

export const MEASUREMENT_TYPES = {
  fasting: 'Jejum',
  before_meal: 'Antes da refeição',
  after_meal: 'Após refeição',
  random: 'Aleatório',
} as const;

export const getGlycemiaStatus = (glucose: number, type: string): { status: string; color: string } => {
  // Reference values in mg/dL
  if (type === 'fasting') {
    if (glucose < 70) return { status: 'Baixa', color: 'text-blue-500' };
    if (glucose <= 99) return { status: 'Normal', color: 'text-green-500' };
    if (glucose <= 125) return { status: 'Pré-diabetes', color: 'text-amber-500' };
    return { status: 'Alta', color: 'text-red-500' };
  }
  
  // After meal (2h post-prandial)
  if (type === 'after_meal') {
    if (glucose < 70) return { status: 'Baixa', color: 'text-blue-500' };
    if (glucose <= 139) return { status: 'Normal', color: 'text-green-500' };
    if (glucose <= 199) return { status: 'Pré-diabetes', color: 'text-amber-500' };
    return { status: 'Alta', color: 'text-red-500' };
  }
  
  // Random/before meal - use general reference
  if (glucose < 70) return { status: 'Baixa', color: 'text-blue-500' };
  if (glucose <= 140) return { status: 'Normal', color: 'text-green-500' };
  if (glucose <= 180) return { status: 'Atenção', color: 'text-amber-500' };
  return { status: 'Alta', color: 'text-red-500' };
};

export function useGlycemiaEntries(selectedDate?: Date) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<GlycemiaEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const targetDate = selectedDate || new Date();

    const { data, error } = await supabase
      .from('glycemia_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('measured_at', startOfDay(targetDate).toISOString())
      .lte('measured_at', endOfDay(targetDate).toISOString())
      .order('measured_at', { ascending: false });

    if (!error && data) {
      setEntries(data as GlycemiaEntry[]);
    }
    setIsLoading(false);
  }, [user, selectedDate]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addGlycemiaEntry = async (glucoseMgDl: number, measurementType: string = 'fasting', notes?: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    const measuredDate = selectedDate || new Date();

    const { data, error } = await supabase
      .from('glycemia_entries')
      .insert({
        user_id: user.id,
        glucose_mg_dl: glucoseMgDl,
        measurement_type: measurementType,
        measured_at: measuredDate.toISOString(),
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    setEntries((prev) => [data as GlycemiaEntry, ...prev]);
    return data as GlycemiaEntry;
  };

  const updateGlycemiaEntry = async (id: string, glucoseMgDl: number, measurementType?: string, notes?: string) => {
    const updates: Partial<GlycemiaEntry> = { glucose_mg_dl: glucoseMgDl };
    if (measurementType) updates.measurement_type = measurementType;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from('glycemia_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setEntries((prev) => prev.map((e) => (e.id === id ? (data as GlycemiaEntry) : e)));
    return data as GlycemiaEntry;
  };

  const deleteGlycemiaEntry = async (id: string) => {
    const { error } = await supabase
      .from('glycemia_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const getLatestReading = (): GlycemiaEntry | null => {
    return entries.length > 0 ? entries[0] : null;
  };

  const getAverageToday = (): number => {
    if (entries.length === 0) return 0;
    const sum = entries.reduce((acc, e) => acc + e.glucose_mg_dl, 0);
    return Math.round(sum / entries.length);
  };

  return {
    entries,
    isLoading,
    addGlycemiaEntry,
    updateGlycemiaEntry,
    deleteGlycemiaEntry,
    getLatestReading,
    getAverageToday,
    measurementTypes: MEASUREMENT_TYPES,
    refetch: fetchEntries,
  };
}
