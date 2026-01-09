import { useState, useCallback, useEffect } from 'react';
import { FoodEntry, DailySummary, DailyGoals, NutritionData } from '@/types/nutrition';

const DEFAULT_GOALS: DailyGoals = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
};

const STORAGE_KEY = 'calorie-tracker-data';

interface StoredData {
  entries: FoodEntry[];
  goals: DailyGoals;
}

const getTodayKey = () => new Date().toISOString().split('T')[0];

export function useNutrition() {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [goals, setGoals] = useState<DailyGoals>(DEFAULT_GOALS);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: StoredData = JSON.parse(stored);
        setEntries(data.entries.map(e => ({
          ...e,
          timestamp: new Date(e.timestamp)
        })));
        setGoals(data.goals);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!isLoading) {
      const data: StoredData = { entries, goals };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [entries, goals, isLoading]);

  const addEntry = useCallback((entry: Omit<FoodEntry, 'id' | 'timestamp'>) => {
    const newEntry: FoodEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setEntries(prev => [newEntry, ...prev]);
    return newEntry;
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateGoals = useCallback((newGoals: Partial<DailyGoals>) => {
    setGoals(prev => ({ ...prev, ...newGoals }));
  }, []);

  const getTodayEntries = useCallback(() => {
    const today = getTodayKey();
    return entries.filter(e => 
      new Date(e.timestamp).toISOString().split('T')[0] === today
    );
  }, [entries]);

  const getTodaySummary = useCallback((): DailySummary => {
    const todayEntries = getTodayEntries();
    
    const consumed: NutritionData = todayEntries.reduce(
      (acc, entry) => ({
        calories: acc.calories + entry.nutrition.calories,
        protein: acc.protein + entry.nutrition.protein,
        carbs: acc.carbs + entry.nutrition.carbs,
        fat: acc.fat + entry.nutrition.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return {
      date: getTodayKey(),
      consumed,
      goals,
      entries: todayEntries,
    };
  }, [getTodayEntries, goals]);

  return {
    entries,
    goals,
    isLoading,
    addEntry,
    removeEntry,
    updateGoals,
    getTodayEntries,
    getTodaySummary,
  };
}
