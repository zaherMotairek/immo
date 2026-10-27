/** Direction visuelle Calm ledger — Option B figée (Phase 3). */

export type DesignOption = 'a' | 'b';

const STORAGE_KEY = 'immopilot-ds-option';
const ATTR = 'data-ds-option';

export function isDesignOption(v: string | null | undefined): v is DesignOption {
  return v === 'a' || v === 'b';
}

export function getStoredDesignOption(): DesignOption {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'b';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isDesignOption(v) ? v : 'b';
  } catch {
    return 'b';
  }
}

export function persistDesignOption(option: DesignOption) {
  try {
    localStorage.setItem(STORAGE_KEY, option);
  } catch {
    /* ignore */
  }
}

/** Applique l’option sur <html>. Défaut produit = B (pas d’attribut nécessaire). */
export function applyDesignOption(option: DesignOption) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (option === 'b') root.removeAttribute(ATTR);
  else root.setAttribute(ATTR, option);
}

export function resolveDesignOptionFromUrl(
  search = typeof window !== 'undefined' ? window.location.search : '',
): DesignOption {
  try {
    const q = new URLSearchParams(search).get('ds');
    if (isDesignOption(q)) return q;
  } catch {
    /* ignore */
  }
  return getStoredDesignOption();
}

export function bootstrapDesignPreview() {
  const opt = resolveDesignOptionFromUrl();
  applyDesignOption(opt);
  persistDesignOption(opt);
}

export const DESIGN_OPTIONS: {
  id: DesignOption;
  title: string;
  accent: string;
  accentHex: string;
  sidebar: string;
  summary: string;
  locked?: boolean;
}[] = [
  {
    id: 'b',
    title: 'Option B — Emerald + sidebar claire',
    accent: 'Emerald',
    accentHex: '#047857',
    sidebar: 'Claire (neutres chauds)',
    summary: 'Direction produit figée (Phase 3).',
    locked: true,
  },
  {
    id: 'a',
    title: 'Option A — Teal + sidebar sombre (archive)',
    accent: 'Teal profond',
    accentHex: '#0F766E',
    sidebar: 'Sombre',
    summary: 'Conservée pour comparaison DEV uniquement.',
  },
];
