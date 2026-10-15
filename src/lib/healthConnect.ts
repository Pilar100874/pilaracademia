import { Capacitor } from '@capacitor/core';
import { Health, type HealthSample } from '@capgo/capacitor-health';

/**
 * Sincronização com o relógio (Samsung Galaxy Watch / Wear OS) via Health Connect.
 * Só funciona no app nativo Android/iOS — no navegador tudo retorna indisponível.
 */

export const isWatchSyncSupported = () => Capacitor.isNativePlatform();

const READ_TYPES = ['steps', 'calories', 'heartRate', 'restingHeartRate', 'sleep', 'weight', 'bodyFat', 'height'] as const;

export interface WatchSummary {
  stepsToday: number | null;
  caloriesToday: number | null;
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
  const status = await Health.requestAuthorization({
    read: [...READ_TYPES],
    requestHistoryAccess: true,
  });
  return status.readAuthorized.length > 0;
}

export async function openWatchSettings(): Promise<void> {
  if (Capacitor.getPlatform() === 'android') {
    await Health.openHealthConnectSettings();
  }
}

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function aggregateToday(dataType: 'steps' | 'calories'): Promise<number | null> {
  try {
    const { samples } = await Health.queryAggregated({
      dataType,
      startDate: startOfToday(),
      endDate: new Date().toISOString(),
      bucket: 'day',
      aggregation: 'sum',
    });
    if (!samples.length) return null;
    return Math.round(samples.reduce((acc, s) => acc + (s.value || 0), 0));
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
  const [stepsToday, caloriesToday, hr, restingHr, sleepMinutes, weight, bodyFat, height] = await Promise.all([
    aggregateToday('steps'),
    aggregateToday('calories'),
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
    lastHeartRate: hr ? Math.round(hr.value) : null,
    restingHeartRate: restingHr ? Math.round(restingHr.value) : null,
    sleepMinutesLastNight: sleepMinutes,
    latestWeight: weight ? { kg: Math.round(weight.value * 10) / 10, date: weight.endDate } : null,
    latestBodyFat: bodyFat ? { pct: Math.round(bodyFat.value * 10) / 10, date: bodyFat.endDate } : null,
    latestHeightCm: height ? Math.round(height.value) : null,
    syncedAt: new Date().toISOString(),
  };
}
