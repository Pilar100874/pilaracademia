import { useEffect, useState } from 'react';

const KEY = 'pilar.showExerciseReason';
const EVENT = 'exercise-reason-changed';

export function getShowExerciseReason(): boolean {
  if (typeof window === 'undefined') return true;
  const v = localStorage.getItem(KEY);
  return v === null ? true : v === 'true';
}

export function setShowExerciseReason(value: boolean) {
  localStorage.setItem(KEY, String(value));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
}

export function useShowExerciseReason() {
  const [enabled, setEnabledState] = useState<boolean>(() => getShowExerciseReason());

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<boolean>;
      setEnabledState(ce.detail);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const setEnabled = (v: boolean) => {
    setShowExerciseReason(v);
    setEnabledState(v);
  };

  return [enabled, setEnabled] as const;
}
