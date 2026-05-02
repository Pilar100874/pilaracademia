import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface FoodPreferences {
  id: string;
  user_id: string;
  restrictions: string[];
  disliked_foods: string[];
  favorite_foods: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const COMMON_RESTRICTIONS = [
  { key: 'lactose', label: 'Sem lactose' },
  { key: 'gluten', label: 'Sem glúten' },
  { key: 'vegetarian', label: 'Vegetariano' },
  { key: 'vegan', label: 'Vegano' },
  { key: 'pescatarian', label: 'Pescetariano' },
  { key: 'low_carb', label: 'Low carb' },
  { key: 'keto', label: 'Cetogênica' },
  { key: 'low_sodium', label: 'Pouco sódio' },
  { key: 'no_pork', label: 'Sem carne de porco' },
  { key: 'no_red_meat', label: 'Sem carne vermelha' },
  { key: 'no_seafood', label: 'Sem frutos do mar' },
  { key: 'no_eggs', label: 'Sem ovos' },
  { key: 'no_nuts', label: 'Sem oleaginosas' },
  { key: 'diabetic', label: 'Diabético' },
];

export function useFoodPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['food-preferences', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<FoodPreferences | null> => {
      const { data, error } = await supabase
        .from('food_preferences' as any)
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return (data as unknown as FoodPreferences) || null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: {
      restrictions: string[];
      disliked_foods: string[];
      favorite_foods: string[];
      notes: string | null;
    }) => {
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('food_preferences' as any)
        .upsert(
          {
            user_id: user.id,
            ...input,
          },
          { onConflict: 'user_id' },
        )
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FoodPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-preferences', user?.id] });
      toast.success('Preferências salvas');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, upsert };
}

/** Builds a short human-readable string for AI prompts. */
export function buildFoodPreferencesContext(prefs: FoodPreferences | null | undefined): string {
  if (!prefs) return '';
  const parts: string[] = [];
  if (prefs.restrictions?.length) {
    const labels = prefs.restrictions
      .map((k) => COMMON_RESTRICTIONS.find((r) => r.key === k)?.label || k)
      .join(', ');
    parts.push(`Restrições alimentares: ${labels}.`);
  }
  if (prefs.disliked_foods?.length) {
    parts.push(`Não gosta de / evitar: ${prefs.disliked_foods.join(', ')}.`);
  }
  if (prefs.favorite_foods?.length) {
    parts.push(`Gosta especialmente de: ${prefs.favorite_foods.join(', ')}.`);
  }
  if (prefs.notes && prefs.notes.trim().length > 0) {
    parts.push(`Observações: ${prefs.notes.trim()}.`);
  }
  if (parts.length === 0) return '';
  return `\n=== Preferências alimentares do usuário ===\n${parts.join('\n')}\nRespeite essas preferências em todas as sugestões de cardápio. NUNCA inclua alimentos das restrições ou da lista de "evitar".`;
}
