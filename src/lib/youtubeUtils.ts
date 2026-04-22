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
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}
