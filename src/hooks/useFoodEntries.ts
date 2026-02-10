import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FoodEntryDB } from '@/types/profile';
import { NutritionData } from '@/types/nutrition';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { startOfDay, endOfDay } from 'date-fns';

export function useFoodEntries(selectedDate?: Date) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FoodEntryDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setEntries([]);

    const targetDate = selectedDate || new Date();
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    const { data, error } = await supabase
      .from('food_entries')
      .select('*')
      .gte('consumed_at', dayStart.toISOString())
      .lte('consumed_at', dayEnd.toISOString())
      .order('consumed_at', { ascending: false });

    if (error) {
      console.error('Error fetching entries:', error);
    } else {
      setEntries((data as unknown as FoodEntryDB[]) || []);
    }
    setIsLoading(false);
  }, [user, selectedDate]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addEntry = useCallback(async (entry: {
    name: string;
    nutrition: NutritionData;
    imageUrl?: string;
    quantity: number;
    unit: string;
    source: 'photo' | 'barcode' | 'manual' | 'voice';
    consumedAt?: Date;
    isLiquid?: boolean;
    liquidMl?: number;
    productId?: string;
    originalItems?: Array<{
      name: string;
      quantity: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>;
  }) => {
    if (!user) return null;

    // Use the selected date for the consumed_at timestamp, or provided date, or now
    const consumedDate = entry.consumedAt || selectedDate || new Date();

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
        saturated_fat: entry.nutrition.saturatedFat || 0,
        trans_fat: entry.nutrition.transFat || 0,
        fiber: entry.nutrition.fiber || 0,
        sodium: entry.nutrition.sodium || 0,
        quantity: entry.quantity,
        unit: entry.unit,
        source: entry.source,
        consumed_at: consumedDate.toISOString(),
        is_liquid: entry.isLiquid || false,
        liquid_ml: entry.liquidMl || 0,
        product_id: entry.productId || null,
        original_items: entry.originalItems || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding entry:', error);
      throw error;
    }

    setEntries(prev => [data as unknown as FoodEntryDB, ...prev]);
    return data as unknown as FoodEntryDB;
  }, [user, selectedDate]);

  const updateEntry = useCallback(async (id: string, updates: Partial<FoodEntryDB>) => {
    if (!user) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('food_entries')
      .update(updates as any)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating entry:', error);
      throw error;
    }

    setEntries(prev => prev.map(e => e.id === id ? data as unknown as FoodEntryDB : e));
    return data as unknown as FoodEntryDB;
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

  const getSummary = useCallback(() => {
    const consumed = entries.reduce(
      (acc, entry) => ({
        calories: acc.calories + (entry.calories || 0),
        protein: acc.protein + Number(entry.protein || 0),
        carbs: acc.carbs + Number(entry.carbs || 0),
        fat: acc.fat + Number(entry.fat || 0),
        saturatedFat: acc.saturatedFat + Number(entry.saturated_fat || 0),
        transFat: acc.transFat + Number(entry.trans_fat || 0),
        fiber: acc.fiber + Number(entry.fiber || 0),
        sodium: acc.sodium + Number(entry.sodium || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, saturatedFat: 0, transFat: 0, fiber: 0, sodium: 0 }
    );

    return { consumed, entries };
  }, [entries]);

  return {
    entries,
    isLoading,
    addEntry,
    updateEntry,
    deleteEntry,
    getSummary,
    getTodaySummary: getSummary, // Alias for backward compatibility
    refetch: fetchEntries,
  };
}
