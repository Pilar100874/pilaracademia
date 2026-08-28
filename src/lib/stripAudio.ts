/**
 * Remove a faixa de áudio de um vídeo no navegador (sem servidor).
 *
 * - Detecta se o vídeo realmente possui áudio; se não tiver, devolve o
 *   arquivo original intacto (rápido, sem reencodar).
 * - Quando há áudio, reencoda apenas o vídeo (canvas + MediaRecorder),
 *   resultando em WebM mudo e mais leve.
 */

function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for (const m of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Heurística cross-browser para saber se um elemento de vídeo tem áudio. */
export function videoElementHasAudio(video: HTMLVideoElement): boolean | null {
  const v = video as any;
  if (typeof v.mozHasAudio === 'boolean') return v.mozHasAudio;
  if (typeof v.webkitAudioDecodedByteCount === 'number') {
    return v.webkitAudioDecodedByteCount > 0;
  }
  if (v.audioTracks && typeof v.audioTracks.length === 'number') {
    return v.audioTracks.length > 0;
  }
  return null; // desconhecido
}

export async function blobHasAudio(blob: Blob): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    (video as any).playsInline = true;
    video.src = url;

    const done = (result: boolean) => {
      try { video.pause(); } catch { /* ignore */ }
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      resolve(result);
    };

    video.onerror = () => done(false);
    video.onloadeddata = () => {
      const direct = videoElementHasAudio(video);
      if (direct !== null) return done(direct);
      // Fallback: captureStream do elemento revela faixas de áudio
      try {
        const stream = (video as any).captureStream?.();
        const tracks = stream?.getAudioTracks?.() ?? [];
        return done(tracks.length > 0);
      } catch {
        return done(true); // na dúvida, tenta remover
      }
    };
    // Segurança: não travar caso o vídeo nunca carregue
    window.setTimeout(() => done(false), 15000);
  });
}

export interface StripAudioOptions {
  videoBitsPerSecond?: number; // default 2.5 Mbps
  onProgress?: (ratio: number) => void;
}

/** Reencoda o arquivo sem áudio. Em caso de falha, devolve o original. */
export async function stripAudioFromFile(
  file: File,
  opts: StripAudioOptions = {}
): Promise<File> {
  const mimeType = pickMimeType();
  if (!mimeType) return file;
  if (typeof HTMLCanvasElement.prototype.captureStream !== 'function') return file;
  if (!(await blobHasAudio(file))) return file;

  return new Promise<File>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    (video as any).playsInline = true;
    video.src = url;

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      try { video.pause(); } catch { /* ignore */ }
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    };
    const fallback = () => {
      cleanup();
      resolve(file);
    };

    video.onerror = fallback;
    video.onloadedmetadata = async () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      const duration = video.duration;
      if (!w || !h || !Number.isFinite(duration) || duration <= 0) return fallback();

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(2, Math.round(w / 2) * 2);
      canvas.height = Math.max(2, Math.round(h / 2) * 2);
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return fallback();

      const stream = canvas.captureStream(30);
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: opts.videoBitsPerSecond ?? 2_500_000,
        });
      } catch {
        return fallback();
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      let stopped = false;
      const stopAll = () => {
        if (stopped) return;
        stopped = true;
        try { recorder.state !== 'inactive' && recorder.stop(); } catch { /* ignore */ }
      };

      recorder.onstop = () => {
        window.clearTimeout(safety);
        cleanup();
        try {
          const blob = new Blob(chunks, { type: 'video/webm' });
          if (blob.size === 0) return resolve(file);
          const baseName = file.name.replace(/\.[^.]+$/, '');
          resolve(new File([blob], `${baseName}.webm`, { type: 'video/webm' }));
        } catch {
          resolve(file);
        }
      };

      let rafId = 0;
      const draw = () => {
        if (video.ended || video.paused) return;
        try { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); } catch { /* ignore */ }
        opts.onProgress?.(Math.min(1, video.currentTime / duration));
        rafId = requestAnimationFrame(draw);
      };

      video.onended = () => {
        cancelAnimationFrame(rafId);
        setTimeout(stopAll, 100);
      };

      const safety = window.setTimeout(stopAll, Math.max(15_000, duration * 4_000));

      try {
        recorder.start(1000);
        await video.play();
        draw();
      } catch {
        window.clearTimeout(safety);
        fallback();
      }
    };
  });
}

/** Versão para Blob genérico (ex.: download de exportação). */
export async function stripAudioFromBlob(
  blob: Blob,
  fileName: string,
  opts: StripAudioOptions = {}
): Promise<{ blob: Blob; ext: string | null }> {
  const file = new File([blob], fileName, { type: blob.type || 'video/mp4' });
  const out = await stripAudioFromFile(file, opts);
  if (out === file) return { blob, ext: null };
  return { blob: out, ext: 'webm' };
}
