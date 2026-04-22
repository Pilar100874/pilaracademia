// Utilities for parsing YouTube URLs and formatting time

export function parseYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Already an ID (11 chars, alphanumeric + - _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const re of patterns) {
    const match = trimmed.match(re);
    if (match) return match[1];
  }

  return null;
}

export function formatSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const s = Math.floor(totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Parse a time string in formats: "M:SS", "MM:SS", "H:MM:SS", or plain seconds "123".
 * Returns total seconds, or null if invalid.
 */
export function parseTimeToSeconds(input: string): number | null {
  if (input == null) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return 0;

  // Plain number (seconds)
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  // M:SS or H:MM:SS
  const parts = trimmed.split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((p) => /^\d+$/.test(p))) return null;

  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;

  let total = 0;
  if (nums.length === 2) {
    const [m, s] = nums;
    if (s >= 60) return null;
    total = m * 60 + s;
  } else {
    const [h, m, s] = nums;
    if (m >= 60 || s >= 60) return null;
    total = h * 3600 + m * 60 + s;
  }
  return total;
}

export function buildYouTubeEmbedUrl(
  videoId: string,
  start?: number | null,
  end?: number | null,
  autoplay = false,
  loop = false,
): string {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });
  if (start && start > 0) params.set('start', String(Math.floor(start)));
  if (end && end > 0) params.set('end', String(Math.ceil(end)));
  if (autoplay) {
    params.set('autoplay', '1');
    params.set('mute', '1');
  }
  if (loop) {
    params.set('loop', '1');
    // YouTube requires a playlist param for loop to work on a single video
    params.set('playlist', videoId);
  }
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Parse an Instagram post/reel URL and return the canonical shortcode.
 */
export function parseInstagramShortcode(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const re = /instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;
  const match = trimmed.match(re);
  return match ? match[1] : null;
}

/**
 * Detect if the Instagram URL points to a Reel/TV (single video) vs a regular post.
 * Reel embed often plays inline while /p/ video posts may show "Watch on Instagram".
 */
export function isInstagramReel(url: string): boolean {
  if (!url) return false;
  return /instagram\.com\/(?:reel|reels|tv)\//i.test(url);
}

export function buildInstagramEmbedUrl(shortcode: string, isReel = false): string {
  const path = isReel ? 'reel' : 'p';
  return `https://www.instagram.com/${path}/${shortcode}/embed/captioned/`;
}
