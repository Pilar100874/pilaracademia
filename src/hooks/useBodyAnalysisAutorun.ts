import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { LibraryExercise } from './useExerciseLibrary';
import { useAuth } from './useAuth';

const FAILED_KEY = 'pilar:body-analysis-failed';

const readFailed = (): Set<string> => {
  try {
    const raw = sessionStorage.getItem(FAILED_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const addFailed = (id: string) => {
  try {
    const set = readFailed();
    set.add(id);
    sessionStorage.setItem(FAILED_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
};

export interface AnalyzeProgress {
  done: number;
  total: number;
  current?: string;
}

/**
 * Auto-analisa em background os exercícios que ainda não têm `body_analyzed_at`
 * e possuem um vídeo. Usa a edge function `analyze-exercise-video` (Gemini).
 * Roda apenas com a aba visível, um por vez, e marca falhas em sessionStorage
 * para não tentar de novo em loop.
 */
export function useBodyAnalysisAutorun(exercises: LibraryExercise[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<AnalyzeProgress | null>(null);

  useEffect(() => {
    if (!user) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    let cancelled = false;
    const failed = readFailed();

    const queue = exercises.filter(
      (ex) =>
        (!ex.body_analyzed_at || !ex.mobility_analysis) &&
        !!ex.video_url &&
        !!ex.video_type &&
        ex.video_type !== 'instagram' && // Instagram embed: sem URL pública direta
        !failed.has(ex.id)
    );

    if (queue.length === 0) {
      setProgress(null);
      return;
    }

    setProgress({ done: 0, total: queue.length });

    const run = async () => {
      let done = 0;
      for (const ex of queue) {
        if (cancelled) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        setProgress({ done, total: queue.length, current: ex.name });
        try {
          const { data, error } = await supabase.functions.invoke('analyze-exercise-video', {
            body: {
              videoUrl: ex.video_url,
              exerciseName: ex.name,
              categories: ex.category_ids,
            },
          });
          if (error) throw error;
          if (!data?.body_analysis || !data?.aesthetic_analysis || !data?.mobility_analysis) {
            throw new Error('resposta inválida');
          }
          const analyzedAt = new Date().toISOString();
          const { error: updErr } = await supabase
            .from('exercise_library')
            .update({
              body_analysis: data.body_analysis,
              aesthetic_analysis: data.aesthetic_analysis,
              mobility_analysis: data.mobility_analysis,
              body_analyzed_at: analyzedAt,
            } as never)
            .eq('id', ex.id);
          if (updErr) throw updErr;

          // Atualiza o cache local imediatamente — assim, se o usuário
          // fechar a aba, o progresso já está persistido no banco e no cache.
          queryClient.setQueryData<LibraryExercise[]>(
            ['exercise-library', user.id],
            (old) =>
              old?.map((e) =>
                e.id === ex.id
                  ? {
                      ...e,
                      body_analysis: data.body_analysis,
                      aesthetic_analysis: data.aesthetic_analysis,
                      mobility_analysis: data.mobility_analysis,
                      body_analyzed_at: analyzedAt,
                    }
                  : e
              ) ?? old
          );
        } catch (err) {
          console.warn('Body analysis failed for', ex.id, err);
          addFailed(ex.id);
        }
        done++;
        if (!cancelled) setProgress({ done, total: queue.length });
      }
      if (!cancelled) setProgress(null);
    };

    void run();

    const onVis = () => {
      if (document.hidden) cancelled = true;
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, exercises.map((e) => `${e.id}:${e.body_analyzed_at ?? ''}:${e.video_url ?? ''}`).join('|')]);

  return progress;
}
