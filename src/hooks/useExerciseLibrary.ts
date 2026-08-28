import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useIsMaster } from './useIsMaster';
import { toast } from 'sonner';
import type { BodyAnalysis, AestheticAnalysis, MobilityAnalysis } from '@/lib/exerciseAnalysis';

export interface LibraryExercise {
  id: string;
  user_id: string;
  name: string;
  image_urls: string[];
  default_sets: number;
  default_reps: number;
  video_type: 'youtube' | 'upload' | 'instagram' | null;
  video_url: string | null;
  video_optimized_at: string | null;
  video_hash: string | null;
  video_start_seconds: number | null;
  video_end_seconds: number | null;
  /** True when this exercise belongs to the shared global library (managed by master). */
  is_global: boolean;
  /** True when this exercise came from the global GIF library. */
  is_gif: boolean;
  /** @deprecated Use category_ids — mantido por compatibilidade com código antigo */
  category_id: string | null;
  /** Todas as categorias atribuídas ao exercício (multi). */
  category_ids: string[];
  /** Equipamentos extras (bola, halter, elástico…) atribuídos ao exercício. */
  extra_ids: string[];
  body_analysis: BodyAnalysis | null;
  aesthetic_analysis: AestheticAnalysis | null;
  mobility_analysis: MobilityAnalysis | null;
  body_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Loads the user's personal exercise library + the shared **global** library.
 * - `exercises` = personal items (own user_id, not global)
 * - `globalExercises` = global items visible to everyone (managed by master)
 * - Master users (pilar@pilar.com.br) can create/edit/delete in either,
 *   regular users can only manage their personal items.
 */
export function useExerciseLibrary() {
  const { user } = useAuth();
  const { isMaster } = useIsMaster();
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['exercise-library', user?.id],
    queryFn: async () => {
      if (!user) return [] as LibraryExercise[];

      // Bring back personal + global in a single round-trip; junction links separately.
      // Supabase has a default limit of 1000 rows per query, so we paginate
      // through all three sources to make sure the full library is loaded.
      const PAGE = 1000;
      async function fetchAll<T>(
        build: (from: number, to: number) => any,
      ): Promise<T[]> {
        const all: T[] = [];
        for (let from = 0; ; from += PAGE) {
          const to = from + PAGE - 1;
          const { data, error } = await build(from, to);
          if (error) throw error;
          const batch = (data ?? []) as T[];
          all.push(...batch);
          if (batch.length < PAGE) break;
        }
        return all;
      }

      const [exData, linkData, extraData] = await Promise.all([
        fetchAll<any>((from, to) =>
          supabase
            .from('exercise_library')
            .select('*')
            .or(`user_id.eq.${user.id},is_global.eq.true`)
            .order('name', { ascending: true })
            .range(from, to),
        ),
        fetchAll<{ exercise_id: string; category_id: string }>((from, to) =>
          supabase
            .from('exercise_library_categories')
            .select('exercise_id, category_id')
            .order('exercise_id', { ascending: true })
            .order('category_id', { ascending: true })
            .range(from, to),
        ),
        fetchAll<{ exercise_id: string; extra_id: string }>((from, to) =>
          supabase
            .from('exercise_library_extras')
            .select('exercise_id, extra_id')
            .order('exercise_id', { ascending: true })
            .order('extra_id', { ascending: true })
            .range(from, to),
        ),

      ]);

      const exRes = { data: exData } as any;
      const linkRes = { data: linkData } as any;
      const extraRes = { data: extraData } as any;

      const linksByExercise = new Map<string, string[]>();
      for (const link of linkRes.data ?? []) {
        const arr = linksByExercise.get(link.exercise_id) ?? [];
        arr.push(link.category_id);
        linksByExercise.set(link.exercise_id, arr);
      }

      const extrasByExercise = new Map<string, string[]>();
      for (const link of extraRes.data ?? []) {
        const arr = extrasByExercise.get(link.exercise_id) ?? [];
        arr.push(link.extra_id);
        extrasByExercise.set(link.exercise_id, arr);
      }

      return (exRes.data ?? []).map((ex: any) => ({
        ...ex,
        category_ids: linksByExercise.get(ex.id) ?? (ex.category_id ? [ex.category_id] : []),
        extra_ids: extrasByExercise.get(ex.id) ?? [],
      })) as LibraryExercise[];
    },
    enabled: !!user,
  });

  // Split for convenience in the UI
  const exercises = rows.filter((ex) => !ex.is_global || ex.user_id === user?.id);
  const globalExercises = rows.filter((ex) => ex.is_global && !ex.is_gif);
  /** Biblioteca global de GIFs (importados como vídeo). */
  const gifExercises = rows.filter((ex) => ex.is_global && ex.is_gif);
  // Personal-only (excluding own global ones authored by master)
  const personalExercises = rows.filter((ex) => !ex.is_global);

  const createExercise = useMutation({
    mutationFn: async (data: {
      name: string;
      image_urls?: string[];
      default_sets?: number;
      default_reps?: number;
      video_type?: 'youtube' | 'upload' | 'instagram' | null;
      video_url?: string | null;
      video_optimized_at?: string | null;
      video_hash?: string | null;
      video_start_seconds?: number | null;
      video_end_seconds?: number | null;
      category_id?: string | null;
      /** Master-only: create in the shared global library. */
      is_global?: boolean;
      /** Suppress success toast — used during bulk operations. */
      _silent?: boolean;
    }) => {
      if (!user) throw new Error('User not authenticated');
      // Para o usuário master, todas as criações vão para a biblioteca
      // global por padrão — exceto se `is_global: false` for passado
      // explicitamente (ex.: criando um item pessoal de teste).
      const wantsGlobal = isMaster && data.is_global !== false;

      const insertPayload = {
        user_id: user.id,
        name: data.name,
        image_urls: data.image_urls || [],
        default_sets: data.default_sets || 3,
        default_reps: data.default_reps || 12,
        video_type: data.video_type ?? null,
        video_url: data.video_url ?? null,
        video_optimized_at: data.video_optimized_at ?? null,
        video_hash: data.video_hash ?? null,
        video_start_seconds: data.video_start_seconds ?? null,
        video_end_seconds: data.video_end_seconds ?? null,
        category_id: data.category_id ?? null,
        is_global: wantsGlobal,
        clinic_id: null as string | null,
      };

      const { data: exercise, error } = await supabase
        .from('exercise_library')
        .insert(insertPayload as never)
        .select()
        .single();

      if (error) throw error;
      return { ...exercise, category_ids: data.category_id ? [data.category_id] : [], extra_ids: [] } as unknown as LibraryExercise;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
      if (!vars._silent) toast.success('Exercício criado!');
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
      video_optimized_at?: string | null;
      video_start_seconds?: number | null;
      video_end_seconds?: number | null;
      category_id?: string | null;
    }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from('exercise_library')
        .update(updateData as never)
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

      // 1) Remove all current links
      const { error: delErr } = await supabase
        .from('exercise_library_categories')
        .delete()
        .in('exercise_id', data.ids);
      if (delErr) throw delErr;

      // 2) Add a new link if a destination was chosen
      if (data.category_id) {
        const rows = data.ids.map((id) => ({
          exercise_id: id,
          category_id: data.category_id as string,
        }));
        const { error: insErr } = await supabase
          .from('exercise_library_categories')
          .insert(rows);
        if (insErr) throw insErr;
      }

      // 3) Mirror legacy column
      const { error: upErr } = await supabase
        .from('exercise_library')
        .update({ category_id: data.category_id })
        .in('id', data.ids);
      if (upErr) throw upErr;
    },
    onMutate: async (vars) => {
      const queryKey = ['exercise-library', user?.id];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<LibraryExercise[]>(queryKey);
      const idSet = new Set(vars.ids);
      queryClient.setQueryData<LibraryExercise[]>(queryKey, (old = []) =>
        old.map((ex) => {
          if (!idSet.has(ex.id)) return ex;
          const next = vars.category_id ? [vars.category_id] : [];
          return { ...ex, category_ids: next, category_id: vars.category_id };
        })
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['exercise-library', user?.id], ctx.previous);
      }
      toast.error('Erro ao mover exercícios');
    },
    onSuccess: (_d, vars) => {
      toast.success(`${vars.ids.length} exercício(s) movido(s)`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
    },
  });

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

  /**
   * Copies a global exercise to the user's personal library so they can edit
   * it freely without affecting the shared global library. Categories are
   * NOT carried over (categories are scoped per user).
   */
  const copyGlobalToPersonal = useMutation({
    mutationFn: async (globalId: string) => {
      if (!user) throw new Error('User not authenticated');
      const src = rows.find((ex) => ex.id === globalId);
      if (!src) throw new Error('Exercício não encontrado');
      const { data, error } = await supabase
        .from('exercise_library')
        .insert({
          user_id: user.id,
          name: src.name,
          image_urls: src.image_urls ?? [],
          default_sets: src.default_sets,
          default_reps: src.default_reps,
          video_type: src.video_type,
          video_url: src.video_url,
          video_optimized_at: src.video_optimized_at,
          video_start_seconds: src.video_start_seconds,
          video_end_seconds: src.video_end_seconds,
          category_id: null,
          is_global: false,
          clinic_id: null,
        } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
      toast.success('Copiado para sua biblioteca');
    },
    onError: () => toast.error('Erro ao copiar exercício'),
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
    /** Personal items only (matches previous behaviour for legacy callers). */
    exercises: personalExercises,
    /** All visible items (personal + global) — useful for selection dialogs. */
    allExercises: rows,
    /** Read-only: items shared via the global library. */
    globalExercises,
    isLoading,
    isMaster,
    createExercise,
    updateExercise,
    deleteExercise,
    moveExercises,
    toggleExerciseCategory,
    copyGlobalToPersonal,
    uploadExerciseImage,
  };
}
