import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, calculateBMR, calculateTDEE, calculateDailyCalories, calculateAllNutrients, calculateAge } from '@/types/profile';
import { useAuth } from '@/hooks/useAuth';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
    }
    
    setProfile(data as Profile | null);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user || !profile) return null;

    let nutritionUpdates: Partial<Profile> = {};
    
    const gender = updates.gender || profile.gender;
    const weightKg = updates.weight_kg || profile.weight_kg;
    const heightCm = updates.height_cm || profile.height_cm;
    const birthDate = updates.birth_date || profile.birth_date;
    const activityLevel = updates.activity_level || profile.activity_level;
    const goal = updates.goal || profile.goal;

    if (gender && weightKg && heightCm && birthDate && activityLevel && goal) {
      const age = calculateAge(birthDate);
      const bmr = calculateBMR(gender, weightKg, heightCm, age);
      const tdee = calculateTDEE(bmr, activityLevel);
      const dailyCalories = calculateDailyCalories(tdee, goal);
      const nutrients = calculateAllNutrients(dailyCalories, goal);

      // Cálculo de líquidos: 35ml por kg de peso corporal (regra padrão)
      const dailyLiquidMl = Math.round(weightKg * 35);

      nutritionUpdates = {
        daily_calories: dailyCalories,
        daily_protein: nutrients.protein,
        daily_carbs: nutrients.carbs,
        daily_fat: nutrients.fat,
        daily_saturated_fat: nutrients.saturatedFat,
        daily_trans_fat: nutrients.transFat,
        daily_fiber: nutrients.fiber,
        daily_sodium: nutrients.sodium,
        daily_liquid_ml: dailyLiquidMl,
      };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, ...nutritionUpdates })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }

    setProfile(data as Profile);
    return data as Profile;
  }, [user, profile]);

  const getGoals = useCallback(() => {
    return {
      calories: profile?.daily_calories || 2000,
      protein: profile?.daily_protein || 150,
      carbs: profile?.daily_carbs || 250,
      fat: profile?.daily_fat || 65,
      saturatedFat: profile?.daily_saturated_fat || 22,
      transFat: profile?.daily_trans_fat || 2,
      fiber: profile?.daily_fiber || 25,
      sodium: profile?.daily_sodium || 2000,
    };
  }, [profile]);

  const isProfileComplete = useCallback(() => {
    if (!profile) return false;
    return !!(
      profile.gender &&
      profile.weight_kg &&
      profile.height_cm &&
      profile.birth_date &&
      profile.activity_level &&
      profile.goal
    );
  }, [profile]);

  return {
    profile,
    isLoading,
    updateProfile,
    getGoals,
    isProfileComplete,
    refetch: fetchProfile,
  };
}
