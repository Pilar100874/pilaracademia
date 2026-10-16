/// <reference types="bun" />
import { expect, test, mock } from 'bun:test';

mock.module('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } }));
mock.module('@capgo/capacitor-health', () => ({ Health: {
  queryAggregated: async ({ dataType }: { dataType: string }) => ({ samples: [{ value: ({ steps: 2953, calories: 210, totalCalories: 1800, distance: 2350 } as Record<string, number>)[dataType] }] }),
  readSamples: async () => ({ samples: [] }),
  queryWorkouts: async () => ({ workouts: [] }),
} }));

test('summary preserves native steps, separates active energy from total, and retains meters', async () => {
  const { readWatchSummary } = await import('./healthConnect');
  const summary = await readWatchSummary();
  expect(summary.stepsToday).toBe(2953);
  expect(summary.caloriesToday).toBe(210);
  expect(summary.totalCaloriesToday).toBe(1800);
  expect(summary.distanceTodayMeters).toBe(2350);
  expect(summary.activityMinutesToday).toBeNull();
});