/** Preview Phase 2 — options Calm ledger (DEV / choix produit). Pas de logique métier. */

export type DesignOption = 'a' | 'b';

const STORAGE_KEY = 'immopilot-ds-option';
const ATTR = 'data-ds-option';

export function isDesignOption(v: string | null | undefined): v is DesignOption {
  return v === 'a' || v === 'b';
}

export function getStoredDesignOption(): DesignOption | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isDesignOption(v) ? v : null;
  } catch {
    return null;
  }
}

export function persistDesignOption(option: DesignOption | null) {
  try {
    if (option == null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, option);
  } catch {
    /* ignore */
  }
}

/** Applique (ou retire) la preview visuelle sur <html>. */
export function applyDesignOption(option: DesignOption | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (option == null) root.removeAttribute(ATTR);
  else root.setAttribute(ATTR, option);
}

/** Lit ?ds=a|b (prioritaire) puis localStorage. */
export function resolveDesignOptionFromUrl(search = typeof window !== 'undefined' ? window.location.search : ''): DesignOption | null {
  try {
    const q = new URLSearchParams(search).get('ds');
    if (isDesignOption(q)) return q;
  } catch {
    /* ignore */
  }
  return getStoredDesignOption();
}

export function bootstrapDesignPreview() {
  applyDesignOption(resolveDesignOptionFromUrl());
}

export const DESIGN_OPTIONS: {
  id: DesignOption;
  title: string;
  accent: string;
  accentHex: string;
  sidebar: string;
  summary: string;
}[] = [
  {
    id: 'a',
    title: 'Option A — Teal + sidebar sombre',
    accent: 'Teal profond',
    accentHex: '#0F766E',
    sidebar: 'Sombre (pierre / noir chaud)',
    summary: 'Contraste fort navigation / contenu ; accent teal rassurant type fintech.',
  },
  {
    id: 'b',
    title: 'Option B — Emerald + sidebar claire',
    accent: 'Emerald',
    accentHex: '#047857',
    sidebar: 'Claire (neutres chauds)',
    summary: 'Coquille plus légère, outdoor-friendly ; accent emerald plus « ledger ».',
  },
];
