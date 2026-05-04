import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { buildFoodPreferencesContext, FoodPreferences } from './useFoodPreferences';
import { buildBloodExamContext } from '@/lib/bloodExamContext';

export interface WeeklyMenuMeal {
  name: string;
  description: string;
  approx_calories?: number;
}

export interface WeeklyMenuDay {
  day: string;
  meals: WeeklyMenuMeal[];
}

export interface ShoppingCategory {
  category: string;
  items: string[];
}

export interface WeeklyMenuData {
  days: WeeklyMenuDay[];
  shopping_list: ShoppingCategory[];
  summary?: string;
}

export interface WeeklyMenuRow {
  id: string;
  user_id: string;
  week_start: string;
  menu: WeeklyMenuData;
  shopping_list: ShoppingCategory[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useWeeklyMenus() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: menus = [], isLoading } = useQuery({
    queryKey: ['weekly-menus', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('weekly_menus' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as WeeklyMenuRow[];
    },
    enabled: !!user,
  });

  const generate = useMutation({
    mutationFn: async (notes?: string) => {
      if (!user) throw new Error('Não autenticado');
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: prefsRow } = await supabase
        .from('food_preferences' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const food_preferences_context = buildFoodPreferencesContext(
        prefsRow as unknown as FoodPreferences | null,
      ) || undefined;

      // Busca exame de sangue mais recente para personalizar cardápio
      const { data: bloodExams } = await supabase
        .from('blood_exams')
        .select('*')
        .eq('user_id', user.id)
        .order('collected_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1);
      const blood_exam_context =
        buildBloodExamContext((bloodExams as any) || []) || undefined;

      const { data, error } = await supabase.functions.invoke('generate-weekly-menu', {
        body: { profile: profileRow, notes, food_preferences_context, blood_exam_context },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday

      const { data: inserted, error: insertError } = await supabase
        .from('weekly_menus' as any)
        .insert({
          user_id: user.id,
          week_start: weekStart.toISOString().slice(0, 10),
          menu: data,
          shopping_list: data.shopping_list || [],
          notes: notes || null,
        } as any)
        .select()
        .single();
      if (insertError) throw insertError;
      return inserted;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-menus'] });
      toast.success('Cardápio gerado!');
    },
    onError: (e: any) => {
      toast.error(e?.message || 'Erro ao gerar cardápio');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('weekly_menus' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-menus'] });
      toast.success('Cardápio removido');
    },
  });

  return { menus, isLoading, generate, remove };
}
