import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useExerciseLibrary, type LibraryExercise } from '@/hooks/useExerciseLibrary';
import { useQueryClient } from '@tanstack/react-query';
import { compressVideoFile } from '@/lib/compressVideo';
import { useBackgroundProgress } from '@/contexts/BackgroundProgressContext';
import { LIB_BG_JOB_ID, LIB_BG_JOB_LABEL, isImportBusy, subscribeImportBusy } from '@/lib/libraryBgJob';

// Module-level flag — evita execuções concorrentes da mesma fila.
// É liberado ao final de run() para permitir uma nova verificação
// toda vez que o usuário abrir a Biblioteca.
let runnerStarted = false;

const JOB_ID = LIB_BG_JOB_ID;
const JOB_LABEL = LIB_BG_JOB_LABEL;

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
  const { exercises, allExercises, isMaster } = useExerciseLibrary();
  const queryClient = useQueryClient();
  const { addWork, tick, remove } = useBackgroundProgress();
  const { pathname } = useLocation();
  // Re-renderiza quando o estado de importação muda — o runner aguarda
  // todas as importações terminarem antes de começar a processar vídeos.
  const [, setBusyTick] = useState(0);
  useEffect(() => {
    const unsub = subscribeImportBusy(() => setBusyTick((n) => n + 1));
    return () => { unsub(); };
  }, []);

  const processableExercises = useMemo(
    () =>
      (allExercises ?? exercises).filter(
        (ex) => !ex.is_global || isMaster || ex.user_id === user?.id,
      ),
    [allExercises, exercises, isMaster, user?.id],
  );

  useEffect(() => {
    if (!user) return;
    if (runnerStarted) return;
    if (!processableExercises || processableExercises.length === 0) return;
    // Não dispara em telas públicas/auth
    if (pathname.startsWith('/auth') || pathname.startsWith('/reset-password') || pathname.startsWith('/p/') || pathname.startsWith('/r/')) return;
    // Aguarda qualquer importação em andamento (upload em massa,
    // Instagram) terminar antes de começar a processar vídeos. Quando
    // `endImport()` é chamado, `subscribeImportBusy` re-dispara este
    // effect via setBusyTick e o runner inicia.
    if (isImportBusy()) return;

    const getAttempts = (key: string): Set<string> => {
      try {
        const raw = sessionStorage.getItem(key);
        return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
      } catch { return new Set(); }
    };
    const optA = getAttempts('lib-bg-opt-attempts');
    const aiA = getAttempts('lib-bg-ai-attempts');
    const hashA = getAttempts('lib-bg-hash-attempts');

    const hasPending =
      processableExercises.some((ex) => ex.video_type === 'upload' && !!ex.video_url && !ex.video_optimized_at && !optA.has(ex.id)) ||
      processableExercises.some(
        (ex) =>
          (!ex.body_analyzed_at || !ex.mobility_analysis) &&
          !!ex.video_url &&
          !!ex.video_type &&
          ex.video_type !== 'instagram' &&
          !aiA.has(ex.id),
      ) ||
      processableExercises.some(
        (ex) => !!ex.video_url && !!ex.video_type && ex.video_type !== 'youtube' && !ex.video_hash && !hashA.has(ex.id),
      );
    if (!hasPending) return;

    const cancelled = false;
    // Marca como iniciado IMEDIATAMENTE para evitar que re-renders
    // (causados por setQueryData dentro do run) cancelem a execução.
    runnerStarted = true;
    const timer = window.setTimeout(() => {
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

      // Per-task "attempted" sets — evita reprocessar o mesmo vídeo em
      // loop quando uma etapa falha (ex.: análise por IA indisponível).
      // Persistido em sessionStorage para sobreviver a re-renders, mas
      // limpa quando o usuário abre uma nova aba/sessão.
      const loadAttempts = (key: string): Set<string> => {
        try {
          const raw = sessionStorage.getItem(key);
          return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
        } catch { return new Set(); }
      };
      const saveAttempts = (key: string, set: Set<string>) => {
        try { sessionStorage.setItem(key, JSON.stringify(Array.from(set))); } catch { /* ignore */ }
      };
      const optAttempts = loadAttempts('lib-bg-opt-attempts');
      const aiAttempts = loadAttempts('lib-bg-ai-attempts');
      const hashAttempts = loadAttempts('lib-bg-hash-attempts');

      const cached = queryClient.getQueryData<LibraryExercise[]>(['exercise-library', user.id]) ?? processableExercises;
      const fresh1 = cached.filter((ex) => !ex.is_global || isMaster || ex.user_id === user.id);
      const optQueue = fresh1.filter(
        (ex) => ex.video_type === 'upload' && !!ex.video_url && !ex.video_optimized_at && !optAttempts.has(ex.id),
      );
      const aiQueue = allowed
        ? fresh1.filter(
            (ex) =>
              (!ex.body_analyzed_at || !ex.mobility_analysis) &&
              !!ex.video_url &&
              !!ex.video_type &&
              ex.video_type !== 'instagram' &&
              !aiAttempts.has(ex.id),
          )
        : [];

      const optIds = new Set(optQueue.map((ex) => ex.id));
      const aiReadyQueue = aiQueue.filter((ex) => !optIds.has(ex.id));
      const aiAfterOptQueue = aiQueue.filter((ex) => optIds.has(ex.id));

      // Backfill: vídeos já otimizados (ou IG) sem video_hash → hashea o
      // que está armazenado no storage (mesmos bytes que novos uploads
      // hashearão pós-compressão).
      const hashBackfillQueue = fresh1.filter(
        (ex) => !!ex.video_url && !!ex.video_type && ex.video_type !== 'youtube' && !ex.video_hash && !optIds.has(ex.id) && !hashAttempts.has(ex.id),
      );

      const total = optQueue.length + aiQueue.length + hashBackfillQueue.length;
      if (total === 0) return;

      let saved = 0;
      let processedCount = 0;
      addWork(JOB_ID, JOB_LABEL, total);

      const analyzeExercise = async (ex: LibraryExercise) => {
        const { data, error } = await supabase.functions.invoke('analyze-exercise-video', {
          body: { videoUrl: ex.video_url, exerciseName: ex.name, categories: ex.category_ids },
        });
        if (error) throw error;
        if (data?.fallback) throw new Error(data?.message || 'AI service unavailable');
        if (!data?.body_analysis || !data?.aesthetic_analysis || !data?.mobility_analysis) {
          throw new Error('resposta inválida');
        }
        const analyzedAt = new Date().toISOString();
        const { error: updateError } = await supabase
          .from('exercise_library')
          .update({
            body_analysis: data.body_analysis,
            aesthetic_analysis: data.aesthetic_analysis,
            mobility_analysis: data.mobility_analysis,
            body_analyzed_at: analyzedAt,
          } as never)
          .eq('id', ex.id);
        if (updateError) throw updateError;
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
      };

      // ---------- Etapa 1: Classificação de vídeos já prontos ----------
      // Evita que a análise fique presa atrás da compressão de vídeos legados.
      for (const ex of aiReadyQueue) {
        if (cancelled) break;
        try {
          await analyzeExercise(ex);
        } catch (err) {
          console.warn('[bg] AI analysis failed', ex.id, err);
        }
        processedCount++;
        tick(JOB_ID, ex.name);
      }

      // ---------- Etapa 2: Otimização (ajuste de resolução) ----------
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

          // Helper para hashear um Blob
          const hashOf = async (b: Blob): Promise<string | null> => {
            try {
              const hashBuf = await crypto.subtle.digest('SHA-256', await b.arrayBuffer());
              return Array.from(new Uint8Array(hashBuf))
                .map((x) => x.toString(16).padStart(2, '0'))
                .join('');
            } catch { return null; }
          };

          if (compressed === inputFile || compressed.size >= origSize) {
            // Mantém o vídeo atual — hashea o que JÁ está no storage
            const storedHash = await hashOf(blob);
            const checkedAt = new Date().toISOString();
            const { error: markError } = await supabase.from('exercise_library').update({ video_optimized_at: checkedAt, video_hash: storedHash ?? ex.video_hash ?? null } as never).eq('id', ex.id);
            if (markError) throw markError;
            queryClient.setQueryData<LibraryExercise[]>(['exercise-library', user.id], (old) =>
              old?.map((e) => (e.id === ex.id ? { ...e, video_optimized_at: checkedAt, video_hash: storedHash ?? e.video_hash } : e)) ?? old,
            );
          } else {
            // Hashea os bytes COMPRIMIDOS — mesmos bytes que um novo
            // upload do mesmo arquivo hashearia (após compressão).
            const compressedHash = await hashOf(compressed);
            const path = `${user.id}/${Date.now()}-auto.webm`;
            const { error: upErr } = await supabase.storage
              .from('exercise-videos')
              .upload(path, compressed, { contentType: 'video/webm', upsert: false });
            if (upErr) throw upErr;
            const { data: pub } = supabase.storage.from('exercise-videos').getPublicUrl(path);
            const optimizedAt = new Date().toISOString();
            const { error: videoUpdateError } = await supabase
              .from('exercise_library')
              .update({ video_url: pub.publicUrl, video_optimized_at: optimizedAt, video_hash: compressedHash ?? ex.video_hash ?? null } as never)
              .eq('id', ex.id);
            if (videoUpdateError) throw videoUpdateError;
            queryClient.setQueryData<LibraryExercise[]>(['exercise-library', user.id], (old) =>
              old?.map((e) => (e.id === ex.id ? { ...e, video_url: pub.publicUrl, video_optimized_at: optimizedAt, video_hash: compressedHash ?? e.video_hash } : e)) ?? old,
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
        processedCount++;
        tick(JOB_ID, ex.name);
      }

      // ---------- Etapa 2b: Backfill de hash p/ vídeos já otimizados ----------
      for (const ex of hashBackfillQueue) {
        if (cancelled) break;
        try {
          const res = await fetch(ex.video_url!);
          if (!res.ok) throw new Error('download failed');
          const blob = await res.blob();
          const hashBuf = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
          const hex = Array.from(new Uint8Array(hashBuf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
          const { error: hErr } = await supabase
            .from('exercise_library')
            .update({ video_hash: hex } as never)
            .eq('id', ex.id);
          if (hErr) throw hErr;
          queryClient.setQueryData<LibraryExercise[]>(['exercise-library', user.id], (old) =>
            old?.map((e) => (e.id === ex.id ? { ...e, video_hash: hex } : e)) ?? old,
          );
        } catch (err) {
          console.warn('[bg] hash backfill failed', ex.id, err);
        }
        processedCount++;
        tick(JOB_ID, ex.name);
      }

      // ---------- Etapa 3: Classificação dos vídeos que acabaram de otimizar ----------
      // Recarrega a fila de IA para refletir possíveis mudanças de video_url
      const fresh2 = queryClient.getQueryData<LibraryExercise[]>(['exercise-library', user.id]) ?? processableExercises;
      const aiQueueFinal = allowed
        ? aiAfterOptQueue
            .map((ex) => fresh2.find((e) => e.id === ex.id) ?? ex)
            .filter((ex) => !!ex.video_url && !!ex.video_type && ex.video_type !== 'instagram')
        : [];

      for (const ex of aiQueueFinal) {
        if (cancelled) break;
        try {
          await analyzeExercise(ex);
        } catch (err) {
          console.warn('[bg] AI analysis failed', ex.id, err);
        }
        processedCount++;
        tick(JOB_ID, ex.name);
      }

      remove(JOB_ID);
      if (!cancelled && processedCount > 0) {
        const mb = saved > 0 ? ` — ${(saved / (1024 * 1024)).toFixed(1)} MB economizados` : '';
        toast.success(`Vídeos processados${mb}`, { duration: 4000 });
      }
    }

    // NÃO limpa o timer no cleanup — re-renders (causados pelo próprio
    // runner ao atualizar o cache) cancelariam a execução antes de iniciar.
  }, [user, processableExercises, isMaster, queryClient, addWork, tick, remove, pathname]);

  return null;
}
