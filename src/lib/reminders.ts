/**
 * Sistema simples de lembretes locais via Notification API.
 *
 * Limitações: notificações disparam apenas quando o app está aberto OU
 * quando o service worker está ativo (PWA instalado). Não há push remoto.
 * Para alcance maior, integrar com Web Push + servidor depois.
 */

const STORAGE_KEY = 'pilar:reminders:v1';

export interface ReminderSettings {
  water: boolean;        // a cada 2h durante o dia
  weeklyWeight: boolean; // domingo de manhã
  workout: boolean;      // 1h antes do horário típico
  enabled: boolean;
}

const DEFAULT: ReminderSettings = {
  water: false,
  weeklyWeight: false,
  workout: false,
  enabled: false,
};

export function loadReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<ReminderSettings>) };
  } catch {
    return DEFAULT;
  }
}

export function saveReminderSettings(s: ReminderSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

export function notify(title: string, body: string, tag?: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    });
  } catch {
    // service worker fallback (PWA installed)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, { body, tag, icon: '/icons/icon-192.png' });
      }).catch(() => {});
    }
  }
}

let intervalHandle: number | null = null;

/**
 * Agenda checagens horárias enquanto o app estiver aberto.
 * Dispara lembretes de água (de 2h em 2h, das 8h às 22h),
 * peso semanal (domingo às 9h) e treino (placeholder das 18h).
 */
export function startRemindersLoop(): void {
  stopRemindersLoop();
  const tick = () => {
    const settings = loadReminderSettings();
    if (!settings.enabled) return;
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const day = now.getDay();
    const dayKey = now.toISOString().slice(0, 10);

    if (settings.water && hour >= 8 && hour <= 22 && hour % 2 === 0 && minute < 5) {
      const lastKey = `pilar:rem:water:${dayKey}:${hour}`;
      if (!localStorage.getItem(lastKey)) {
        localStorage.setItem(lastKey, '1');
        notify('💧 Hora de hidratar', 'Que tal um copo de água agora?', 'water');
      }
    }

    if (settings.weeklyWeight && day === 0 && hour === 9 && minute < 5) {
      const lastKey = `pilar:rem:weight:${dayKey}`;
      if (!localStorage.getItem(lastKey)) {
        localStorage.setItem(lastKey, '1');
        notify('⚖️ Pesagem semanal', 'Registre seu peso para acompanhar a evolução.', 'weight');
      }
    }

    if (settings.workout && hour === 18 && minute < 5) {
      const lastKey = `pilar:rem:workout:${dayKey}`;
      if (!localStorage.getItem(lastKey)) {
        localStorage.setItem(lastKey, '1');
        notify('🏋️ Hora do treino', 'Não esqueça do treino de hoje!', 'workout');
      }
    }
  };

  // first tick immediately, then every 5 min
  tick();
  intervalHandle = window.setInterval(tick, 5 * 60 * 1000);
}

export function stopRemindersLoop(): void {
  if (intervalHandle !== null) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
