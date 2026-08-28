import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundProgress } from '@/contexts/BackgroundProgressContext';
import { compressVideoFile } from '@/lib/compressVideo';
import { hashBlob } from '@/lib/videoHash';
import {
  LIB_IMPORT_JOB_ID,
  LIB_IMPORT_JOB_LABEL,
  beginImport,
  endImport,
} from '@/lib/libraryBgJob';
import {
  PENDING_UPLOADS_EVENT,
  listPendingUploads,
  removePendingUpload,
  type PendingUploadRecord,
} from '@/lib/pendingUploads';

/**
 * Processa a fila persistente de uploads (IndexedDB). Fica montado
 * globalmente: o envio continua enquanto o usuário navega e é retomado
 * automaticamente ao reabrir o app, mesmo que ele tenha sido fechado no
 * meio da importação.
 */
export function PendingUploadRunner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { addWork, tick, remove: removeJob } = useBackgroundProgress();
  const running = useRef(false);

  useEffect(() => {
    if (!user) return;

    const run = async () => {
      if (running.current) return;
      running.current = true;
      beginImport();
      let announced = false;
      let success = 0;
      let duplicates = 0;
      let failed = 0;
      const sessionHashes = new Set<string>();
      const usedNames = new Set<string>();

      try {
        // Enquanto houver itens na fila (novos podem chegar durante o envio).
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const queue = (await listPendingUploads()).filter((r) => r.meta.userId === user.id);
          if (!queue.length) break;

          if (!announced) {
            announced = true;
            addWork(LIB_IMPORT_JOB_ID, LIB_IMPORT_JOB_LABEL, queue.length);
            toast.info(
              'Importação em andamento — pode fechar o app: ela continua de onde parou ao reabrir.',
            );
          }

          const rec = queue[0];
          try {
            const ok = await processRecord(rec, user.id, sessionHashes, usedNames);
            if (ok === 'duplicate') duplicates++;
            else success++;
          } catch (err) {
            console.error('[PendingUploadRunner] falhou', rec.fileName, err);
            failed++;
          } finally {
            await removePendingUpload(rec.id);
            tick(LIB_IMPORT_JOB_ID, rec.fileName);
          }
        }
      } finally {
        removeJob(LIB_IMPORT_JOB_ID);
        endImport();
        running.current = false;
      }

      if (success || duplicates || failed) {
        queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
        if (success) toast.success(`${success} exercício(s) importado(s)`);
        if (duplicates) toast.warning(`${duplicates} arquivo(s) ignorado(s) por já existirem.`);
        if (failed) toast.warning(`${failed} arquivo(s) não puderam ser importados.`);
      }
    };

    run();
    const onChange = () => run();
    window.addEventListener(PENDING_UPLOADS_EVENT, onChange);
    return () => window.removeEventListener(PENDING_UPLOADS_EVENT, onChange);
  }, [user, addWork, tick, removeJob, queryClient]);

  return null;
}

async function processRecord(
  rec: PendingUploadRecord,
  userId: string,
  sessionHashes: Set<string>,
  usedNames: Set<string>,
): Promise<'ok' | 'duplicate'> {
  const original = new File([rec.blob], rec.fileName, {
    type: rec.fileType || rec.blob.type || 'application/octet-stream',
  });

  let toUpload: File = original;
  if (!rec.meta.noRecompress && original.type.startsWith('video/')) {
    try {
      toUpload = await compressVideoFile(original);
    } catch {
      toUpload = original;
    }
  }

  let videoHash: string | null = null;
  let rawHash: string | null = null;
  try {
    videoHash = await hashBlob(toUpload);
  } catch {
    /* ignore */
  }
  try {
    if (toUpload !== original) rawHash = await hashBlob(original);
  } catch {
    /* ignore */
  }

  const candidates = [videoHash, rawHash].filter(Boolean) as string[];
  if (candidates.length) {
    if (candidates.some((h) => sessionHashes.has(h))) return 'duplicate';
    const { data: existing } = await supabase
      .from('exercise_library')
      .select('id')
      .in('video_hash', candidates)
      .or(`user_id.eq.${userId},is_global.eq.true`)
      .limit(1)
      .maybeSingle();
    if (existing) return 'duplicate';
    candidates.forEach((h) => sessionHashes.add(h));
  }

  const ext = (toUpload.name.split('.').pop() || 'mp4').toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('exercise-videos')
    .upload(path, toUpload, { contentType: toUpload.type || original.type, upsert: false });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from('exercise-videos').getPublicUrl(path);

  const desired = (rec.meta.desiredName || '').trim();
  let name: string;
  if (desired) {
    let candidate = desired;
    let n = 2;
    while (usedNames.has(candidate)) candidate = `${desired} ${n++}`;
    usedNames.add(candidate);
    name = candidate;
  } else {
    const base = rec.meta.baseName?.trim() || 'Exercício';
    let n = 1;
    let candidate = `${base} ${n}`;
    while (usedNames.has(candidate)) candidate = `${base} ${++n}`;
    usedNames.add(candidate);
    name = candidate;
  }

  const optimized = rec.meta.noRecompress || toUpload !== original;

  const { data: created, error } = await supabase
    .from('exercise_library')
    .insert({
      user_id: userId,
      name,
      image_urls: [],
      default_sets: 1,
      default_reps: 10,
      video_type: 'upload',
      video_url: pub.publicUrl,
      video_optimized_at: optimized ? new Date().toISOString() : null,
      video_hash: videoHash,
      video_start_seconds: 0,
      video_end_seconds: null,
      category_id: rec.meta.categoryId ?? null,
      is_global: !!rec.meta.isGlobal,
      is_gif: !!rec.meta.isGif,
      clinic_id: null,
    } as never)
    .select('id')
    .single();
  if (error) throw error;

  const extras = rec.meta.extraIds ?? [];
  const newId = (created as { id?: string } | null)?.id;
  if (newId && extras.length) {
    await supabase
      .from('exercise_library_extras')
      .upsert(
        extras.map((extraId) => ({ exercise_id: newId, extra_id: extraId })),
        { onConflict: 'exercise_id,extra_id', ignoreDuplicates: true },
      );
  }

  return 'ok';
}
