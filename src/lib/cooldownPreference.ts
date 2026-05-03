import { useEffect, useState } from 'react';

const KEY = 'pilar.cooldownPromptEnabled';

export function getCooldownPromptEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const v = localStorage.getItem(KEY);
  return v === null ? true : v === 'true';
}

export function setCooldownPromptEnabled(value: boolean) {
  localStorage.setItem(KEY, String(value));
  window.dispatchEvent(new CustomEvent('cooldown-prompt-changed', { detail: value }));
}

export function useCooldownPromptEnabled() {
  const [enabled, setEnabledState] = useState<boolean>(() => getCooldownPromptEnabled());

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<boolean>;
      setEnabledState(ce.detail);
    };
    window.addEventListener('cooldown-prompt-changed', handler);
    return () => window.removeEventListener('cooldown-prompt-changed', handler);
  }, []);

  const setEnabled = (v: boolean) => {
    setCooldownPromptEnabled(v);
    setEnabledState(v);
  };

  return [enabled, setEnabled] as const;
}
