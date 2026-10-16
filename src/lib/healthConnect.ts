import { Capacitor } from '@capacitor/core';
import { Health, type HealthSample } from '@capgo/capacitor-health';
import { activeFromTotal, activityMinutesByDay, healthHistoryStart, localHealthDay, sourceTotalsByDay, totalsBySource, type DayTotal } from './healthActivity';

/**
 * Sincronização com o relógio (Samsung Galaxy Watch / Wear OS) via Health Connect.
 * Só funciona no app nativo Android/iOS — no navegador tudo retorna indisponível.
 */

export const isWatchSyncSupported = () => Capacitor.isNativePlatform();

const READ_TYPES = ['steps', 'calories', 'totalCalories', 'basalCalories', 'distance', 'workouts', 'heartRate', 'restingHeartRate', 'heartRateVariability', 'bloodPressure', 'oxygenSaturation', 'respiratoryRate', 'vo2Max', 'bloodGlucose', 'bodyTemperature', 'sleep', 'weight', 'bodyFat', 'height'] as const;

export interface WatchSummary {
  stepsToday: number | null;
  caloriesToday: number | null;
  totalCaloriesToday: number | null;
  distanceTodayMeters: number | null;
  activityMinutesToday: number | null;
  /** Horário do registro de atividade mais recente que o Health Connect já recebeu. */
  activityDataUntil: string | null;
  /** Origem das calorias ativas: derivadas de total − basal (como o Samsung exibe) ou o registro de calorias ativas. */
  caloriesSource: 'total_minus_basal' | 'active_record' | null;
  /** Diagnóstico: quanto cada app gravou hoje em cada tipo de dado. */
  sources: { type: ActivityType | 'basalCalories'; sourceId: string; value: number; latestEnd: string }[];
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

let permissionRefreshTried = false;

/** Asks once per app session for read types that were added after the first connection. */
export async function ensureWatchPermissions(): Promise<void> {
  if (!isWatchSyncSupported() || permissionRefreshTried) return;
  permissionRefreshTried = true;
  try {
    const status = await Health.checkAuthorization({ read: [...READ_TYPES] });
    const missing = READ_TYPES.filter((type) => !status.readAuthorized.includes(type));
    if (missing.length) await Health.requestAuthorization({ read: [...READ_TYPES], requestHistoryAccess: true });
  } catch {
    // Permission screen unavailable: keep reading whatever is already authorized.
  }
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

export type ActivityType = 'steps' | 'calories' | 'totalCalories' | 'distance';

async function aggregateToday(dataType: ActivityType, end: string): Promise<number | null> {
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

/** Raw records summed from a single source per day (Samsung Health first). */
async function sourceDailyTotals(dataType: ActivityType, start: string, end = new Date().toISOString()): Promise<Map<string, DayTotal>> {
  const samples = await samplesOf(dataType, start, 20000, end);
  return sourceTotalsByDay(samples, undefined, pickFor(dataType));
}

/** Distance: largest single source per day (Samsung sometimes shares only part of it). */
const pickFor = (dataType: ActivityType | 'basalCalories') => (dataType === 'distance' ? 'max' : 'preferred') as 'max' | 'preferred';

interface TodayTotal { value: number | null; latestEnd: string | null; sources: DayTotal[] }

async function todayTotal(dataType: ActivityType | 'basalCalories', end: string): Promise<TodayTotal> {
  const samples = await samplesOf(dataType, startOfToday(), 20000, end);
  const sources = totalsBySource(samples);
  const today = [...sourceTotalsByDay(samples, undefined, pickFor(dataType)).values()][0];
  if (today) return { value: Math.round(today.value), latestEnd: today.latestEnd, sources };
  if (dataType === 'totalCalories' || dataType === 'basalCalories') return { value: null, latestEnd: null, sources };
  // Health Connect's aggregate is only a fallback when raw records are unreadable.
  return { value: await aggregateToday(dataType, end), latestEnd: null, sources };
}

/** Latest basal metabolic rate (kcal/day), Samsung Health first. */
async function latestBasalRate(): Promise<number | null> {
  const samples = await samplesOf('basalCalories', new Date(Date.now() - 90 * 86400000).toISOString(), 2000);
  const valid = samples.filter((s) => Number.isFinite(s.value) && s.value > 500 && s.value < 5000);
  const samsung = valid.filter((s) => s.sourceId === 'com.sec.android.app.shealth');
  const pool = samsung.length ? samsung : valid;
  const latest = pool.sort((a, b) => Date.parse(b.endDate) - Date.parse(a.endDate))[0];
  return latest ? latest.value : null;
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

export interface ReadWatchOptions {
  /** Metabolismo basal do perfil (kcal/dia), usado quando o Samsung Health não compartilha o basal. */
  fallbackBasalKcal?: number | null;
}

export async function readWatchSummary(options: ReadWatchOptions = {}): Promise<WatchSummary> {
  if (!isWatchSyncSupported()) throw new Error('Native health is unavailable');
  const syncedAt = new Date().toISOString();
  const [stepsToday, caloriesToday, totalCaloriesToday, distanceTodayMeters, basalRate, activity, hr, restingHr, sleepMinutes, weight, bodyFat, height] = await Promise.all([
    todayTotal('steps', syncedAt),
    todayTotal('calories', syncedAt),
    todayTotal('totalCalories', syncedAt),
    todayTotal('distance', syncedAt),
    latestBasalRate().then((rate) => (rate != null ? { kcal: rate, from: 'health' as const } : options.fallbackBasalKcal && options.fallbackBasalKcal > 0 ? { kcal: options.fallbackBasalKcal, from: 'profile' as const } : null)),
    readActivityHistory(startOfToday(), syncedAt),
    latestSample('heartRate'),
    latestSample('restingHeartRate'),
    sleepLastNight(),
    latestSample('weight'),
    latestSample('bodyFat', 90),
    latestSample('height', 365 * 5),
  ]);

  const derivedActive = totalCaloriesToday.value != null && basalRate != null
    ? activeFromTotal(totalCaloriesToday.value, basalRate.kcal, new Date(syncedAt))
    : null;
  const sources: WatchSummary['sources'] = ([['steps', stepsToday], ['calories', caloriesToday], ['totalCalories', totalCaloriesToday], ['distance', distanceTodayMeters]] as const)
    .flatMap(([type, t]) => t.sources.map((src) => ({ type, sourceId: src.sourceId ?? 'unknown', value: Math.round(src.value), latestEnd: src.latestEnd })));
  if (basalRate != null) sources.push({ type: 'basalCalories', sourceId: basalRate.from === 'profile' ? 'kcal/dia · calculado pelo seu perfil' : 'kcal/dia · Samsung Health', value: Math.round(basalRate.kcal), latestEnd: syncedAt });

  return {
    stepsToday: stepsToday.value,
    caloriesToday: derivedActive ?? caloriesToday.value,
    caloriesSource: derivedActive != null ? 'total_minus_basal' : caloriesToday.value != null ? 'active_record' : null,
    sources,
    totalCaloriesToday: totalCaloriesToday.value,
    distanceTodayMeters: distanceTodayMeters.value,
    activityDataUntil: [stepsToday, caloriesToday, distanceTodayMeters].map((t) => t.latestEnd).filter((v): v is string => !!v).sort().at(-1) ?? null,
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

async function samplesOf(dataType: HealthSample['dataType'], start: string, limit = 5000, end?: string): Promise<HealthSample[]> {
  // Lê em janelas de 30 dias: períodos longos (1 ano) estouram o limite de amostras por consulta.
  const from = new Date(start).getTime();
  const to = end ? new Date(end).getTime() : Date.now();
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

async function dailySum(dataType: ActivityType, type: string, unit: string, start: string): Promise<HealthMetricRow[]> {
  const totals = await sourceDailyTotals(dataType, start);
  if (totals.size) {
    return [...totals].map(([recorded_at, t]) => ({ metric_type: type, value: Math.round(t.value), value2: null, unit, recorded_at }));
  }
  if (dataType === 'totalCalories') return [];
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
