import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FoodEntryDB } from '@/types/profile';
import { NutritionData } from '@/types/nutrition';
import { useAuth } from '@/hooks/useAuth';

export function useFoodEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FoodEntryDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTodayEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('food_entries')
      .select('*')
      .gte('consumed_at', today.toISOString())
      .lt('consumed_at', tomorrow.toISOString())
      .order('consumed_at', { ascending: false });

    if (error) {
      console.error('Error fetching entries:', error);
    } else {
      setEntries(data as FoodEntryDB[] || []);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTodayEntries();
  }, [fetchTodayEntries]);

  const addEntry = useCallback(async (entry: {
    name: string;
    nutrition: NutritionData;
    imageUrl?: string;
    quantity: number;
    unit: string;
    source: 'photo' | 'barcode' | 'manual';
    consumedAt?: Date;
  }) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('food_entries')
      .insert({
        user_id: user.id,
        name: entry.name,
        image_url: entry.imageUrl || null,
        calories: entry.nutrition.calories,
        protein: entry.nutrition.protein,
        carbs: entry.nutrition.carbs,
        fat: entry.nutrition.fat,
        quantity: entry.quantity,
        unit: entry.unit,
        source: entry.source,
        consumed_at: (entry.consumedAt || new Date()).toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding entry:', error);
      throw error;
    }

    setEntries(prev => [data as FoodEntryDB, ...prev]);
    return data as FoodEntryDB;
  }, [user]);

  const updateEntry = useCallback(async (id: string, updates: {
    name?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    quantity?: number;
    unit?: string;
    consumed_at?: string;
  }) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('food_entries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating entry:', error);
      throw error;
    }

    setEntries(prev => prev.map(e => e.id === id ? data as FoodEntryDB : e));
    return data as FoodEntryDB;
  }, [user]);

  const deleteEntry = useCallback(async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('food_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting entry:', error);
      throw error;
    }

    setEntries(prev => prev.filter(e => e.id !== id));
  }, [user]);

  const getTodaySummary = useCallback(() => {
    const consumed = entries.reduce(
      (acc, entry) => ({
        calories: acc.calories + (entry.calories || 0),
        protein: acc.protein + Number(entry.protein || 0),
        carbs: acc.carbs + Number(entry.carbs || 0),
        fat: acc.fat + Number(entry.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return { consumed, entries };
  }, [entries]);

  return {
    entries,
    isLoading,
    addEntry,
    updateEntry,
    deleteEntry,
    getTodaySummary,
    refetch: fetchTodayEntries,
  };
}
