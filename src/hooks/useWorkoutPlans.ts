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
  created_at: string;
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

      // Fetch exercises for each plan
      const plansWithExercises = await Promise.all(
        (plans || []).map(async (plan) => {
          const { data: exercises } = await supabase
            .from('workout_exercises')
            .select('*')
            .eq('workout_plan_id', plan.id)
            .order('order_index', { ascending: true });

          return {
            ...plan,
            exercises: exercises || [],
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
