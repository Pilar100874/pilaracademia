import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfDay, endOfDay } from 'date-fns';

export interface ExerciseEntry {
  id: string;
  user_id: string;
  name: string;
  duration_minutes: number;
  calories_burned: number;
  exercise_type: string;
  performed_at: string;
  created_at: string;
}

// MET values for common exercises (Metabolic Equivalent of Task)
// Fórmula: Calorias = MET × Peso(kg) × Tempo(horas)
export const EXERCISE_TYPES = {
  walking_light: { name: 'Caminhada leve', met: 2.5, icon: '🚶' },
  walking_fast: { name: 'Caminhada rápida', met: 4.0, icon: '🚶‍♂️' },
  running_light: { name: 'Corrida leve', met: 7.0, icon: '🏃' },
  running_moderate: { name: 'Corrida moderada', met: 10.0, icon: '🏃‍♂️' },
  cycling_light: { name: 'Ciclismo leve', met: 4.0, icon: '🚴' },
  cycling_moderate: { name: 'Ciclismo moderado', met: 8.0, icon: '🚴‍♂️' },
  swimming: { name: 'Natação', met: 6.0, icon: '🏊' },
  weight_training: { name: 'Musculação', met: 5.0, icon: '🏋️' },
  yoga: { name: 'Yoga/Alongamento', met: 2.5, icon: '🧘' },
  hiit: { name: 'HIIT', met: 8.0, icon: '💪' },
  dance: { name: 'Dança', met: 5.0, icon: '💃' },
  football: { name: 'Futebol', met: 7.0, icon: '⚽' },
  basketball: { name: 'Basquete', met: 6.5, icon: '🏀' },
  other: { name: 'Outro', met: 4.0, icon: '🏃' },
};

export function calculateCaloriesBurned(
  exerciseType: keyof typeof EXERCISE_TYPES,
  durationMinutes: number,
  weightKg: number
): number {
  const met = EXERCISE_TYPES[exerciseType]?.met || 4.0;
  const hours = durationMinutes / 60;
  return Math.round(met * weightKg * hours);
}

export function useExerciseEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ExerciseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    const today = new Date();

    const { data, error } = await supabase
      .from('exercise_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('performed_at', startOfDay(today).toISOString())
      .lte('performed_at', endOfDay(today).toISOString())
      .order('performed_at', { ascending: false });

    if (!error && data) {
      setEntries(data as ExerciseEntry[]);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addExerciseEntry = async (entry: {
    name: string;
    duration_minutes: number;
    calories_burned: number;
    exercise_type: string;
  }) => {
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('exercise_entries')
      .insert({
        user_id: user.id,
        name: entry.name,
        duration_minutes: entry.duration_minutes,
        calories_burned: entry.calories_burned,
        exercise_type: entry.exercise_type,
        performed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    setEntries((prev) => [data as ExerciseEntry, ...prev]);
    return data as ExerciseEntry;
  };

  const updateExerciseEntry = async (id: string, updates: Partial<ExerciseEntry>) => {
    const { data, error } = await supabase
      .from('exercise_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setEntries((prev) => prev.map((e) => (e.id === id ? (data as ExerciseEntry) : e)));
    return data as ExerciseEntry;
  };

  const deleteExerciseEntry = async (id: string) => {
    const { error } = await supabase
      .from('exercise_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const getTodayTotalBurned = () => {
    return entries.reduce((sum, entry) => sum + Number(entry.calories_burned), 0);
  };

  return {
    entries,
    isLoading,
    addExerciseEntry,
    updateExerciseEntry,
    deleteExerciseEntry,
    getTodayTotalBurned,
    refetch: fetchEntries,
  };
}
