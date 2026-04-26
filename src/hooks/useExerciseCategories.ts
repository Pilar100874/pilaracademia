import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useLibraryScope } from './useLibraryScope';
import { toast } from 'sonner';

export interface ExerciseCategory {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  is_global?: boolean;
  clinic_id?: string | null;
  created_at: string;
  updated_at: string;
}

export function useExerciseCategories() {
  const { user } = useAuth();
  const scope = useLibraryScope();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['exercise-categories', user?.id, scope],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase.from('exercise_categories').select('*');
      if (scope.kind === 'global') {
        query = query.eq('is_global', true);
      } else if (scope.kind === 'clinic') {
        query = query.or(`clinic_id.eq.${scope.clinicId},is_global.eq.true`);
      } else {
        query = query.or(`user_id.eq.${user.id},is_global.eq.true`);
      }
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw error;
      return data as ExerciseCategory[];
    },
    enabled: !!user,
  });

  const createCategory = useMutation({
    mutationFn: async (input: string | { name: string; parent_id?: string | null }) => {
      if (!user) throw new Error('User not authenticated');
      const payload = typeof input === 'string'
        ? { name: input.trim(), parent_id: null }
        : { name: input.name.trim(), parent_id: input.parent_id ?? null };

      const scopeFields =
        scope.kind === 'global'
          ? { is_global: true, clinic_id: null }
          : scope.kind === 'clinic'
          ? { is_global: false, clinic_id: scope.clinicId }
          : { is_global: false, clinic_id: null };

      const { data, error } = await supabase
        .from('exercise_categories')
        .insert({ user_id: user.id, ...payload, ...scopeFields })
        .select()
        .single();
      if (error) throw error;
      return data as ExerciseCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-categories'] });
      toast.success('Categoria criada!');
    },
    onError: (e: any) => {
      if (e?.code === '23505') toast.error('Categoria já existe');
      else toast.error('Erro ao criar categoria');
    },
  });

  const updateCategory = useMutation({
    mutationFn: async (data: { id: string; name?: string; parent_id?: string | null }) => {
      const update: Record<string, any> = {};
      if (data.name !== undefined) update.name = data.name.trim();
      if (data.parent_id !== undefined) update.parent_id = data.parent_id;
      const { error } = await supabase
        .from('exercise_categories')
        .update(update)
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-categories'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
      toast.success('Categoria atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar categoria'),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exercise_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-categories'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
      toast.success('Categoria excluída!');
    },
    onError: () => toast.error('Erro ao excluir categoria'),
  });

  return { categories, isLoading, createCategory, updateCategory, deleteCategory };
}
