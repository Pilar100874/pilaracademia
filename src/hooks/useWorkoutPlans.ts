import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface WorkoutExercise {
  id: string;
  workout_plan_id: string;
  name: string;
  image_url: string | null;
  image_urls: string[];
  sets: number;
  reps: number;
  order_index: number;
  video_type: 'youtube' | 'upload' | 'instagram' | null;
  video_url: string | null;
  video_start_seconds: number | null;
  video_end_seconds: number | null;
  created_at: string;
  exercise_library_id?: string | null;
  body_analysis?: Record<string, number> | null;
  aesthetic_analysis?: Record<string, number> | null;
  mobility_analysis?: Record<string, number> | null;
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  name: string;
  days_of_week: number[];
  created_at: string;
  updated_at: string;
  exercises?: WorkoutExercise[];
}

type LibraryMediaFields = Partial<Pick<WorkoutExercise,
  'image_urls' | 'video_type' | 'video_url' | 'video_start_seconds' | 'video_end_seconds' |
  'body_analysis' | 'aesthetic_analysis' | 'mobility_analysis'
>>;

type WorkoutExerciseWithLibrary = WorkoutExercise & {
  exercise_library?: LibraryMediaFields | null;
};

export function useWorkoutPlans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: workoutPlans = [], isLoading } = useQuery({
    queryKey: ['workout-plans', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: plans, error: plansError } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;

      // Fetch exercises for each plan + analyses from exercise_library
      const plansWithExercises = await Promise.all(
        (plans || []).map(async (plan) => {
          const { data: exercises } = await supabase
            .from('workout_exercises')
            .select('*, exercise_library:exercise_library_id (image_urls, video_type, video_url, video_start_seconds, video_end_seconds, body_analysis, aesthetic_analysis, mobility_analysis)')
            .eq('workout_plan_id', plan.id)
            .order('order_index', { ascending: true });

          const merged = ((exercises || []) as WorkoutExerciseWithLibrary[]).map((ex) => {
            const library = ex.exercise_library;
            const libraryImages = Array.isArray(library?.image_urls) ? library.image_urls : [];
            const exerciseImages = Array.isArray(ex.image_urls) ? ex.image_urls : [];
            const image_urls = libraryImages.length ? libraryImages : exerciseImages;

            return {
              ...ex,
              image_urls,
              image_url: image_urls[0] ?? ex.image_url ?? null,
              video_type: library?.video_type ?? ex.video_type ?? null,
              video_url: library?.video_url ?? ex.video_url ?? null,
              video_start_seconds: library?.video_start_seconds ?? ex.video_start_seconds ?? null,
              video_end_seconds: library?.video_end_seconds ?? ex.video_end_seconds ?? null,
              body_analysis: library?.body_analysis ?? null,
              aesthetic_analysis: library?.aesthetic_analysis ?? null,
              mobility_analysis: library?.mobility_analysis ?? null,
            };
          });

          return {
            ...plan,
            exercises: merged,
          };
        })
      );

      return plansWithExercises as WorkoutPlan[];
    },
    enabled: !!user,
  });

  const createPlan = useMutation({
    mutationFn: async (data: { name: string; days_of_week: number[] }) => {
      if (!user) throw new Error('User not authenticated');

      const { data: plan, error } = await supabase
        .from('workout_plans')
        .insert({
          user_id: user.id,
          name: data.name,
          days_of_week: data.days_of_week,
        })
        .select()
        .single();

      if (error) throw error;
      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      toast.success('Treino criado!');
    },
    onError: () => {
      toast.error('Erro ao criar treino');
    },
  });

  const updatePlan = useMutation({
    mutationFn: async (data: { id: string; name: string; days_of_week: number[] }) => {
      const { error } = await supabase
        .from('workout_plans')
        .update({
          name: data.name,
          days_of_week: data.days_of_week,
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      toast.success('Treino atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar treino');
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      toast.success('Treino excluído!');
    },
    onError: () => {
      toast.error('Erro ao excluir treino');
    },
  });

  const addExercise = useMutation({
    mutationFn: async (data: {
      workout_plan_id: string;
      name: string;
      image_urls?: string[];
      sets: number;
      reps: number;
      order_index: number;
      video_type?: 'youtube' | 'upload' | 'instagram' | null;
      video_url?: string | null;
      video_start_seconds?: number | null;
      video_end_seconds?: number | null;
      exercise_library_id?: string | null;
    }) => {
      const { data: exercise, error } = await supabase
        .from('workout_exercises')
        .insert({
          ...data,
          image_url: data.image_urls?.[0] || null, // Keep backward compatibility
        })
        .select()
        .single();

      if (error) throw error;
      return exercise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      toast.success('Exercício adicionado!');
    },
    onError: () => {
      toast.error('Erro ao adicionar exercício');
    },
  });

  const updateExercise = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      image_urls?: string[];
      sets?: number;
      reps?: number;
      order_index?: number;
      video_type?: 'youtube' | 'upload' | 'instagram' | null;
      video_url?: string | null;
      video_start_seconds?: number | null;
      video_end_seconds?: number | null;
    }) => {
      const { id, image_urls, ...rest } = data;
      const updateData: Record<string, unknown> = { ...rest };
      
      if (image_urls !== undefined) {
        updateData.image_urls = image_urls;
        updateData.image_url = image_urls[0] || null; // Keep backward compatibility
      }
      
      const { error } = await supabase
        .from('workout_exercises')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar exercício');
    },
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      toast.success('Exercício removido!');
    },
    onError: () => {
      toast.error('Erro ao remover exercício');
    },
  });

  const reorderExercises = useMutation({
    mutationFn: async (exercises: { id: string; order_index: number }[]) => {
      const updates = exercises.map((ex) =>
        supabase
          .from('workout_exercises')
          .update({ order_index: ex.order_index })
          .eq('id', ex.id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
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
    workoutPlans,
    isLoading,
    createPlan,
    updatePlan,
    deletePlan,
    addExercise,
    updateExercise,
    deleteExercise,
    reorderExercises,
    uploadExerciseImage,
  };
}
