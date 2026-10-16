import { describe, expect, test } from 'bun:test';
import { activityMinutesByDay, healthHistoryStart } from './healthActivity';

describe('health calendar and activity duration', () => {
  test('history starts at midnight, not at the import hour', () => {
    const now = new Date(2026, 9, 16, 17, 9);
    const start = new Date(healthHistoryStart(30, now));
    expect(start.getHours()).toBe(0);
    expect(start.getDate()).toBe(17);
    expect(start.getMonth()).toBe(8);
  });
  test('overlapping workout records do not double count duration', () => {
    const rows = activityMinutesByDay([
      { startDate: '2026-10-16T10:00:00Z', endDate: '2026-10-16T10:30:00Z' },
      { startDate: '2026-10-16T10:15:00Z', endDate: '2026-10-16T10:45:00Z' },
    ], '2026-10-16T00:00:00Z', '2026-10-17T00:00:00Z');
    expect([...rows.values()].reduce((a, b) => a + b, 0)).toBe(45);
  });
  test('activity crossing local midnight belongs to both dates', () => {
    const start = new Date(2026, 9, 15, 23, 45).toISOString();
    const end = new Date(2026, 9, 16, 0, 15).toISOString();
    expect([...activityMinutesByDay([{ startDate: start, endDate: end }], start, end).values()]).toEqual([15, 15]);
  });
});