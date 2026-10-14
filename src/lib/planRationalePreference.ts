import { useEffect, useState } from 'react';

const KEY = 'pilar.showPlanRationale';
const EVENT = 'plan-rationale-changed';

export function getShowPlanRationale(): boolean {
  if (typeof window === 'undefined') return true;
  const v = localStorage.getItem(KEY);
  return v === null ? true : v === 'true';
}

export function setShowPlanRationale(value: boolean) {
  localStorage.setItem(KEY, String(value));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
}

export function useShowPlanRationale() {
  const [enabled, setEnabledState] = useState<boolean>(() => getShowPlanRationale());

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<boolean>;
      setEnabledState(ce.detail);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const setEnabled = (v: boolean) => {
    setShowPlanRationale(v);
    setEnabledState(v);
  };

  return [enabled, setEnabled] as const;
}
