const MEDIA_CACHE_VERSION = 'media-20260430-1';

export function getFreshMediaUrl(url: string | null | undefined, retryKey?: number | string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.pathname.includes('/storage/v1/object/public/')) {
      parsed.searchParams.set('lv_media_v', MEDIA_CACHE_VERSION);
      if (retryKey !== undefined && retryKey !== null && retryKey !== '') {
        parsed.searchParams.set('lv_retry', String(retryKey));
      }
      return parsed.toString();
    }
  } catch {
    return url;
  }

  return url;
}

/** Verdadeiro quando a mídia armazenada é um GIF animado (importado direto). */
export function isGifUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return /\.gif$/i.test(new URL(url).pathname);
  } catch {
    return /\.gif(\?|$)/i.test(url);
  }
}