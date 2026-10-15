import { supabase } from '@/integrations/supabase/client';

/**
 * Buckets passés en privé : les URLs publiques stockées en base servent
 * d'identifiants stables, et l'affichage/la lecture passent par des URLs
 * signées temporaires générées à la volée.
 */
const PRIVATE_BUCKETS = ['exercise-videos', 'workout-images', 'body-analysis-reports', 'product-images'] as const;
const PUBLIC_PREFIX = '/storage/v1/object/public/';
const SIGN_PREFIX = '/storage/v1/object/sign/';
const SIGN_TTL_SECONDS = 3600;
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

type ParsedStorageUrl = { bucket: string; path: string };

/** Extrait bucket + chemin d'une URL publique de bucket privé ; null sinon. */
export function parsePrivateStorageUrl(url: string | null | undefined): ParsedStorageUrl | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const idx = u.pathname.indexOf(PUBLIC_PREFIX);
    if (idx < 0) return null;
    const rest = u.pathname.slice(idx + PUBLIC_PREFIX.length);
    const slash = rest.indexOf('/');
    if (slash <= 0) return null;
    const bucket = rest.slice(0, slash);
    if (!(PRIVATE_BUCKETS as readonly string[]).includes(bucket)) return null;
    return { bucket, path: decodeURIComponent(rest.slice(slash + 1)) };
  } catch {
    return null;
  }
}

/**
 * Reconvertit une URL signée (éphémère) en URL publique canonique (stable)
 * avant toute écriture en base — une URL signée stockée expirerait.
 */
export function toCanonicalStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const idx = u.pathname.indexOf(SIGN_PREFIX);
    if (idx < 0) return url;
    const rest = u.pathname.slice(idx + SIGN_PREFIX.length);
    const slash = rest.indexOf('/');
    if (slash <= 0) return url;
    const bucket = rest.slice(0, slash);
    if (!(PRIVATE_BUCKETS as readonly string[]).includes(bucket)) return url;
    return `${u.origin}${PUBLIC_PREFIX}${rest}`;
  } catch {
    return url;
  }
}

const signedCache = new Map<string, { url: string; expiresAt: number }>();

/** URL signée temporaire pour un média de bucket privé ; URL inchangée sinon. */
export async function signMediaUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const parsed = parsePrivateStorageUrl(url);
  if (!parsed) return url;
  const key = `${parsed.bucket}/${parsed.path}`;
  const hit = signedCache.get(key);
  if (hit && hit.expiresAt > Date.now() + REFRESH_MARGIN_MS) return hit.url;
  const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, SIGN_TTL_SECONDS);
  if (error || !data?.signedUrl) return url;
  signedCache.set(key, { url: data.signedUrl, expiresAt: Date.now() + SIGN_TTL_SECONDS * 1000 });
  return data.signedUrl;
}

/**
 * Signe en lot les champs médias (string ou string[]) d'une liste de lignes,
 * en regroupant les appels par bucket.
 */
export async function signRowsMedia<T extends object>(rows: T[], fields: (keyof T & string)[]): Promise<T[]> {
  const parsedByUrl = new Map<string, ParsedStorageUrl>();
  for (const row of rows) {
    for (const field of fields) {
      const value = (row as Record<string, unknown>)[field];
      const urls = Array.isArray(value) ? value : [value];
      for (const u of urls) {
        if (typeof u !== 'string' || parsedByUrl.has(u)) continue;
        const parsed = parsePrivateStorageUrl(u);
        if (parsed) parsedByUrl.set(u, parsed);
      }
    }
  }
  if (parsedByUrl.size === 0) return rows;

  // 1) Réutiliser le cache encore valide.
  const signedByUrl = new Map<string, string>();
  const missingByBucket = new Map<string, Set<string>>();
  for (const [url, parsed] of parsedByUrl) {
    const key = `${parsed.bucket}/${parsed.path}`;
    const hit = signedCache.get(key);
    if (hit && hit.expiresAt > Date.now() + REFRESH_MARGIN_MS) {
      signedByUrl.set(url, hit.url);
    } else {
      if (!missingByBucket.has(parsed.bucket)) missingByBucket.set(parsed.bucket, new Set());
      missingByBucket.get(parsed.bucket)!.add(parsed.path);
    }
  }

  // 2) Signer les manquants, un appel groupé par bucket.
  const signedByKey = new Map<string, string>();
  await Promise.all(
    [...missingByBucket.entries()].map(async ([bucket, paths]) => {
      const list = [...paths];
      // L'API groupe jusqu'à ~100 chemins par appel : on découpe par sécurité.
      for (let i = 0; i < list.length; i += 100) {
        const chunk = list.slice(i, i + 100);
        const { data, error } = await supabase.storage.from(bucket).createSignedUrls(chunk, SIGN_TTL_SECONDS);
        if (error || !data) continue;
        for (const item of data) {
          if (!item.signedUrl || !item.path) continue;
          const key = `${bucket}/${item.path}`;
          signedByKey.set(key, item.signedUrl);
          signedCache.set(key, { url: item.signedUrl, expiresAt: Date.now() + SIGN_TTL_SECONDS * 1000 });
        }
      }
    }),
  );
  for (const [url, parsed] of parsedByUrl) {
    if (signedByUrl.has(url)) continue;
    const signed = signedByKey.get(`${parsed.bucket}/${parsed.path}`);
    if (signed) signedByUrl.set(url, signed);
  }

  // 3) Réécrire les champs.
  return rows.map((row) => {
    const copy = { ...row };
    for (const field of fields) {
      const value = row[field];
      if (Array.isArray(value)) {
        copy[field] = value.map((u) => (typeof u === 'string' ? signedByUrl.get(u) ?? u : u)) as T[keyof T & string];
      } else if (typeof value === 'string') {
        copy[field] = (signedByUrl.get(value) ?? value) as T[keyof T & string];
      }
    }
    return copy;
  });
}
