import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { LibraryExercise } from './useExerciseLibrary';
import { useAuth } from './useAuth';

const FAILED_KEY = 'pilar:body-analysis-failed';
const FAILED_TTL_MS = 10 * 60 * 1000; // 10 min — depois disso tenta de novo

type FailedMap = Record<string, number>;

const readFailedMap = (): FailedMap => {
  try {
    const raw = sessionStorage.getItem(FAILED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Compatibilidade com formato antigo (array)
    if (Array.isArray(parsed)) return {};
    return parsed as FailedMap;
  } catch {
    return {};
  }
};

const readFailed = (): Set<string> => {
  const map = readFailedMap();
  const now = Date.now();
  const valid = new Set<string>();
  for (const [id, ts] of Object.entries(map)) {
    if (now - ts < FAILED_TTL_MS) valid.add(id);
  }
  return valid;
};

const addFailed = (id: string) => {
  try {
    const map = readFailedMap();
    map[id] = Date.now();
    sessionStorage.setItem(FAILED_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
};

export const clearBodyAnalysisFailedCache = () => {
  try {
    sessionStorage.removeItem(FAILED_KEY);
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
        ex.video_type !== 'instagram' &&
        !failed.has(ex.id)
    );

    if (queue.length === 0) {
      setProgress(null);
      return;
    }

    // Gate: only run if the master admin enabled this feature for the user.
    // Master admins bypass the gate.
    const checkPermission = async () => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'master_admin')
        .is('clinic_id', null)
        .limit(1);
      if (Array.isArray(roleData) && roleData.length > 0) return true;

      const { data, error } = await supabase
        .from('profiles')
        .select('movement_analysis_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return false;
      return (data as { movement_analysis_enabled?: boolean } | null)?.movement_analysis_enabled === true;
    };

    setProgress({ done: 0, total: queue.length });

    const run = async () => {
      const allowed = await checkPermission();
      if (!allowed) {
        if (!cancelled) setProgress(null);
        return;
      }
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
          if (data?.fallback) {
            // AI gateway indisponível (5xx). Marca como falha "soft" para
            // não tentar de novo nesta sessão e segue para o próximo.
            throw new Error(data?.message || 'AI service unavailable');
          }
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

    // Atrasa o início para não competir com o render inicial da tela
    // (lista, vídeos, scroll). No celular isso evita travamentos e crashes
    // por OOM enquanto o usuário ainda está interagindo.
    const startTimer = window.setTimeout(() => {
      if (!cancelled) void run();
    }, 4000);

    const onVis = () => {
      if (document.hidden) cancelled = true;
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, exercises.map((e) => `${e.id}:${e.body_analyzed_at ?? ''}:${e.mobility_analysis ? '1' : '0'}:${e.video_url ?? ''}`).join('|')]);

  return progress;
}
