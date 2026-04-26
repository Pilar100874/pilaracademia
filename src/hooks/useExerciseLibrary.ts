import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useLibraryScope } from './useLibraryScope';
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
  category_id: string | null;
  is_global?: boolean;
  clinic_id?: string | null;
  created_at: string;
  updated_at: string;
}

export function useExerciseLibrary() {
  const { user } = useAuth();
  const scope = useLibraryScope();
  const queryClient = useQueryClient();

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercise-library', user?.id, scope],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase.from('exercise_library').select('*');

      if (scope.kind === 'global') {
        query = query.eq('is_global', true);
      } else if (scope.kind === 'clinic') {
        // Inclui exercícios da clínica + globais (read-only no client, RLS permite)
        query = query.or(`clinic_id.eq.${scope.clinicId},is_global.eq.true`);
      } else {
        // personal: próprios + globais (master library) visíveis read-only
        query = query.or(`user_id.eq.${user.id},is_global.eq.true`);
      }

      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw error;
      return data as LibraryExercise[];
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

      const scopeFields =
        scope.kind === 'global'
          ? { is_global: true, clinic_id: null }
          : scope.kind === 'clinic'
          ? { is_global: false, clinic_id: scope.clinicId }
          : { is_global: false, clinic_id: null };

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
          ...scopeFields,
        })
        .select()
        .single();

      if (error) throw error;
      return exercise as LibraryExercise;
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
    scope,
  };
}
