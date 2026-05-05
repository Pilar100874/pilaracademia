import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useExerciseLibrary, type LibraryExercise } from '@/hooks/useExerciseLibrary';
import { useQueryClient } from '@tanstack/react-query';
import { compressVideoFile } from '@/lib/compressVideo';
import { useBackgroundProgress } from '@/contexts/BackgroundProgressContext';

// Module-level flag — evita execuções concorrentes da mesma fila.
// É liberado ao final de run() para permitir uma nova verificação
// toda vez que o usuário abrir a Biblioteca.
let runnerStarted = false;

const JOB_ID = 'lib-bg-process';
const JOB_LABEL = 'Ajustando resolução e classificando vídeo';

/**
 * Background runner — toda vez que o usuário abre a Biblioteca de
 * Exercícios (/exercises), verifica se há vídeos pendentes de
 * otimização ou análise por IA e processa-os em sequência, mostrando
 * uma BARRA DE PROGRESSO GLOBAL no topo (com porcentagem):
 *
 * 1) Otimização de vídeos legados (MP4 → 720p WebM no navegador)
 * 2) Análise por IA do conteúdo de cada vídeo (Gemini via edge function)
 */
export function LibraryBackgroundRunner() {
  const { user } = useAuth();
  const { exercises } = useExerciseLibrary();
  const queryClient = useQueryClient();
  const { upsert, remove } = useBackgroundProgress();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!user) return;
    if (runnerStarted) return;
    if (!exercises || exercises.length === 0) return;
    // Só dispara quando o usuário entra na Biblioteca
    if (!pathname.startsWith('/exercises')) return;

    // Verificação rápida: existe algo pendente?
    const hasPending =
      exercises.some((ex) => ex.video_type === 'upload' && !!ex.video_url && !ex.video_optimized_at) ||
      exercises.some(
        (ex) =>
          (!ex.body_analyzed_at || !ex.mobility_analysis) &&
          !!ex.video_url &&
          !!ex.video_type &&
          ex.video_type !== 'instagram',
      );
    if (!hasPending) return;

    const cancelled = false;
    // Pequeno delay para não competir com o render inicial.
    const timer = window.setTimeout(() => {
      if (runnerStarted) return;
      runnerStarted = true;
      void run().finally(() => {
        runnerStarted = false;
      });
    }, 1500);


    async function run() {
      // Verificação de permissão p/ análise por IA (definida antes para
      // calcular o total da barra unificada)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'master_admin')
        .is('clinic_id', null)
        .limit(1);
      const isMaster = Array.isArray(roleData) && roleData.length > 0;
      let allowed = isMaster;
      if (!allowed) {
        const { data } = await supabase
          .from('profiles')
          .select('movement_analysis_enabled')
          .eq('user_id', user.id)
          .maybeSingle();
        allowed = (data as { movement_analysis_enabled?: boolean } | null)?.movement_analysis_enabled === true;
      }

      const fresh1 = queryClient.getQueryData<LibraryExercise[]>(['exercise-library', user.id]) ?? exercises;
      const optQueue = fresh1.filter(
        (ex) => ex.video_type === 'upload' && !!ex.video_url && !ex.video_optimized_at,
      );
      const aiQueue = allowed
        ? fresh1.filter(
            (ex) =>
              (!ex.body_analyzed_at || !ex.mobility_analysis) &&
              !!ex.video_url &&
              !!ex.video_type &&
              ex.video_type !== 'instagram',
          )
        : [];

      const total = optQueue.length + aiQueue.length;
      if (total === 0) return;

      let done = 0;
      let saved = 0;
      upsert({ id: JOB_ID, label: JOB_LABEL, done: 0, total });

      // ---------- Etapa 1: Otimização (ajuste de resolução) ----------
      for (const ex of optQueue) {
        if (cancelled) break;
        upsert({ id: JOB_ID, label: JOB_LABEL, done, total, current: ex.name });
        try {
          const url = ex.video_url!;
          const res = await fetch(url);
          if (!res.ok) throw new Error('download failed');
          const blob = await res.blob();
          const origSize = blob.size;
          const inputFile = new File([blob], 'video.mp4', { type: blob.type || 'video/mp4' });
          const compressed = await compressVideoFile(inputFile);
          if (compressed === inputFile || compressed.size >= origSize) {
            const checkedAt = new Date().toISOString();
            await supabase.from('exercise_library').update({ video_optimized_at: checkedAt } as never).eq('id', ex.id);
            queryClient.setQueryData<LibraryExercise[]>(['exercise-library', user.id], (old) =>
              old?.map((e) => (e.id === ex.id ? { ...e, video_optimized_at: checkedAt } : e)) ?? old,
            );
          } else {
            const path = `${user.id}/${Date.now()}-auto.webm`;
            const { error: upErr } = await supabase.storage
              .from('exercise-videos')
              .upload(path, compressed, { contentType: 'video/webm', upsert: false });
            if (upErr) throw upErr;
            const { data: pub } = supabase.storage.from('exercise-videos').getPublicUrl(path);
            const optimizedAt = new Date().toISOString();
            await supabase
              .from('exercise_library')
              .update({ video_url: pub.publicUrl, video_optimized_at: optimizedAt } as never)
              .eq('id', ex.id);
            queryClient.setQueryData<LibraryExercise[]>(['exercise-library', user.id], (old) =>
              old?.map((e) => (e.id === ex.id ? { ...e, video_url: pub.publicUrl, video_optimized_at: optimizedAt } : e)) ?? old,
            );
            saved += origSize - compressed.size;
            try {
              const marker = '/exercise-videos/';
              const idx = url.indexOf(marker);
              if (idx >= 0) {
                const oldPath = url.substring(idx + marker.length).split('?')[0];
                await supabase.storage.from('exercise-videos').remove([oldPath]);
              }
            } catch { /* ignore */ }
          }
        } catch (err) {
          console.warn('[bg] optimize failed', ex.id, err);
        }
        done++;
        upsert({ id: JOB_ID, label: JOB_LABEL, done, total, current: ex.name });
      }

      // ---------- Etapa 2: Classificação por IA ----------
      // Recarrega a fila de IA para refletir possíveis mudanças de video_url
      const fresh2 = queryClient.getQueryData<LibraryExercise[]>(['exercise-library', user.id]) ?? exercises;
      const aiQueueFinal = allowed
        ? aiQueue
            .map((ex) => fresh2.find((e) => e.id === ex.id) ?? ex)
            .filter((ex) => !!ex.video_url && !!ex.video_type && ex.video_type !== 'instagram')
        : [];

      for (const ex of aiQueueFinal) {
        if (cancelled) break;
        upsert({ id: JOB_ID, label: JOB_LABEL, done, total, current: ex.name });
        try {
          const { data, error } = await supabase.functions.invoke('analyze-exercise-video', {
            body: { videoUrl: ex.video_url, exerciseName: ex.name, categories: ex.category_ids },
          });
          if (error) throw error;
          if (data?.fallback) throw new Error(data?.message || 'AI service unavailable');
          if (!data?.body_analysis || !data?.aesthetic_analysis || !data?.mobility_analysis) {
            throw new Error('resposta inválida');
          }
          const analyzedAt = new Date().toISOString();
          await supabase
            .from('exercise_library')
            .update({
              body_analysis: data.body_analysis,
              aesthetic_analysis: data.aesthetic_analysis,
              mobility_analysis: data.mobility_analysis,
              body_analyzed_at: analyzedAt,
            } as never)
            .eq('id', ex.id);
          queryClient.setQueryData<LibraryExercise[]>(['exercise-library', user.id], (old) =>
            old?.map((e) =>
              e.id === ex.id
                ? {
                    ...e,
                    body_analysis: data.body_analysis,
                    aesthetic_analysis: data.aesthetic_analysis,
                    mobility_analysis: data.mobility_analysis,
                    body_analyzed_at: analyzedAt,
                  }
                : e,
            ) ?? old,
          );
        } catch (err) {
          console.warn('[bg] AI analysis failed', ex.id, err);
        }
        done++;
        upsert({ id: JOB_ID, label: JOB_LABEL, done, total, current: ex.name });
      }

      remove(JOB_ID);
      if (!cancelled && done > 0) {
        const mb = saved > 0 ? ` — ${(saved / (1024 * 1024)).toFixed(1)} MB economizados` : '';
        toast.success(`Vídeos processados${mb}`, { duration: 4000 });
      }
    }

    return () => {
      window.clearTimeout(timer);
    };
  }, [user, exercises, queryClient, upsert, remove, pathname]);

  return null;
}
