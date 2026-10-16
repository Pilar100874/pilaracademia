/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { activeFromTotal, activityMinutesByDay, healthHistoryStart, sourceTotalsByDay, SAMSUNG_HEALTH_PACKAGE } from './healthActivity';

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
describe('daily activity totals by source', () => {
  const day = (h: number, m = 0) => new Date(2026, 9, 16, h, m).toISOString();
  test('prefers Samsung Health instead of summing phone and watch twice', () => {
    const totals = sourceTotalsByDay([
      { value: 2000, startDate: day(9), endDate: day(10), sourceId: SAMSUNG_HEALTH_PACKAGE },
      { value: 953, startDate: day(15), endDate: day(16), sourceId: SAMSUNG_HEALTH_PACKAGE },
      { value: 2100, startDate: day(9), endDate: day(16), sourceId: 'com.google.android.apps.fitness' },
    ]);
    const today = [...totals.values()][0];
    expect(today.value).toBe(2953);
    expect(today.latestEnd).toBe(day(16));
  });
  test('without Samsung Health, uses the largest single source', () => {
    const totals = sourceTotalsByDay([
      { value: 1200, startDate: day(9), endDate: day(10), sourceId: 'a' },
      { value: 1500, startDate: day(9), endDate: day(10), sourceId: 'b' },
    ]);
    expect([...totals.values()][0].value).toBe(1500);
  });
});

describe('Samsung activity calories', () => {
  test('total minus the basal share elapsed today', () => {
    // 1656 kcal/day basal, 17:30 → 1207.5 kcal resting so far; 1342 total → ~135 active
    expect(activeFromTotal(1342, 1656, new Date(2026, 9, 16, 17, 30))).toBe(135);
  });
  test('never negative', () => {
    expect(activeFromTotal(100, 2000, new Date(2026, 9, 16, 23, 0))).toBe(0);
  });
});

describe('distance uses the largest single source', () => {
  test('picks the fuller source even when Samsung Health shares only part of the distance', () => {
    const totals = sourceTotalsByDay([
      { value: 1940, startDate: '2026-10-16T12:00:00', endDate: '2026-10-16T13:00:00', sourceId: SAMSUNG_HEALTH_PACKAGE },
      { value: 2360, startDate: '2026-10-16T12:00:00', endDate: '2026-10-16T13:00:00', sourceId: 'com.google.android.apps.fitness' },
    ], SAMSUNG_HEALTH_PACKAGE, 'max');
    expect([...totals.values()][0].value).toBe(2360);
  });
});
