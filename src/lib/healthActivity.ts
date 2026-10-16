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