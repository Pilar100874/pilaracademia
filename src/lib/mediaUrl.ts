const MEDIA_CACHE_VERSION = 'media-20260426-1';

export function getFreshMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.pathname.includes('/storage/v1/object/public/')) {
      parsed.searchParams.set('lv_media_v', MEDIA_CACHE_VERSION);
      return parsed.toString();
    }
  } catch {
    return url;
  }

  return url;
}