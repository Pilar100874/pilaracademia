/// <reference types="bun" />
import { expect, test, mock } from 'bun:test';

const at = (h: number) => { const d = new Date(); d.setHours(h, 0, 0, 0); return d.toISOString(); };
const SH = 'com.sec.android.app.shealth';
const raw: Record<string, { value: number; sourceId: string; startDate: string; endDate: string }[]> = {
  steps: [
    { value: 2000, sourceId: SH, startDate: at(0), endDate: at(0) },
    { value: 953, sourceId: SH, startDate: at(0), endDate: at(0) },
    { value: 2132, sourceId: 'com.google.android.apps.fitness', startDate: at(0), endDate: at(0) },
  ],
  calories: [{ value: 129, sourceId: SH, startDate: at(0), endDate: at(0) }],
  totalCalories: [{ value: 1259, sourceId: SH, startDate: at(0), endDate: at(0) }],
  distance: [{ value: 2330, sourceId: SH, startDate: at(0), endDate: at(0) }],
};

mock.module('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } }));
mock.module('@capgo/capacitor-health', () => ({ Health: {
  queryAggregated: async () => ({ samples: [{ value: 2132 }] }),
  readSamples: async ({ dataType }: { dataType: string }) => ({ samples: raw[dataType] ?? [] }),
  queryWorkouts: async () => ({ workouts: [] }),
} }));

test('summary uses Samsung Health records only, with total energy and meters', async () => {
  const { readWatchSummary } = await import('./healthConnect');
  const summary = await readWatchSummary();
  expect(summary.stepsToday).toBe(2953);
  // no basal rate recorded → keeps the active-calories record
  expect(summary.caloriesToday).toBe(129);
  expect(summary.caloriesSource).toBe('active_record');
  expect(summary.totalCaloriesToday).toBe(1259);
  expect(summary.distanceTodayMeters).toBe(2330);
  expect(summary.activityMinutesToday).toBeNull();
});
