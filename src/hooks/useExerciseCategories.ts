import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ExerciseCategory {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  is_global?: boolean;
  /** Aparece como "estilo de treino" no assistente guiado. */
  is_style?: boolean;
  /** Categoria pertencente à biblioteca Global Gif. */
  is_gif?: boolean;
  created_at: string;
  updated_at: string;
}

export function useExerciseCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['exercise-categories', user?.id];

  const { data: categories = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user) return [];
      // Inclui categorias do usuário + categorias globais (visíveis a todos)
      const { data, error } = await supabase
        .from('exercise_categories')
        .select('*')
        .or(`user_id.eq.${user.id},is_global.eq.true`)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as ExerciseCategory[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const createCategory = useMutation({
    mutationFn: async (input: string | { name: string; parent_id?: string | null; is_global?: boolean; is_gif?: boolean }) => {
      if (!user) throw new Error('User not authenticated');
      const payload = typeof input === 'string'
        ? { name: input.trim(), parent_id: null, is_global: false, is_gif: false }
        : {
            name: input.name.trim(),
            parent_id: input.parent_id ?? null,
            is_global: !!input.is_global,
            is_gif: !!input.is_gif,
          };
      const { data, error } = await supabase
        .from('exercise_categories')
        .insert({ user_id: user.id, ...payload })
        .select()
        .single();
      if (error) throw error;
      return data as ExerciseCategory;
    },
    // Optimistic update: insere localmente para UI responder na hora
    onMutate: async (input) => {
      if (!user) return;
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ExerciseCategory[]>(queryKey);
      const payload = typeof input === 'string'
        ? { name: input.trim(), parent_id: null, is_gif: false }
        : { name: input.name.trim(), parent_id: input.parent_id ?? null, is_gif: !!input.is_gif };
      const tempId = `temp-${Date.now()}`;
      const optimistic: ExerciseCategory = {
        id: tempId,
        user_id: user.id,
        name: payload.name,
        parent_id: payload.parent_id,
        is_gif: payload.is_gif,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      queryClient.setQueryData<ExerciseCategory[]>(queryKey, (old = []) =>
        [...old, optimistic].sort((a, b) => a.name.localeCompare(b.name))
      );
      return { previous, tempId };
    },
    onSuccess: (created, _vars, context) => {
      // Substitui o item temporário pelo real sem refetch
      queryClient.setQueryData<ExerciseCategory[]>(queryKey, (old = []) => {
        const filtered = old.filter((c) => c.id !== context?.tempId);
        return [...filtered, created].sort((a, b) => a.name.localeCompare(b.name));
      });
      toast.success('Categoria criada!');
    },
    onError: (e: any, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      if (e?.code === '23505') toast.error('Categoria já existe');
      else toast.error('Erro ao criar categoria');
    },
  });

  const updateCategory = useMutation({
    mutationFn: async (data: { id: string; name?: string; parent_id?: string | null; is_global?: boolean; is_style?: boolean }) => {
      const update: Record<string, any> = {};
      if (data.name !== undefined) update.name = data.name.trim();
      if (data.parent_id !== undefined) update.parent_id = data.parent_id;
      if (data.is_global !== undefined) update.is_global = data.is_global;
      if (data.is_style !== undefined) update.is_style = data.is_style;
      const { error } = await supabase
        .from('exercise_categories')
        .update(update)
        .eq('id', data.id);
      if (error) throw error;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ExerciseCategory[]>(queryKey);
      queryClient.setQueryData<ExerciseCategory[]>(queryKey, (old = []) =>
        old.map((c) =>
          c.id === data.id
            ? {
                ...c,
                ...(data.name !== undefined ? { name: data.name.trim() } : {}),
                ...(data.parent_id !== undefined ? { parent_id: data.parent_id } : {}),
                updated_at: new Date().toISOString(),
              }
            : c
        ).sort((a, b) => a.name.localeCompare(b.name))
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success('Categoria atualizada!');
    },
    onError: (_e, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error('Erro ao atualizar categoria');
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exercise_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ExerciseCategory[]>(queryKey);
      queryClient.setQueryData<ExerciseCategory[]>(queryKey, (old = []) =>
        old.filter((c) => c.id !== id)
      );
      return { previous };
    },
    onSuccess: () => {
      // Exercícios podem ter ficado sem categoria — invalida em background
      queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
      toast.success('Categoria excluída!');
    },
    onError: (_e, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error('Erro ao excluir categoria');
    },
  });

  return { categories, isLoading, createCategory, updateCategory, deleteCategory };
}
