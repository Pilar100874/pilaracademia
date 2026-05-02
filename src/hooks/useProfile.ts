import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, calculateBMR, calculateTDEE, calculateDailyCalories, calculateAllNutrients, calculateAge } from '@/types/profile';
import { useAuth } from '@/hooks/useAuth';

// Module-level shared cache so all useProfile() instances stay in sync.
// Without this, separate consumers (e.g. ProtectedRoute and OnboardingPage)
// can hold stale copies and cause redirect loops after profile updates.
let _cachedProfile: Profile | null = null;
let _cachedUserId: string | null = null;
const _listeners = new Set<(p: Profile | null) => void>();
function _broadcastProfile(p: Profile | null) {
  _cachedProfile = p;
  _listeners.forEach((l) => l(p));
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfileState] = useState<Profile | null>(
    user && _cachedUserId === user.id ? _cachedProfile : null,
  );
  const [isLoading, setIsLoading] = useState(
    !(user && _cachedUserId === user.id && _cachedProfile),
  );
  const setProfile = useCallback((p: Profile | null) => {
    _broadcastProfile(p);
  }, []);

  // Subscribe to global profile changes
  useEffect(() => {
    const listener = (p: Profile | null) => setProfileState(p);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

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
    // Overrides (e.g. from body analysis) take precedence when set.
    return {
      calories: profile?.daily_calories_override || profile?.daily_calories || 2000,
      protein: profile?.daily_protein_override || profile?.daily_protein || 150,
      carbs: profile?.daily_carbs_override || profile?.daily_carbs || 250,
      fat: profile?.daily_fat_override || profile?.daily_fat || 65,
      saturatedFat: profile?.daily_saturated_fat || 22,
      transFat: profile?.daily_trans_fat || 2,
      fiber: profile?.daily_fiber_override || profile?.daily_fiber || 25,
      sodium: profile?.daily_sodium || 2000,
      liquid_ml: profile?.daily_liquid_ml_override || profile?.daily_liquid_ml || 2000,
      isOverride: !!profile?.daily_calories_override,
      overrideSource: profile?.nutrition_override_source || null,
    };
  }, [profile]);

  const applyNutritionOverride = useCallback(
    async (overrides: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      liquid_ml?: number;
      source?: string;
    }) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .update({
          daily_calories_override: Math.round(overrides.calories),
          daily_protein_override: Math.round(overrides.protein),
          daily_carbs_override: Math.round(overrides.carbs),
          daily_fat_override: Math.round(overrides.fat),
          daily_fiber_override: overrides.fiber ? Math.round(overrides.fiber) : null,
          daily_liquid_ml_override: overrides.liquid_ml ? Math.round(overrides.liquid_ml) : null,
          nutrition_override_source: overrides.source || 'body_analysis',
          nutrition_override_set_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      setProfile(data as Profile);
      return data as Profile;
    },
    [user],
  );

  const clearNutritionOverride = useCallback(async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .update({
        daily_calories_override: null,
        daily_protein_override: null,
        daily_carbs_override: null,
        daily_fat_override: null,
        daily_fiber_override: null,
        daily_liquid_ml_override: null,
        nutrition_override_source: null,
        nutrition_override_set_at: null,
      })
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data as Profile);
    return data as Profile;
  }, [user]);

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
    applyNutritionOverride,
    clearNutritionOverride,
    refetch: fetchProfile,
  };
}
