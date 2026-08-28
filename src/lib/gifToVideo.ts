/**
 * Converte um GIF animado em um arquivo de vídeo (WebM) no próprio
 * navegador, para que possa ser importado na biblioteca exatamente como
 * um vídeo enviado normalmente.
 *
 * Estratégia:
 * 1) WebCodecs `ImageDecoder` (Chrome/Edge/Android) — decodifica todos os
 *    frames com suas durações reais e os desenha em um canvas gravado
 *    por `MediaRecorder`.
 * 2) Fallback universal — desenha a tag <img> (que anima sozinha) em um
 *    canvas por alguns segundos a 15fps.
 */

const MAX_DIMENSION = 1280;
// GIFs costumam ser pequenos (240-480px). Ampliar por fator inteiro antes de
// codificar evita o borrão do encoder e mantém as linhas nítidas.
const MIN_DIMENSION = 720;
const VIDEO_BITRATE = 12_000_000;
const MIN_DURATION_MS = 2000;
const MAX_DURATION_MS = 12000;
const FALLBACK_DURATION_MS = 4000;


function pickMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
}

function scaleSize(w: number, h: number) {
  const largest = Math.max(w, h);
  if (largest <= MAX_DIMENSION) return { width: Math.max(2, w), height: Math.max(2, h) };
  const ratio = MAX_DIMENSION / largest;
  return {
    width: Math.max(2, Math.round(w * ratio)),
    height: Math.max(2, Math.round(h * ratio)),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

function outputName(originalName: string, mime: string) {
  const base = originalName.replace(/\.[^.]+$/, '') || 'gif';
  const ext = mime.includes('mp4') ? 'mp4' : 'webm';
  return `${base}.${ext}`;
}

async function recordCanvas(
  canvas: HTMLCanvasElement,
  drawLoop: (ctx: CanvasRenderingContext2D) => Promise<void>,
  originalName: string,
): Promise<File> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');

  const stream = canvas.captureStream(30);
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = () => reject(new Error('Falha ao gravar o GIF'));
  });

  recorder.start(200);
  try {
    await drawLoop(ctx);
  } finally {
    // pequeno atraso para o último frame entrar na gravação
    await sleep(150);
    if (recorder.state !== 'inactive') recorder.stop();
    stream.getTracks().forEach((t) => t.stop());
  }

  const blob = await done;
  if (!blob.size) throw new Error('Vídeo vazio');
  return new File([blob], outputName(originalName, mimeType), { type: mimeType });
}

async function convertWithImageDecoder(file: File): Promise<File> {
  const AnyDecoder = (globalThis as any).ImageDecoder;
  if (!AnyDecoder) throw new Error('ImageDecoder indisponível');

  const buffer = await file.arrayBuffer();
  const decoder = new AnyDecoder({ data: buffer, type: 'image/gif' });
  await decoder.tracks.ready;
  await decoder.completeFramesCount;

  const track = decoder.tracks.selectedTrack;
  const frameCount: number = track?.frameCount ?? 0;
  if (!frameCount) throw new Error('GIF sem frames');

  const frames: { bitmap: ImageBitmap | VideoFrame; durationMs: number }[] = [];
  for (let i = 0; i < frameCount; i++) {
    const { image } = await decoder.decode({ frameIndex: i, completeFramesOnly: true });
    const durationMs = image.duration ? image.duration / 1000 : 100;
    frames.push({ bitmap: image, durationMs: Math.max(20, durationMs) });
  }

  const first: any = frames[0].bitmap;
  const { width, height } = scaleSize(
    first.displayWidth ?? first.width,
    first.displayHeight ?? first.height,
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const loopMs = frames.reduce((sum, f) => sum + f.durationMs, 0);
  const loops = Math.min(
    5,
    Math.max(1, Math.ceil(MIN_DURATION_MS / Math.max(loopMs, 1))),
  );

  const result = await recordCanvas(
    canvas,
    async (ctx) => {
      const started = performance.now();
      for (let l = 0; l < loops; l++) {
        for (const f of frames) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(f.bitmap as any, 0, 0, width, height);
          await sleep(f.durationMs);
          if (performance.now() - started > MAX_DURATION_MS) return;
        }
      }
    },
    file.name,
  );

  frames.forEach((f) => (f.bitmap as any).close?.());
  decoder.close?.();
  return result;
}

async function convertWithImgTag(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    const { width, height } = scaleSize(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    return await recordCanvas(
      canvas,
      async (ctx) => {
        const started = performance.now();
        while (performance.now() - started < FALLBACK_DURATION_MS) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          await sleep(1000 / 15);
        }
      },
      file.name,
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function isGifFile(file: File) {
  return file.type === 'image/gif' || /\.gif$/i.test(file.name);
}

export async function gifToVideoFile(file: File): Promise<File> {
  try {
    return await convertWithImageDecoder(file);
  } catch {
    return await convertWithImgTag(file);
  }
}
