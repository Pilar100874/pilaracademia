import { useEffect } from 'react';

/**
 * Mantém a tela do dispositivo acesa enquanto o app está aberto, usando a
 * Screen Wake Lock API (suportada em Chrome/Edge/Safari modernos no Android
 * e iOS 16.4+). Re-adquire automaticamente quando o usuário volta para a
 * aba — necessário porque o sistema libera o lock ao esconder a página.
 *
 * Falha silenciosamente em navegadores sem suporte ou quando a permissão
 * é negada — não bloqueia nada da UI.
 */
export function useWakeLock(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === 'undefined') return;
    const anyNav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
    };
    if (!anyNav.wakeLock) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        if (document.visibilityState !== 'visible') return;
        sentinel = await anyNav.wakeLock!.request('screen');
        if (cancelled) {
          sentinel.release().catch(() => {});
          sentinel = null;
          return;
        }
        sentinel.addEventListener('release', () => {
          sentinel = null;
        });
      } catch {
        /* ignore — usuário negou, bateria baixa, etc. */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !sentinel) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [enabled]);
}

interface WakeLockSentinel extends EventTarget {
  release(): Promise<void>;
}
