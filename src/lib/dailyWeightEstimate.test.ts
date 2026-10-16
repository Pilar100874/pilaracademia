/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { estimateDailyWeightChange } from './dailyWeightEstimate';

test('without watch: BMR × 1.2 + exercise − consumed, in grams (7.7 kcal/g)', () => {
  const r = estimateDailyWeightChange({ consumedKcal: 1500, exerciseKcal: 300, bmrKcal: 1500, hasWatchActivity: false });
  expect(r.burnedKcal).toBe(2100);
  expect(r.balanceKcal).toBe(600);
  expect(r.lossGrams).toBe(78);
});

test('with watch activity: BMR + active calories, eating more shows a gain', () => {
  const r = estimateDailyWeightChange({ consumedKcal: 2500, exerciseKcal: 131, bmrKcal: 1656, hasWatchActivity: true });
  expect(r.burnedKcal).toBe(1787);
  expect(r.lossGrams).toBe(-93);
});
