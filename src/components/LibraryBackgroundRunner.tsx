import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useExerciseLibrary, type LibraryExercise } from '@/hooks/useExerciseLibrary';
import { useQueryClient } from '@tanstack/react-query';
import { compressVideoFile } from '@/lib/compressVideo';

// Module-level flag — sobrevive a remontagens do StrictMode em dev
// e garante que a rotina rode **uma única vez por sessão**.
let runnerStarted = false;

/**
 * Global background runner — corre em qualquer rota assim que o usuário
 * está logado. Processa duas filas em sequência, mostrando um toast
 * persistente com progresso (estilo bioimpedância/exames):
 *
 * 1) Otimização de vídeos legados (MP4 → 720p WebM no navegador)
 * 2) Análise por IA do conteúdo de cada vídeo (Gemini via edge function)
 *
 * Roda apenas uma vez por sessão, em série (1 por vez), respeita visibilidade
 * da aba e a flag `profiles.movement_analysis_enabled`.
 */
export function LibraryBackgroundRunner() {
  const { user } = useAuth();
  const { exercises } = useExerciseLibrary();
  const queryClient = useQueryClient();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (startedRef.current) return;
    if (!exercises || exercises.length === 0) return;
    startedRef.current = true;

    let cancelled = false;
    const onVis = () => { if (document.hidden) cancelled = true; };
    document.addEventListener('visibilitychange', onVis);

    // Pequeno delay para não competir com o render inicial.
    const timer = window.setTimeout(() => { void run(); }, 4000);

    async function run() {
      // ---------- Etapa 1: Otimização de vídeos ----------
      const fresh1 = queryClient.getQueryData<LibraryExercise[]>(['exercise-library', user.id]) ?? exercises;
      const optQueue = fresh1.filter(
        (ex) => ex.video_type === 'upload' && !!ex.video_url && !ex.video_optimized_at,
      );

      if (optQueue.length > 0) {
        const toastId = toast.loading(`Otimizando vídeos — 0/${optQueue.length}`, {
          description: 'Reduzindo tamanho para carregar mais rápido.',
          duration: Infinity,
        });
        let done = 0;
        let saved = 0;
        for (const ex of optQueue) {
          if (cancelled) break;
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
          const pct = Math.round((done / optQueue.length) * 100);
          toast.loading(`Otimizando vídeos — ${done}/${optQueue.length} (${pct}%)`, {
            id: toastId,
            description: ex.name,
            duration: Infinity,
          });
        }
        if (cancelled) {
          toast.dismiss(toastId);
        } else {
          const mb = saved > 0 ? ` — ${(saved / (1024 * 1024)).toFixed(1)} MB economizados` : '';
          toast.success(`Otimização de vídeos concluída${mb}`, { id: toastId, duration: 5000 });
        }
      }

      if (cancelled) return;

      // ---------- Etapa 2: Análise por IA ----------
      // Permissão: master admin OU profiles.movement_analysis_enabled = true
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
      if (!allowed) return;

      const fresh2 = queryClient.getQueryData<LibraryExercise[]>(['exercise-library', user.id]) ?? exercises;
      const aiQueue = fresh2.filter(
        (ex) =>
          (!ex.body_analyzed_at || !ex.mobility_analysis) &&
          !!ex.video_url &&
          !!ex.video_type &&
          ex.video_type !== 'instagram',
      );
      if (aiQueue.length === 0) return;

      const toastId = toast.loading(`Analisando vídeos por IA — 0/${aiQueue.length}`, {
        description: 'Classificação corporal, estética e mobilidade.',
        duration: Infinity,
      });

      let done = 0;
      for (const ex of aiQueue) {
        if (cancelled) break;
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
        const pct = Math.round((done / aiQueue.length) * 100);
        toast.loading(`Analisando vídeos por IA — ${done}/${aiQueue.length} (${pct}%)`, {
          id: toastId,
          description: ex.name,
          duration: Infinity,
        });
      }
      if (cancelled) {
        toast.dismiss(toastId);
      } else {
        toast.success('Análise por IA concluída', { id: toastId, duration: 5000 });
      }
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user, exercises, queryClient]);

  return null;
}
