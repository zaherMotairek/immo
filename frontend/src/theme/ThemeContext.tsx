/* eslint-disable react-refresh/only-export-components -- provider + hook dans un seul fichier. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { applyTheme, getStoredTheme, persistTheme, toggleTheme, type ThemeMode } from '@/theme';

type Ctx = {
  theme: ThemeMode;
  setTheme: (m: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());

  const setTheme = useCallback((m: ThemeMode) => {
    setThemeState(m);
    applyTheme(m);
    persistTheme(m);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = toggleTheme(prev);
      applyTheme(next);
      persistTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeContext);
  if (!c) throw new Error('useTheme doit être utilisé sous ThemeProvider');
  return c;
}
