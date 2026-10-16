/** Local calendar boundaries, rather than rolling 24-hour buckets. */
export function healthHistoryStart(days: number, now = new Date()): string {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  return start.toISOString();
}

export function localHealthDay(iso: string): string {
  const date = new Date(iso);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

interface ActivityInterval { startDate: string; endDate: string }

/** Merge overlapping sessions; split midnight-spanning sessions into their actual days. */
export function activityMinutesByDay(sessions: ActivityInterval[], start: string, end: string): Map<string, number> {
  const intervals = sessions.map((session) => [
    Math.max(Date.parse(start), Date.parse(session.startDate)),
    Math.min(Date.parse(end), Date.parse(session.endDate)),
  ]).filter(([from, to]) => Number.isFinite(from) && Number.isFinite(to) && to > from)
    .sort((a, b) => a[0] - b[0]);
  const merged: number[][] = [];
  for (const interval of intervals) {
    const previous = merged[merged.length - 1];
    if (previous && interval[0] <= previous[1]) previous[1] = Math.max(previous[1], interval[1]);
    else merged.push([...interval]);
  }
  const days = new Map<string, number>();
  for (const [from, to] of merged) {
    for (let cursor = from; cursor < to;) {
      const midnight = new Date(cursor);
      midnight.setHours(24, 0, 0, 0);
      const next = Math.min(to, midnight.getTime());
      const key = localHealthDay(new Date(cursor).toISOString());
      days.set(key, (days.get(key) ?? 0) + (next - cursor) / 60000);
      cursor = next;
    }
  }
  return days;
}

export const SAMSUNG_HEALTH_PACKAGE = 'com.sec.android.app.shealth';

export interface SourcedSample { value: number; startDate: string; endDate: string; sourceId?: string }
export interface DayTotal { value: number; latestEnd: string; sourceId?: string }

/**
 * Daily totals from raw records, using ONE source per day: Samsung Health when present
 * (it already merges watch + phone), otherwise the source with the largest total.
 * Summing every source double-counts; Health Connect's priority aggregate may pick a
 * lagging phone source instead of the watch.
 */
export function sourceTotalsByDay(samples: SourcedSample[], preferred = SAMSUNG_HEALTH_PACKAGE): Map<string, DayTotal> {
  const days = new Map<string, Map<string, DayTotal>>();
  for (const sample of samples) {
    if (!Number.isFinite(sample.value) || sample.value < 0) continue;
    const day = localHealthDay(sample.startDate);
    const source = sample.sourceId ?? 'unknown';
    const bySource = days.get(day) ?? new Map<string, DayTotal>();
    const current = bySource.get(source) ?? { value: 0, latestEnd: sample.endDate, sourceId: source };
    current.value += sample.value;
    if (Date.parse(sample.endDate) > Date.parse(current.latestEnd)) current.latestEnd = sample.endDate;
    bySource.set(source, current);
    days.set(day, bySource);
  }
  const result = new Map<string, DayTotal>();
  for (const [day, bySource] of days) {
    const chosen = bySource.get(preferred) ?? [...bySource.values()].sort((a, b) => b.value - a.value)[0];
    if (chosen) result.set(day, chosen);
  }
  return result;
}
