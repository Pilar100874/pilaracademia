/**
 * Re-encodes a video file in the browser to a smaller, web-friendly size.
 *
 * Strategy:
 * - Decode original via <video> element.
 * - Draw frames into a canvas resized so the longest side fits `maxLongSide`.
 * - Capture the canvas stream + the original audio track via MediaRecorder.
 * - Output WebM (VP9/Opus) when supported — much smaller than the source MP4
 *   from a phone (~3-6× reduction at visually identical quality for fitness
 *   videos). Falls back to VP8 or to the original file if MediaRecorder is
 *   unavailable.
 *
 * Quality tuned to stay sharp on phones, tablets, desktops and TVs:
 * - 720p long side
 * - 2.5 Mbps video / 96 kbps audio
 *
 * No external dependencies, no server cost.
 */

export interface CompressOptions {
  maxLongSide?: number; // default 1280
  videoBitsPerSecond?: number; // default 2_500_000
  audioBitsPerSecond?: number; // default 96_000
  /** Skip compression and return original if the file is already smaller than this. */
  minSizeBytes?: number; // default 3 MB
  onProgress?: (ratio: number) => void; // 0..1
}

const DEFAULTS: Required<Omit<CompressOptions, 'onProgress'>> = {
  maxLongSide: 1280,
  videoBitsPerSecond: 2_500_000,
  audioBitsPerSecond: 96_000,
  minSizeBytes: 3 * 1024 * 1024,
};

function pickMimeType(): string | null {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      // ignore
    }
  }
  return null;
}

export async function compressVideoFile(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  const cfg = { ...DEFAULTS, ...opts };

  // Skip if already small or APIs unavailable
  if (file.size <= cfg.minSizeBytes) return file;
  const mimeType = pickMimeType();
  if (!mimeType) return file;
  if (typeof HTMLCanvasElement.prototype.captureStream !== 'function') return file;

  return new Promise<File>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    // Required for captureStream + audio in some browsers
    (video as any).crossOrigin = 'anonymous';

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      try { video.pause(); } catch {}
      try { URL.revokeObjectURL(url); } catch {}
    };

    const fallback = () => {
      cleanup();
      resolve(file);
    };

    video.onerror = fallback;

    video.onloadedmetadata = async () => {
      const srcW = video.videoWidth;
      const srcH = video.videoHeight;
      const duration = video.duration;
      if (!srcW || !srcH || !Number.isFinite(duration) || duration <= 0) {
        return fallback();
      }

      const longest = Math.max(srcW, srcH);
      const scale = longest > cfg.maxLongSide ? cfg.maxLongSide / longest : 1;
      // Round to even numbers — required by some encoders
      const dstW = Math.max(2, Math.round((srcW * scale) / 2) * 2);
      const dstH = Math.max(2, Math.round((srcH * scale) / 2) * 2);

      const canvas = document.createElement('canvas');
      canvas.width = dstW;
      canvas.height = dstH;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return fallback();

      // Captura apenas o vídeo — o áudio é descartado de propósito
      // (arquivos ficam bem mais leves e o app sempre reproduz mudo).
      const combined: MediaStream = (canvas as HTMLCanvasElement).captureStream(30);

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(combined, {
          mimeType,
          videoBitsPerSecond: cfg.videoBitsPerSecond,
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
        try { recorder.state !== 'inactive' && recorder.stop(); } catch {}
      };

      recorder.onstop = () => {
        cleanup();
        try {
          const blob = new Blob(chunks, { type: 'video/webm' });
          if (blob.size === 0 || blob.size >= file.size) {
            // Compression failed or made it bigger — keep original
            resolve(file);
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const out = new File([blob], `${baseName}.webm`, { type: 'video/webm' });
          resolve(out);
        } catch {
          resolve(file);
        }
      };

      // Draw loop
      let rafId = 0;
      const draw = () => {
        if (video.ended || video.paused) return;
        try {
          ctx.drawImage(video, 0, 0, dstW, dstH);
        } catch {
          // ignore single frame errors
        }
        if (cfg.onProgress && Number.isFinite(duration)) {
          cfg.onProgress(Math.min(1, video.currentTime / duration));
        }
        rafId = requestAnimationFrame(draw);
      };

      video.onended = () => {
        cancelAnimationFrame(rafId);
        // Tiny delay to flush last frames into the recorder
        setTimeout(stopAll, 100);
      };

      // Safety timeout: never run longer than 4× the video duration
      const safetyMs = Math.max(15_000, duration * 4_000);
      const safety = window.setTimeout(stopAll, safetyMs);
      const clearSafety = () => window.clearTimeout(safety);
      const origOnStop = recorder.onstop;
      recorder.onstop = (ev) => {
        clearSafety();
        if (origOnStop) (origOnStop as (e: Event) => void).call(recorder, ev);
      };

      try {
        recorder.start(1000);
        await video.play();
        draw();
      } catch {
        clearSafety();
        fallback();
      }
    };
  });
}
