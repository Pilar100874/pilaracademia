import { GIFEncoder, quantize, applyPalette } from 'gifenc';

/**
 * Converts an array of base64 image URLs into an animated GIF data URL.
 * Uses requestAnimationFrame to avoid blocking the main thread.
 */
export async function createAnimatedGif(
  frameUrls: string[],
  fps: number = 2,
  maxWidth: number = 192,
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  if (!frameUrls.length) throw new Error('No frames provided');

  const delay = Math.round(1000 / fps);

  // Scale down aggressively to avoid long encoding times
  const effectiveMaxWidth = frameUrls.length > 15 ? Math.min(maxWidth, 192) : 
                            frameUrls.length > 8 ? Math.min(maxWidth, 224) : 
                            Math.min(maxWidth, 256);

  const loadImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load frame image'));
      img.src = url;
    });

  // Load images one at a time to avoid memory pressure
  const firstImg = await loadImage(frameUrls[0]);
  let width = firstImg.naturalWidth;
  let height = firstImg.naturalHeight;
  if (width > effectiveMaxWidth) {
    const scale = effectiveMaxWidth / width;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  width = width & ~1;
  height = height & ~1;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const gif = GIFEncoder();

  // Process first frame
  ctx.drawImage(firstImg, 0, 0, width, height);
  let imageData = ctx.getImageData(0, 0, width, height);
  let palette = quantize(new Uint8Array(imageData.data.buffer), 256, { format: 'rgba4444' });
  let index = applyPalette(new Uint8Array(imageData.data.buffer), palette, 'rgba4444');
  gif.writeFrame(index, width, height, { palette, delay, repeat: 0 });
  onProgress?.(1, frameUrls.length);

  // Yield to main thread between frames
  const yieldToMain = () => new Promise<void>(r => setTimeout(r, 0));

  for (let i = 1; i < frameUrls.length; i++) {
    await yieldToMain();
    
    const img = await loadImage(frameUrls[i]);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    imageData = ctx.getImageData(0, 0, width, height);
    palette = quantize(new Uint8Array(imageData.data.buffer), 256, { format: 'rgba4444' });
    index = applyPalette(new Uint8Array(imageData.data.buffer), palette, 'rgba4444');
    gif.writeFrame(index, width, height, { palette, delay, repeat: 0 });
    onProgress?.(i + 1, frameUrls.length);
  }

  gif.finish();

  const bytes = gif.bytes();
  const blob = new Blob([bytes], { type: 'image/gif' });

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
