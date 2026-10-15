import { useEffect, useState } from 'react';
import { getCachedVideoUrl } from '@/lib/videoCache';
import { signMediaUrl } from '@/lib/signedMediaUrl';

/**
 * Resolves a (possibly cached) Blob URL for an uploaded video.
 * Signs private-bucket URLs first, returns the original URL immediately as a
 * fallback so playback can start right away, then swaps to the cached blob
 * URL once available.
 */
export function useCachedVideoUrl(url: string | null | undefined, enabled = true) {
  const [resolved, setResolved] = useState<string | null>(url ?? null);

  useEffect(() => {
    setResolved(url ?? null);
    if (!enabled || !url) return;
    let cancelled = false;
    let createdBlobUrl: string | null = null;

    (async () => {
      // Buckets privés : l'URL publique stockée sert d'identifiant, la
      // lecture passe par une URL signée temporaire.
      const playable = (await signMediaUrl(url)) ?? url;
      if (cancelled) return;
      setResolved(playable);
      const blobUrl = await getCachedVideoUrl(playable);
      if (cancelled || !blobUrl) return;
      createdBlobUrl = blobUrl;
      setResolved(blobUrl);
    })();

    return () => {
      cancelled = true;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [url, enabled]);

  return resolved;
}
