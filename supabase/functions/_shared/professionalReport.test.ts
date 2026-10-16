import { test, expect } from 'bun:test';
import { reportSections, sanitizeReport, aggregateReportDays } from './professionalReport';

test('professional report covers measurements, all health signals, glucose and detailed workouts', () => {
  const keys = reportSections.map(section => section.key);
  for (const key of ['body_measurements', 'health_metrics', 'glycemia_entries', 'workout_plans', 'blood_exams', 'body_analyses', 'food_entries', 'liquid_entries', 'weekly_menus', 'custom_products', 'food_kits']) expect(keys).toContain(key);
});
test('shared records never expose account identity or secrets', () => {
  expect(sanitizeReport({ user_id: 'private-owner', email: 'private@example.test', access_token: 'secret', markers: [{ label: 'Glicose', value: 93, user_id: 'other' }] })).toEqual({ markers: [{ label: 'Glicose', value: 93 }] });
});
test('daily aggregation uses Sao Paulo date and leaves missing values null', () => {
  expect(aggregateReportDays([{ consumed_at: '2026-10-16T01:00:00Z', calories: 300, protein: 20, carbs: 40, fat: 5, is_liquid: true, liquid_ml: 200 }], [], [])).toEqual([{ date: '2026-10-15', calories: 300, protein: 20, carbs: 40, fat: 5, liquid_ml: 200, burned: null, hasWorkout: false }]);
});
