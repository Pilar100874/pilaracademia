import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ExerciseExtra {
  id: string;
  user_id: string;
  clinic_id: string | null;
  is_global: boolean;
  name: string;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export function useExerciseExtras() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['exercise-extras', user?.id];

  const { data: extras = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user) return [] as ExerciseExtra[];
      const { data, error } = await supabase
        .from('exercise_extras')
        .select('*')
        .or(`user_id.eq.${user.id},is_global.eq.true`)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ExerciseExtra[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const createExtra = useMutation({
    mutationFn: async (input: { name: string; icon?: string | null }) => {
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('exercise_extras')
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          icon: input.icon ?? null,
          is_global: false,
          clinic_id: null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ExerciseExtra;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Equipamento criado!');
    },
    onError: (e: any) => {
      if (e?.code === '23505') toast.error('Equipamento já existe');
      else toast.error('Erro ao criar equipamento');
    },
  });

  const updateExtra = useMutation({
    mutationFn: async (vars: { id: string; name?: string; icon?: string | null }) => {
      const update: Record<string, any> = {};
      if (vars.name !== undefined) update.name = vars.name.trim();
      if (vars.icon !== undefined) update.icon = vars.icon;
      const { error } = await supabase
        .from('exercise_extras')
        .update(update)
        .eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Equipamento atualizado');
    },
    onError: () => toast.error('Erro ao atualizar equipamento'),
  });

  const deleteExtra = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercise_extras').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
      toast.success('Equipamento excluído');
    },
    onError: () => toast.error('Erro ao excluir equipamento'),
  });

  /** Toggle a single extra on a single exercise (optimistic on library cache). */
  const toggleExerciseExtra = useMutation({
    mutationFn: async (vars: { exerciseId: string; extraId: string; checked: boolean }) => {
      if (vars.checked) {
        const { error } = await supabase
          .from('exercise_library_extras')
          .insert({ exercise_id: vars.exerciseId, extra_id: vars.extraId });
        if (error && (error as any).code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('exercise_library_extras')
          .delete()
          .eq('exercise_id', vars.exerciseId)
          .eq('extra_id', vars.extraId);
        if (error) throw error;
      }
    },
    onMutate: async (vars) => {
      const libKey = ['exercise-library', user?.id];
      await queryClient.cancelQueries({ queryKey: libKey });
      const previous = queryClient.getQueryData<any[]>(libKey);
      queryClient.setQueryData<any[]>(libKey, (old = []) =>
        old.map((ex) => {
          if (ex.id !== vars.exerciseId) return ex;
          const set = new Set<string>(ex.extra_ids ?? []);
          if (vars.checked) set.add(vars.extraId);
          else set.delete(vars.extraId);
          return { ...ex, extra_ids: [...set] };
        })
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['exercise-library', user?.id], ctx.previous);
      toast.error('Erro ao atualizar equipamento');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-library', user?.id] });
    },
  });

  /** Apply an extra to many exercises at once. */
  const bulkAssignExtra = useMutation({
    mutationFn: async (vars: { extraId: string; exerciseIds: string[]; mode: 'add' | 'remove'; silent?: boolean }) => {
      if (!vars.exerciseIds.length) return;
      if (vars.mode === 'add') {
        // Idempotent: ignore conflicts
        const rows = vars.exerciseIds.map((id) => ({ exercise_id: id, extra_id: vars.extraId }));
        const { error } = await supabase
          .from('exercise_library_extras')
          .upsert(rows, { onConflict: 'exercise_id,extra_id', ignoreDuplicates: true });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('exercise_library_extras')
          .delete()
          .eq('extra_id', vars.extraId)
          .in('exercise_id', vars.exerciseIds);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
      if (vars.silent) return;
      toast.success(
        vars.mode === 'add'
          ? `Equipamento adicionado a ${vars.exerciseIds.length} exercício(s)`
          : `Equipamento removido de ${vars.exerciseIds.length} exercício(s)`
      );
    },
    onError: (err) => {
      console.error('[bulkAssignExtra] failed', err);
      toast.error('Erro ao aplicar equipamento');
    },
  });

  return {
    extras,
    isLoading,
    createExtra,
    updateExtra,
    deleteExtra,
    toggleExerciseExtra,
    bulkAssignExtra,
  };
}
