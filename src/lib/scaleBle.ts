import { Capacitor } from '@capacitor/core';
import { BleClient, numbersToDataView, dataViewToNumbers } from '@capacitor-community/bluetooth-le';

/**
 * Leitura direta da balança de bioimpedância via Bluetooth LE (somente app nativo).
 *
 * Família Fitdays/ICOMON/Lefu/Chipsea (serviço 0xFFB0, write FFB1, notify FFB2,
 * indicate FFB3) usada pela Relaxmedic Proscan Voice e afins. Dois dialetos
 * conhecidos são suportados:
 *  - "AC02" (8 bytes, Hutbit/FitTrack): peso + impedância em frames únicos.
 *  - "ICOMON 20B" (SACOMA Ultra / Robi S9): frames fragmentados de 20 bytes
 *    com mensagens A2 (peso ao vivo) e A3 (resultado com impedâncias).
 *
 * EXPERIMENTAL: o dialeto exato da Proscan Voice não é documentado publicamente;
 * os frames brutos são expostos via onRawFrame para diagnóstico em campo.
 * Referências: KristianP26/ble-scale-sync, ynsgnr/sacoma-lib.
 */

export const isScaleBleSupported = () => Capacitor.isNativePlatform();

const SCALE_SERVICE = '0000ffb0-0000-1000-8000-00805f9b34fb';
const CHAR_WRITE = '0000ffb1-0000-1000-8000-00805f9b34fb';
const CHAR_NOTIFY = '0000ffb2-0000-1000-8000-00805f9b34fb';
const CHAR_INDICATE = '0000ffb3-0000-1000-8000-00805f9b34fb';

/** Handshake AC02 (Lefu/Fitdays) — frames fixos, sem token por sessão. */
const AC02_HANDSHAKE: number[][] = [
  [0xac, 0x02, 0xfa, 0x01, 0x00, 0x00, 0xcc, 0xc7],
  [0xac, 0x02, 0xfb, 0x02, 0x1f, 0xa5, 0xcc, 0x8d],
  [0xac, 0x02, 0xfd, 0xe2, 0x01, 0x01, 0xcc, 0xad],
  [0xac, 0x02, 0xfc, 0x01, 0x00, 0x00, 0xcc, 0xc9],
  [0xac, 0x02, 0xfe, 0x06, 0x00, 0x00, 0xcc, 0xd0],
];

const IMPEDANCE_PLAUSIBLE_MIN = 150;
const IMPEDANCE_PLAUSIBLE_MAX = 1200;

export interface ScaleProfile {
  heightCm: number | null;
  ageYears: number | null;
  isMale: boolean | null;
  weightKg: number | null;
}

export interface ScaleReading {
  weightKg: number | null;
  impedanceOhm: number | null;
  /** Impedâncias segmentais (Ω) quando o dialeto ICOMON as envia (mensagem A3). */
  segmentalOhm?: number[] | null;
  stable: boolean;
}

export interface ScaleSessionCallbacks {
  onState: (state: 'scanning' | 'connecting' | 'measuring' | 'done' | 'error', message?: string) => void;
  onReading: (reading: ScaleReading) => void;
  /** Frames brutos em hex para diagnóstico de dialetos desconhecidos. */
  onRawFrame: (hex: string) => void;
}

function toHex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

/* ------------------------------------------------------------------ */
/* Dialeto AC02 (8 bytes)                                             */
/* ------------------------------------------------------------------ */

function checksumAc02(frame: number[]): boolean {
  const sum = (frame[2] + frame[3] + frame[4] + frame[5] + frame[6]) & 0xff;
  return sum === frame[7];
}

/** Peso: `AC 02 [u16 BE /10 kg] 00 00 STATUS CKSUM`; impedância: `AC 02 FD 01 [u16 BE Ω] CB CKSUM`. */
export function parseAc02(bytes: number[]): ScaleReading | null {
  if (bytes.length !== 8 || bytes[0] !== 0xac || (bytes[1] !== 0x02 && bytes[1] !== 0x03)) return null;
  if (!checksumAc02(bytes)) return null;

  // Frame de impedância
  if (bytes[2] === 0xfd) {
    if (bytes[3] === 0x00 || bytes[3] === 0xff) return { weightKg: null, impedanceOhm: null, stable: false };
    const ohm = (bytes[4] << 8) | bytes[5];
    if (ohm < IMPEDANCE_PLAUSIBLE_MIN || ohm > IMPEDANCE_PLAUSIBLE_MAX) return null;
    return { weightKg: null, impedanceOhm: ohm, stable: true };
  }

  const weightKg = ((bytes[2] << 8) | bytes[3]) / 10;
  if (weightKg < 5 || weightKg > 250) return null;
  return { weightKg, impedanceOhm: null, stable: bytes[6] === 0xca };
}

/* ------------------------------------------------------------------ */
/* Dialeto ICOMON 20 bytes (SACOMA / Robi S9)                         */
/* Frame: [seq][total-len][frag][payload ≤16B][cksum = sum(payload)&0x1F] */
/* ------------------------------------------------------------------ */

export class IcomonAssembler {
  private buffer: number[] = [];
  private expectedLen = 0;

  push(frame: number[]): number[] | null {
    if (frame.length !== 20) return null;
    const payload = frame.slice(3, 19);
    const cksum = payload.reduce((a, b) => a + b, 0) & 0x1f;
    if (cksum !== (frame[19] & 0x1f)) return null;

    const totalLen = frame[1];
    const frag = frame[2];
    if (frag === 0) {
      this.buffer = payload.slice(0, Math.min(totalLen, 16));
      this.expectedLen = totalLen;
    } else if (this.expectedLen > 0) {
      this.buffer = this.buffer.concat(payload).slice(0, this.expectedLen);
    } else {
      return null;
    }
    if (this.buffer.length >= this.expectedLen && this.expectedLen > 0) {
      const msg = this.buffer;
      this.buffer = [];
      this.expectedLen = 0;
      return msg;
    }
    return null;
  }
}

function u24be(b: number[], off: number): number {
  return (b[off] << 16) | (b[off + 1] << 8) | b[off + 2];
}

/** Mensagens reassembladas: A2 = peso ao vivo, A3 = resultado com impedâncias. */
export function parseIcomonMessage(msg: number[]): ScaleReading | null {
  const type = msg[0];
  if (type === 0xa2 && msg.length >= 6) {
    const state = msg[1];
    const weightKg = u24be(msg, 3) / 1000;
    if (weightKg < 5 || weightKg > 250) return null;
    return { weightKg: Math.round(weightKg * 100) / 100, impedanceOhm: null, stable: state === 0x02 || state === 0x03 };
  }
  if (type === 0xa3 && msg.length >= 26) {
    const weightKg = u24be(msg, 2) / 1000;
    // 10 impedâncias segmentais u16 BE /10 ohms a partir do offset 6
    const segmental: number[] = [];
    let impedance: number | null = null;
    for (let off = 6; off + 1 < msg.length && off <= 24; off += 2) {
      const ohm = ((msg[off] << 8) | msg[off + 1]) / 10;
      segmental.push(Math.round(ohm * 10) / 10);
      if (impedance == null && ohm >= IMPEDANCE_PLAUSIBLE_MIN && ohm <= IMPEDANCE_PLAUSIBLE_MAX) {
        impedance = Math.round(ohm);
      }
    }
    const hasPlausible = segmental.some(
      (z) => z >= IMPEDANCE_PLAUSIBLE_MIN && z <= IMPEDANCE_PLAUSIBLE_MAX,
    );
    return {
      weightKg: weightKg >= 5 && weightKg <= 250 ? Math.round(weightKg * 100) / 100 : null,
      impedanceOhm: impedance,
      segmentalOhm: hasPlausible ? segmental : null,
      stable: true,
    };
  }
  return null;
}

/** Robi S9 trata o frame de 20 bytes standalone: A3 no offset 3, peso u24 BE no offset 5. */
export function parseIcomonStandalone(frame: number[]): ScaleReading | null {
  if (frame.length !== 20 || frame[3] !== 0xa3) return null;
  const weightKg = u24be(frame, 5) / 1000;
  if (weightKg < 5 || weightKg > 250) return null;
  return { weightKg: Math.round(weightKg * 100) / 100, impedanceOhm: null, stable: true };
}

/* ------------------------------------------------------------------ */
/* Comandos app → balança (dialeto ICOMON)                            */
/* ------------------------------------------------------------------ */

let seqCounter = 0;

function wrapIcomonFrame(payload: number[]): number[] {
  const body = payload.slice(0, 16);
  while (body.length < 16) body.push(0x00);
  const cksum = body.reduce((a, b) => a + b, 0) & 0x1f;
  seqCounter = (seqCounter + 1) & 0xff;
  return [seqCounter, payload.length, 0x00, ...body, cksum];
}

/** Heartbeat 0xBA com o perfil do usuário — a balança só libera o resultado após ~0,4s de heartbeat. */
function buildHeartbeat(profile: ScaleProfile, userId: number): number[] {
  const now = Math.floor(Date.now() / 1000);
  const weight100 = profile.weightKg != null ? Math.round(profile.weightKg * 100) & 0x7fff : 0;
  const ageSex = ((profile.isMale ? 0x80 : 0x00) | ((profile.ageYears ?? 30) & 0x7f)) & 0xff;
  const payload = [
    0xba,
    (now >> 24) & 0xff, (now >> 16) & 0xff, (now >> 8) & 0xff, now & 0xff,
    0x00, 0x78,
    (userId >> 24) & 0xff, (userId >> 16) & 0xff, (userId >> 8) & 0xff, userId & 0xff,
    (profile.heightCm ?? 170) & 0xff,
    (weight100 >> 8) & 0xff, weight100 & 0xff,
    ageSex,
    0x2f,
  ];
  return wrapIcomonFrame(payload);
}

function hashUserId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h || 1;
}

/* ------------------------------------------------------------------ */
/* Sessão BLE                                                         */
/* ------------------------------------------------------------------ */

const MEASURE_TIMEOUT_MS = 90_000;

export class ScaleBleSession {
  private deviceId: string | null = null;
  private assembler = new IcomonAssembler();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private finished = false;
  private lastStable: ScaleReading | null = null;

  constructor(
    private cb: ScaleSessionCallbacks,
    private profile: ScaleProfile,
    private userId: string,
  ) {}

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
        optionalServices: [SCALE_SERVICE],
        scanMode: 1,
      });
    } catch {
      this.cb.onState('error', 'Nenhuma balança selecionada. Pise na balança para acordá-la e tente de novo.');
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
      const reading =
        parseAc02(bytes) ??
        parseIcomonStandalone(bytes) ??
        (() => {
          const msg = this.assembler.push(bytes);
          return msg ? parseIcomonMessage(msg) : null;
        })();
      if (reading) this.handleReading(reading);
    };

    try {
      await BleClient.startNotifications(device.deviceId, SCALE_SERVICE, CHAR_NOTIFY, onNotify);
    } catch { /* algumas unidades notificam só no FFB3 */ }
    try {
      await BleClient.startNotifications(device.deviceId, SCALE_SERVICE, CHAR_INDICATE, onNotify);
    } catch { /* opcional */ }

    // Handshake AC02 (inofensivo em dialetos que o ignoram)
    for (const frame of AC02_HANDSHAKE) {
      try {
        await BleClient.write(device.deviceId, SCALE_SERVICE, CHAR_WRITE, numbersToDataView(frame));
      } catch {
        break;
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    // Heartbeat ICOMON contínuo com o perfil (necessário para a balança liberar o resultado)
    const uid = hashUserId(this.userId);
    this.heartbeatTimer = setInterval(() => {
      if (!this.deviceId || this.finished) return;
      BleClient.write(
        this.deviceId,
        SCALE_SERVICE,
        CHAR_WRITE,
        numbersToDataView(buildHeartbeat(this.profile, uid)),
      ).catch(() => { /* mantém tentando */ });
    }, 400);

    this.timeoutTimer = setTimeout(() => {
      if (!this.finished) {
        void this.stop();
        this.cb.onState('error', 'Tempo esgotado. Pise na balança, aguarde o bip e tente novamente.');
      }
    }, MEASURE_TIMEOUT_MS);

    this.cb.onState('measuring');
  }

  private handleReading(reading: ScaleReading): void {
    // Combina peso e impedância recebidos em frames separados
    const merged: ScaleReading = {
      weightKg: reading.weightKg ?? this.lastStable?.weightKg ?? null,
      impedanceOhm: reading.impedanceOhm ?? this.lastStable?.impedanceOhm ?? null,
      segmentalOhm: reading.segmentalOhm ?? this.lastStable?.segmentalOhm ?? null,
      stable: reading.stable,
    };
    this.cb.onReading(merged);
    if (reading.stable && (merged.weightKg != null || merged.impedanceOhm != null)) {
      this.lastStable = merged;
    }
  }

  /** Encerra com sucesso usando a última leitura estável acumulada. */
  finish(): ScaleReading | null {
    const result = this.lastStable;
    void this.stop();
    if (result) this.cb.onState('done');
    return result;
  }

  async stop(): Promise<void> {
    this.finished = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    this.heartbeatTimer = null;
    this.timeoutTimer = null;
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

/* ------------------------------------------------------------------ */
/* Cálculo de % de gordura (BIA)                                      */
/* ------------------------------------------------------------------ */

/**
 * Fórmula BIA clássica de 4 coeficientes (mesma usada pelo projeto
 * ble-scale-sync): LBM = c1·(altura²/Z) + c2·peso + c3·idade + c4.
 * Sem impedância plausível, cai na estimativa de Deurenberg por IMC.
 */
export function estimateBodyFatPct(params: {
  impedanceOhm: number | null;
  weightKg: number;
  heightCm: number | null;
  ageYears: number | null;
  isMale: boolean | null;
}): number | null {
  const { impedanceOhm, weightKg, heightCm, ageYears, isMale } = params;
  if (!heightCm || !ageYears || isMale == null || weightKg <= 0) return null;

  let pct: number | null = null;
  if (impedanceOhm != null && impedanceOhm >= IMPEDANCE_PLAUSIBLE_MIN && impedanceOhm <= IMPEDANCE_PLAUSIBLE_MAX) {
    const [c1, c2, c3, c4] = isMale ? [0.503, 0.165, -0.158, 17.8] : [0.49, 0.15, -0.13, 11.5];
    const lbm = c1 * ((heightCm * heightCm) / impedanceOhm) + c2 * weightKg + c3 * ageYears + c4;
    if (lbm > 0 && lbm < weightKg) pct = ((weightKg - lbm) / weightKg) * 100;
  }

  if (pct == null) {
    // Deurenberg (IMC): BF% = 1.2·IMC + 0.23·idade − 10.8·sexo − 5.4
    const bmi = weightKg / ((heightCm / 100) ** 2);
    pct = 1.2 * bmi + 0.23 * ageYears - 10.8 * (isMale ? 1 : 0) - 5.4;
  }

  if (pct < 3 || pct > 60) return null;
  return Math.round(pct * 10) / 10;
}
