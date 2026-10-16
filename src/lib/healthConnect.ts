import { Capacitor } from '@capacitor/core';
import { Health, type HealthSample } from '@capgo/capacitor-health';
import { activityMinutesByDay, healthHistoryStart, localHealthDay } from './healthActivity';

/**
 * Sincronização com o relógio (Samsung Galaxy Watch / Wear OS) via Health Connect.
 * Só funciona no app nativo Android/iOS — no navegador tudo retorna indisponível.
 */

export const isWatchSyncSupported = () => Capacitor.isNativePlatform();

const READ_TYPES = ['steps', 'calories', 'totalCalories', 'distance', 'workouts', 'heartRate', 'restingHeartRate', 'heartRateVariability', 'bloodPressure', 'oxygenSaturation', 'respiratoryRate', 'vo2Max', 'bloodGlucose', 'bodyTemperature', 'sleep', 'weight', 'bodyFat', 'height'] as const;

export interface WatchSummary {
  stepsToday: number | null;
  caloriesToday: number | null;
  totalCaloriesToday: number | null;
  distanceTodayMeters: number | null;
  activityMinutesToday: number | null;
  lastHeartRate: number | null;
  restingHeartRate: number | null;
  sleepMinutesLastNight: number | null;
  latestWeight: { kg: number; date: string } | null;
  latestBodyFat: { pct: number; date: string } | null;
  latestHeightCm: number | null;
  syncedAt: string;
}

export async function checkWatchAvailability(): Promise<{ available: boolean; reason?: string }> {
  if (!isWatchSyncSupported()) return { available: false, reason: 'web' };
  try {
    const result = await Health.isAvailable();
    return { available: result.available, reason: result.reason };
  } catch {
    return { available: false, reason: 'error' };
  }
}

export async function requestWatchPermission(): Promise<boolean> {
  if (!isWatchSyncSupported()) return false;
  const status = await Health.requestAuthorization({
    read: [...READ_TYPES],
    requestHistoryAccess: true,
  });
  return status.readAuthorized.length > 0;
}

export async function openWatchSettings(): Promise<void> {
  if (!isWatchSyncSupported()) return;
  if (Capacitor.getPlatform() === 'android') {
    await Health.openHealthConnectSettings();
  }
}

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function aggregateToday(dataType: 'steps' | 'calories' | 'totalCalories' | 'distance', end: string): Promise<number | null> {
  try {
    const { samples } = await Health.queryAggregated({
      dataType,
      startDate: startOfToday(),
      endDate: end,
      bucket: 'day',
      aggregation: 'sum',
    });
    if (!samples.length) return null;
    const valid = samples.filter((s) => Number.isFinite(s.value));
    return valid.length ? Math.round(valid.reduce((acc, s) => acc + s.value, 0)) : null;
  } catch {
    return null;
  }
}

async function latestSample(
  dataType: 'heartRate' | 'restingHeartRate' | 'weight' | 'bodyFat' | 'height',
  daysBack = 30,
): Promise<HealthSample | null> {
  try {
    const { samples } = await Health.readSamples({
      dataType,
      startDate: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      limit: 1,
    });
    return samples[0] ?? null;
  } catch {
    return null;
  }
}

async function sleepLastNight(): Promise<number | null> {
  try {
    const { samples } = await Health.readSamples({
      dataType: 'sleep',
      startDate: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      limit: 200,
    });
    if (!samples.length) return null;
    const total = samples
      .filter((s) => !s.sleepState || s.sleepState !== 'awake')
      .reduce((acc, s) => acc + (s.value || 0), 0);
    return total > 0 ? Math.round(total) : null;
  } catch {
    return null;
  }
}

export async function readWatchSummary(): Promise<WatchSummary> {
  if (!isWatchSyncSupported()) throw new Error('Native health is unavailable');
  const syncedAt = new Date().toISOString();
  const [stepsToday, caloriesToday, totalCaloriesToday, distanceTodayMeters, activity, hr, restingHr, sleepMinutes, weight, bodyFat, height] = await Promise.all([
    aggregateToday('steps', syncedAt),
    aggregateToday('calories', syncedAt),
    aggregateToday('totalCalories', syncedAt),
    aggregateToday('distance', syncedAt),
    readActivityHistory(startOfToday(), syncedAt),
    latestSample('heartRate'),
    latestSample('restingHeartRate'),
    sleepLastNight(),
    latestSample('weight'),
    latestSample('bodyFat', 90),
    latestSample('height', 365 * 5),
  ]);

  return {
    stepsToday,
    caloriesToday,
    totalCaloriesToday,
    distanceTodayMeters,
    activityMinutesToday: activity[0]?.value ?? null,
    lastHeartRate: hr ? Math.round(hr.value) : null,
    restingHeartRate: restingHr ? Math.round(restingHr.value) : null,
    sleepMinutesLastNight: sleepMinutes,
    latestWeight: weight ? { kg: Math.round(weight.value * 10) / 10, date: weight.endDate } : null,
    latestBodyFat: bodyFat ? { pct: Math.round(bodyFat.value * 10) / 10, date: bodyFat.endDate } : null,
    latestHeightCm: height ? Math.round(height.value) : null,
    syncedAt,
  };
}

/** Linha pronta para gravar em health_metrics (um valor por dia ou por medição). */
export interface HealthMetricRow {
  metric_type: string;
  value: number;
  value2: number | null;
  unit: string;
  recorded_at: string;
}

const dayKey = localHealthDay;

/** Health Connect does not expose Samsung's proprietary daily activity-time total.
 * Use recorded workout sessions only, never estimate time from steps. */
async function readActivityHistory(start: string, end = new Date().toISOString()): Promise<HealthMetricRow[]> {
  const sessions: { startDate: string; endDate: string }[] = [];
  let anchor: string | undefined;
  const seen = new Set<string>();
  try {
    do {
      const result = await Health.queryWorkouts({ startDate: start, endDate: end, limit: 500, ascending: true, anchor });
      for (const workout of result.workouts) {
        if (Capacitor.getPlatform() === 'android' && workout.sourceId !== 'com.sec.android.app.shealth') continue;
        sessions.push(workout);
      }
      anchor = result.anchor;
      if (anchor && seen.has(anchor)) throw new Error('Repeated workout cursor');
      if (anchor) seen.add(anchor);
    } while (anchor);
    return [...activityMinutesByDay(sessions, start, end)].map(([recorded_at, minutes]) => ({
      metric_type: 'activity_duration', value: Math.round(minutes * 10) / 10, value2: null, unit: 'min', recorded_at,
    }));
  } catch {
    return [];
  }
}

async function samplesOf(dataType: HealthSample['dataType'], start: string, limit = 5000): Promise<HealthSample[]> {
  // Lê em janelas de 30 dias: períodos longos (1 ano) estouram o limite de amostras por consulta.
  const from = new Date(start).getTime();
  const to = Date.now();
  const WINDOW = 30 * 86400000;
  const out: HealthSample[] = [];
  let first = true;
  for (let w = from; w < to; w += WINDOW) {
    try {
      const { samples } = await Health.readSamples({
        dataType,
        startDate: new Date(w).toISOString(),
        endDate: new Date(Math.min(w + WINDOW, to)).toISOString(),
        limit,
      });
      out.push(...samples);
    } catch {
      if (first) return [];
    }
    first = false;
  }
  return out;
}

function dailyStats(samples: HealthSample[], type: string, unit: string, round = 1): HealthMetricRow[] {
  const groups = new Map<string, number[]>();
  for (const s of samples) {
    if (!Number.isFinite(s.value)) continue;
    const k = dayKey(s.endDate);
    groups.set(k, [...(groups.get(k) ?? []), s.value]);
  }
  const r = (v: number) => Math.round(v * round) / round;
  return [...groups.entries()].map(([k, vals]) => ({
    metric_type: type,
    value: r(vals.reduce((a, b) => a + b, 0) / vals.length),
    value2: vals.length > 1 ? r(Math.max(...vals)) : null,
    unit,
    recorded_at: k,
  }));
}

async function dailySum(dataType: 'steps' | 'calories' | 'totalCalories' | 'distance', type: string, unit: string, start: string): Promise<HealthMetricRow[]> {
  try {
    const { samples } = await Health.queryAggregated({ dataType, startDate: start, endDate: new Date().toISOString(), bucket: 'day', aggregation: 'sum' });
    return samples
      .filter((s) => Number.isFinite(s.value) && s.value >= 0)
      .map((s) => ({ metric_type: type, value: Math.round(s.value), value2: null, unit, recorded_at: dayKey(s.startDate) }));
  } catch {
    return [];
  }
}

/** Último valor registrado de cada dia (para peso/gordura, onde só a última medição vale). */
function latestPerDay(samples: HealthSample[]): Map<string, HealthSample> {
  const m = new Map<string, HealthSample>();
  for (const s of samples) {
    if (!Number.isFinite(s.value)) continue;
    const k = dayKey(s.endDate);
    const cur = m.get(k);
    if (!cur || new Date(s.endDate).getTime() > new Date(cur.endDate).getTime()) m.set(k, s);
  }
  return m;
}

export interface BodyCompositionPoint {
  /** Data (ISO) da última medição daquele dia. */
  date: string;
  kg?: number;
  pct?: number;
}

/**
 * Peso e gordura corporal dia a dia, dos últimos `days` dias.
 * Retorna um ponto por dia (a última medição daquele dia), do mais antigo ao mais recente.
 */
export async function readBodyCompositionHistory(days: number): Promise<BodyCompositionPoint[]> {
  if (!isWatchSyncSupported()) return [];
  const start = healthHistoryStart(days);
  const [weights, fats] = await Promise.all([samplesOf('weight', start), samplesOf('bodyFat', start)]);
  const wm = latestPerDay(weights);
  const fm = latestPerDay(fats);
  const keys = [...new Set([...wm.keys(), ...fm.keys()])];
  return keys
    .flatMap((k) => {
      const w = wm.get(k);
      const f = fm.get(k);
      const latest = w ?? f;
      if (!latest) return [];
      return [{
        date: latest.endDate,
        kg: w ? Math.round(w.value * 10) / 10 : undefined,
        pct: f ? Math.round(f.value * 10) / 10 : undefined,
      }];
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** Lê o histórico dos últimos `days` dias de todos os sinais disponíveis. */
export async function readHealthHistory(days = 30): Promise<HealthMetricRow[]> {
  if (!isWatchSyncSupported()) return [];
  const start = healthHistoryStart(days);
  const [steps, cal, dist, totalCal, activity, hr, rhr, hrv, bp, spo2, resp, vo2, glu, temp, sleep, fat] = await Promise.all([
    dailySum('steps', 'steps', 'passos', start),
    dailySum('calories', 'calories', 'kcal', start),
    dailySum('distance', 'distance', 'm', start),
    dailySum('totalCalories', 'total_calories', 'kcal', start),
    readActivityHistory(start),
    samplesOf('heartRate', start),
    samplesOf('restingHeartRate', start),
    samplesOf('heartRateVariability', start),
    samplesOf('bloodPressure', start),
    samplesOf('oxygenSaturation', start),
    samplesOf('respiratoryRate', start),
    samplesOf('vo2Max', start),
    samplesOf('bloodGlucose', start),
    samplesOf('bodyTemperature', start),
    samplesOf('sleep', start),
    samplesOf('bodyFat', start),
  ]);
  const rows: HealthMetricRow[] = [...steps, ...cal, ...dist, ...totalCal, ...activity];
  rows.push(...dailyStats(hr, 'heart_rate', 'bpm'));
  rows.push(...dailyStats(rhr, 'resting_heart_rate', 'bpm'));
  rows.push(...dailyStats(hrv, 'hrv', 'ms'));
  rows.push(...dailyStats(spo2, 'spo2', '%'));
  rows.push(...dailyStats(resp, 'respiratory_rate', 'rpm', 10));
  rows.push(...dailyStats(vo2, 'vo2max', 'mL/kg/min', 10));
  rows.push(...dailyStats(glu, 'glucose', 'mg/dL'));
  rows.push(...dailyStats(temp, 'body_temperature', '°C', 10));
  rows.push(...dailyStats(fat, 'body_fat', '%'));
  for (const s of bp) {
    if (s.systolic && s.diastolic) {
      rows.push({ metric_type: 'blood_pressure', value: Math.round(s.systolic), value2: Math.round(s.diastolic), unit: 'mmHg', recorded_at: s.endDate });
    }
  }
  const sleepByDay = new Map<string, number>();
  for (const s of sleep) {
    if (s.sleepState === 'awake' || s.sleepState === 'inBed') continue;
    const k = dayKey(s.endDate);
    sleepByDay.set(k, (sleepByDay.get(k) ?? 0) + (s.value || 0));
  }
  for (const [k, v] of sleepByDay) if (v > 0) rows.push({ metric_type: 'sleep', value: Math.round(v), value2: null, unit: 'min', recorded_at: k });
  return rows;
}
