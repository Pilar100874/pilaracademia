import { useEffect, useState } from 'react';
import { getCachedVideoUrl } from '@/lib/videoCache';

/**
 * Resolves a (possibly cached) Blob URL for an uploaded video.
 * Returns the original URL immediately as a fallback so playback can start
 * right away, then swaps to the cached blob URL once available.
 */
export function useCachedVideoUrl(url: string | null | undefined, enabled = true) {
  const [resolved, setResolved] = useState<string | null>(url ?? null);

  useEffect(() => {
    setResolved(url ?? null);
    if (!enabled || !url) return;
    let cancelled = false;
    let createdBlobUrl: string | null = null;

    getCachedVideoUrl(url).then((blobUrl) => {
      if (cancelled || !blobUrl) return;
      createdBlobUrl = blobUrl;
      setResolved(blobUrl);
    });

    return () => {
      cancelled = true;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [url, enabled]);

  return resolved;
}
