import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface LibraryExercise {
  id: string;
  user_id: string;
  name: string;
  image_urls: string[];
  default_sets: number;
  default_reps: number;
  video_type: 'youtube' | 'upload' | 'instagram' | null;
  video_url: string | null;
  video_start_seconds: number | null;
  video_end_seconds: number | null;
  /** @deprecated Use category_ids — mantido por compatibilidade com código antigo */
  category_id: string | null;
  /** Todas as categorias atribuídas ao exercício (multi). */
  category_ids: string[];
  created_at: string;
  updated_at: string;
}

export function useExerciseLibrary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercise-library', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch exercises and their category links in parallel
      const [exRes, linkRes] = await Promise.all([
        supabase
          .from('exercise_library')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true }),
        supabase
          .from('exercise_library_categories')
          .select('exercise_id, category_id'),
      ]);

      if (exRes.error) throw exRes.error;
      if (linkRes.error) throw linkRes.error;

      const linksByExercise = new Map<string, string[]>();
      for (const link of linkRes.data ?? []) {
        const arr = linksByExercise.get(link.exercise_id) ?? [];
        arr.push(link.category_id);
        linksByExercise.set(link.exercise_id, arr);
      }

      const rows = (exRes.data ?? []).map((ex: any) => ({
        ...ex,
        category_ids: linksByExercise.get(ex.id) ?? (ex.category_id ? [ex.category_id] : []),
      })) as LibraryExercise[];

      return rows;
    },
    enabled: !!user,
  });

  const createExercise = useMutation({
    mutationFn: async (data: {
      name: string;
      image_urls?: string[];
      default_sets?: number;
      default_reps?: number;
      video_type?: 'youtube' | 'upload' | 'instagram' | null;
      video_url?: string | null;
      video_start_seconds?: number | null;
      video_end_seconds?: number | null;
      category_id?: string | null;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data: exercise, error } = await supabase
        .from('exercise_library')
        .insert({
          user_id: user.id,
          name: data.name,
          image_urls: data.image_urls || [],
          default_sets: data.default_sets || 3,
          default_reps: data.default_reps || 12,
          video_type: data.video_type ?? null,
          video_url: data.video_url ?? null,
          video_start_seconds: data.video_start_seconds ?? null,
          video_end_seconds: data.video_end_seconds ?? null,
          category_id: data.category_id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...exercise, category_ids: data.category_id ? [data.category_id] : [] } as LibraryExercise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
      toast.success('Exercício criado!');
    },
    onError: () => {
      toast.error('Erro ao criar exercício');
    },
  });

  const updateExercise = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      image_urls?: string[];
      default_sets?: number;
      default_reps?: number;
      video_type?: 'youtube' | 'upload' | 'instagram' | null;
      video_url?: string | null;
      video_start_seconds?: number | null;
      video_end_seconds?: number | null;
      category_id?: string | null;
    }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from('exercise_library')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
      toast.success('Exercício atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar exercício');
    },
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exercise_library')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
      toast.success('Exercício excluído!');
    },
    onError: () => {
      toast.error('Erro ao excluir exercício');
    },
  });

  const moveExercises = useMutation({
    mutationFn: async (data: { ids: string[]; category_id: string | null }) => {
      if (!data.ids.length) return;
      const { error } = await supabase
        .from('exercise_library')
        .update({ category_id: data.category_id })
        .in('id', data.ids);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
      toast.success(`${vars.ids.length} exercício(s) movido(s)`);
    },
    onError: () => toast.error('Erro ao mover exercícios'),
  });

  /**
   * Toggles a single category for an exercise (multi-category support).
   * If the link exists, removes it; otherwise creates it. Optimistically
   * updates the cache so the UI feels instant in the full-screen picker.
   */
  const toggleExerciseCategory = useMutation({
    mutationFn: async (vars: { exerciseId: string; categoryId: string; checked: boolean }) => {
      if (vars.checked) {
        const { error } = await supabase
          .from('exercise_library_categories')
          .insert({ exercise_id: vars.exerciseId, category_id: vars.categoryId });
        if (error && (error as any).code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('exercise_library_categories')
          .delete()
          .eq('exercise_id', vars.exerciseId)
          .eq('category_id', vars.categoryId);
        if (error) throw error;
      }
    },
    onMutate: async (vars) => {
      const queryKey = ['exercise-library', user?.id];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<LibraryExercise[]>(queryKey);
      queryClient.setQueryData<LibraryExercise[]>(queryKey, (old = []) =>
        old.map((ex) => {
          if (ex.id !== vars.exerciseId) return ex;
          const set = new Set(ex.category_ids);
          if (vars.checked) set.add(vars.categoryId);
          else set.delete(vars.categoryId);
          const next = [...set];
          return { ...ex, category_ids: next, category_id: next[0] ?? null };
        })
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['exercise-library', user?.id], ctx.previous);
      }
      toast.error('Erro ao atualizar categoria');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-library', user?.id] });
    },
  });

  const uploadExerciseImage = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('workout-images')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('workout-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  return {
    exercises,
    isLoading,
    createExercise,
    updateExercise,
    deleteExercise,
    moveExercises,
    uploadExerciseImage,
  };
}
