import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type DashStyle = 'depth' | 'flat' | 'minimal';

const THEME_KEY = 'pilar.theme';
const DASH_KEY = 'pilar.dashStyle';

type AppearanceContextValue = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  dashStyle: DashStyle;
  setDashStyle: (s: DashStyle) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', isDark);
}

function applyDashStyle(style: DashStyle) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.dashStyle = style;
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'light';
  });
  const [dashStyle, setDashStyleState] = useState<DashStyle>(() => {
    if (typeof window === 'undefined') return 'depth';
    return (localStorage.getItem(DASH_KEY) as DashStyle) || 'depth';
  });

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, [theme]);

  useEffect(() => {
    applyDashStyle(dashStyle);
  }, [dashStyle]);

  const setTheme = useCallback((t: ThemeMode) => {
    localStorage.setItem(THEME_KEY, t);
    setThemeState(t);
  }, []);

  const setDashStyle = useCallback((s: DashStyle) => {
    localStorage.setItem(DASH_KEY, s);
    setDashStyleState(s);
  }, []);

  return (
    <AppearanceContext.Provider value={{ theme, setTheme, dashStyle, setDashStyle }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used within AppearanceProvider');
  return ctx;
}
