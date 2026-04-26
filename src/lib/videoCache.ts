/**
 * Caches uploaded exercise videos in the browser's Cache Storage so they
 * load instantly on subsequent views (works on mobile too — persists across
 * sessions like a service worker cache, but without registering a SW).
 */

const CACHE_NAME = 'exercise-videos-v1';
const MAX_CONCURRENT = 2;

let cachePromise: Promise<Cache> | null = null;
function getCache(): Promise<Cache> {
  if (!('caches' in window)) return Promise.reject(new Error('Cache API unavailable'));
  if (!cachePromise) cachePromise = caches.open(CACHE_NAME);
  return cachePromise;
}

const inFlight = new Map<string, Promise<void>>();
const queued = new Set<string>();
let activeCount = 0;
const waiting: Array<() => void> = [];

async function acquireSlot() {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
  activeCount++;
}
function releaseSlot() {
  activeCount--;
  const next = waiting.shift();
  if (next) next();
}

/**
 * Returns a (possibly cached) Blob URL for the given video URL.
 * If not cached, downloads it (respecting concurrency limit) and stores it.
 * Returns null if Cache API unavailable or download fails — caller should
 * fall back to the original URL.
 */
export async function getCachedVideoUrl(url: string): Promise<string | null> {
  if (!url || !('caches' in window)) return null;
  try {
    const cache = await getCache();
    const cached = await cache.match(url);
    if (cached) {
      const blob = await cached.blob();
      return URL.createObjectURL(blob);
    }
    // Not cached — download with concurrency control
    if (!inFlight.has(url)) {
      inFlight.set(
        url,
        (async () => {
          await acquireSlot();
          try {
            const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
            if (res.ok) {
              await cache.put(url, res.clone());
            }
          } catch {
            /* ignore */
          } finally {
            releaseSlot();
            inFlight.delete(url);
          }
        })()
      );
    }
    await inFlight.get(url);
    const fresh = await cache.match(url);
    if (fresh) {
      const blob = await fresh.blob();
      return URL.createObjectURL(blob);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns true if device storage looks low — in that case we should NOT
 * prefetch videos in the background, since filling the cache can crash
 * the tab on mobile devices ("Aw, snap! / Algo deu errado").
 */
async function isStorageLow(): Promise<boolean> {
  try {
    const nav: any = navigator;
    if (nav?.storage?.estimate) {
      const { quota = 0, usage = 0 } = await nav.storage.estimate();
      if (!quota) return false;
      const free = quota - usage;
      // Less than 150MB free OR already using >85% of quota → skip prefetch
      if (free < 150 * 1024 * 1024) return true;
      if (usage / quota > 0.85) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Schedules a list of video URLs to be downloaded into the cache in the
 * background, without blocking. Skips already-cached and already-queued URLs.
 * Skips entirely when device storage is low to avoid crashing mobile browsers.
 */
export function prefetchVideos(urls: Array<string | null | undefined>) {
  if (!('caches' in window)) return;
  const idle: (cb: () => void) => void =
    (window as any).requestIdleCallback?.bind(window) ??
    ((cb: () => void) => setTimeout(cb, 200));

  idle(async () => {
    try {
      if (await isStorageLow()) return;
      const cache = await getCache();
      for (const url of urls) {
        if (!url || queued.has(url)) continue;
        const hit = await cache.match(url);
        if (hit) continue;
        queued.add(url);
        // Fire-and-forget; concurrency is enforced inside getCachedVideoUrl
        getCachedVideoUrl(url).catch(() => {});
      }
    } catch {
      /* ignore */
    }
  });
}
