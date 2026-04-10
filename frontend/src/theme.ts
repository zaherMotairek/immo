export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'immopilot-theme';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'light';
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'dark' ? 'dark' : 'light';
}

/** À appeler au chargement (avant le 1er rendu) pour éviter un flash. */
export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  root.style.colorScheme = mode === 'dark' ? 'dark' : 'light';
}

export function persistTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function toggleTheme(mode: ThemeMode): ThemeMode {
  return mode === 'dark' ? 'light' : 'dark';
}
