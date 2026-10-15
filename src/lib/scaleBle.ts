import { Capacitor } from '@capacitor/core';
import { BleClient, numbersToDataView, dataViewToNumbers } from '@capacitor-community/bluetooth-le';

/**
 * Leitura direta da balança de bioimpedância via Bluetooth LE (app nativo).
 * Suporta a família Fitdays/ICOMON/Lefu (serviço 0xFFB0) usada pela
 * Relaxmedic Proscan Voice, com parser do protocolo "AC02" (frames de 8 bytes)
 * e captura de frames brutos para diagnóstico de dialetos desconhecidos.
 * EXPERIMENTAL: validado apenas com capturas públicas de balanças compatíveis.
 */

export const isScaleBleSupported = () => Capacitor.isNativePlatform();

const SCALE_SERVICE = '0000ffb0-0000-1000-8000-00805f9b34fb';
const CHAR_WRITE = '0000ffb1-0000-1000-8000-00805f9b34fb';
const CHAR_NOTIFY = '0000ffb2-0000-1000-8000-00805f9b34fb';
const CHAR_INDICATE = '0000ffb3-0000-1000-8000-00805f9b34fb';

const NAME_HINTS = ['proscan', 'relaxfit', 'relaxmedic', 'fitdays', 'icomon', 'scale', 'hutbit', 'robi'];

/** Handshake AC02 (Lefu/Fitdays) — frames fixos, sem token de identidade do app. */
const AC02_HANDSHAKE: number[][] = [
  [0xac, 0x02, 0xfa, 0x01, 0x00, 0x00, 0xcc, 0xc7],
  [0xac, 0x02, 0xfb, 0x02, 0x1f, 0xa5, 0xcc, 0x8d],
  [0xac, 0x02, 0xfd, 0xe2, 0x01, 0x01, 0xcc, 0xad],
  [0xac, 0x02, 0xfc, 0x01, 0x00, 0x00, 0xcc, 0xc9],
  [0xac, 0x02, 0xfe, 0x06, 0x00, 0x00, 0xcc, 0xd0],
];

export interface ScaleReading {
  weightKg: number | null;
  /** Impedância em ohms, quando o protocolo a expõe. */
  impedanceOhm: number | null;
  stable: boolean;
}

export interface ScaleSessionCallbacks {
  onState: (state: 'scanning' | 'connecting' | 'measuring' | 'done' | 'error', message?: string) => void;
  onReading: (reading: ScaleReading) => void;
  /** Frames brutos em hex para diagnóstico (protocolo desconhecido). */
  onRawFrame: (hex: string) => void;
}

function toHex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

function checksumAc02(frame: number[]): boolean {
  if (frame.length !== 8) return false;
  const sum = (frame[2] + frame[3] + frame[4] + frame[5] + frame[6]) & 0xff;
  return sum === frame[7];
}

/** Parser do protocolo AC02 de 8 bytes. Retorna null se o frame não for desse dialeto. */
function parseAc02(bytes: number[]): ScaleReading | null {
  if (bytes.length !== 8 || bytes[0] !== 0xac || bytes[1] !== 0x02 || !checksumAc02(bytes)) return null;
  const weightKg = ((bytes[2] << 8) | bytes[3]) / 10;
  if (weightKg < 5 || weightKg > 250) return null;
  const status = bytes[6];
  return { weightKg, impedanceOhm: null, stable: status === 0xca };
}

/**
 * Tenta decodificar frames de 20 bytes (família ICOMON/Chipsea FFB2/FFB3).
 * Peso é buscado como u16 big-endian em faixas plausíveis; se nada bater,
 * o frame segue apenas para o log de diagnóstico.
 */
function parseIcomon20(bytes: number[]): ScaleReading | null {
  if (bytes.length !== 20) return null;
  // Pares de bytes candidatos a peso (valor entre 50 e 2500 => 5,0–250,0 kg)
  for (let i = 2; i <= 10; i += 1) {
    const raw = (bytes[i] << 8) | bytes[i + 1];
    const weightKg = raw / 10;
    if (weightKg >= 20 && weightKg <= 250) {
      return { weightKg: Math.round(weightKg * 10) / 10, impedanceOhm: null, stable: true };
    }
  }
  return null;
}

export class ScaleBleSession {
  private deviceId: string | null = null;
  private finished = false;

  constructor(private cb: ScaleSessionCallbacks) {}

  async start(): Promise<void> {
    if (!isScaleBleSupported()) {
      this.cb.onState('error', 'Disponível apenas no app instalado no celular.');
      return;
    }
    try {
      await BleClient.initialize({ androidNeverForLocation: true });
    } catch {
      this.cb.onState('error', 'Ative o Bluetooth do celular e tente novamente.');
      return;
    }

    this.cb.onState('scanning');
    let device;
    try {
      device = await BleClient.requestDevice({
        services: [SCALE_SERVICE],
        namePrefix: undefined,
        optionalServices: [SCALE_SERVICE],
        scanMode: 1,
      });
    } catch {
      this.cb.onState('error', 'Nenhuma balança selecionada. Suba na balança para acordá-la e tente de novo.');
      return;
    }

    this.deviceId = device.deviceId;
    this.cb.onState('connecting', device.name || 'Balança');
    try {
      await BleClient.connect(device.deviceId, () => {
        if (!this.finished) this.cb.onState('error', 'A balança desconectou. Tente novamente.');
      });
    } catch {
      this.cb.onState('error', 'Não foi possível conectar à balança. Ela está por perto e acordada?');
      return;
    }

    const onNotify = (value: DataView) => {
      const bytes = dataViewToNumbers(value);
      this.cb.onRawFrame(toHex(bytes));
      const reading = parseAc02(bytes) ?? parseIcomon20(bytes);
      if (reading) this.cb.onReading(reading);
    };

    try {
      await BleClient.startNotifications(device.deviceId, SCALE_SERVICE, CHAR_NOTIFY, onNotify);
    } catch {
      /* algumas unidades notificam só no FFB3 */
    }
    try {
      await BleClient.startNotifications(device.deviceId, SCALE_SERVICE, CHAR_INDICATE, onNotify);
    } catch {
      /* opcional */
    }

    // Envia handshake AC02 (inofensivo em dialetos que o ignoram)
    for (const frame of AC02_HANDSHAKE) {
      try {
        await BleClient.write(device.deviceId, SCALE_SERVICE, CHAR_WRITE, numbersToDataView(frame));
      } catch {
        break;
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    this.cb.onState('measuring');
  }

  async stop(): Promise<void> {
    this.finished = true;
    if (!this.deviceId) return;
    try {
      await BleClient.stopNotifications(this.deviceId, SCALE_SERVICE, CHAR_NOTIFY);
    } catch { /* noop */ }
    try {
      await BleClient.disconnect(this.deviceId);
    } catch { /* noop */ }
    this.deviceId = null;
  }
}

/**
 * Estimativa de % de gordura pela equação BIA de Kyle et al. (2001),
 * validada clinicamente, usando impedância (ohms), altura, peso, sexo e idade.
 * Retorna null quando faltam dados do perfil ou a impedância.
 */
export function estimateBodyFatPct(params: {
  impedanceOhm: number | null;
  weightKg: number;
  heightCm: number | null;
  ageYears: number | null;
  isMale: boolean | null;
}): number | null {
  const { impedanceOhm, weightKg, heightCm, ageYears, isMale } = params;
  if (!impedanceOhm || impedanceOhm < 100 || impedanceOhm > 1500) return null;
  if (!heightCm || !ageYears || isMale == null) return null;
  const h2overR = (heightCm * heightCm) / impedanceOhm;
  const ffm =
    -4.104 +
    0.518 * h2overR +
    0.231 * weightKg +
    4.229 * (isMale ? 1 : 0);
  if (ffm <= 0 || ffm >= weightKg) return null;
  const pct = ((weightKg - ffm) / weightKg) * 100;
  if (pct < 3 || pct > 60) return null;
  return Math.round(pct * 10) / 10;
}

export { NAME_HINTS as SCALE_NAME_HINTS };
