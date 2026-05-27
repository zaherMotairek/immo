import type { Location } from 'react-router-dom';

/** État passé aux navigations pour retrouver le fil d’Ariane « Retour » et la position de scroll. */
export type AppNavigateState = {
  from?: string;
  fromLabel?: string;
  /** Liste derrière un panneau latéral (fiche location depuis une liste / lien dédié). */
  backgroundLocation?: Location;
};

export const SCROLL_STORAGE_PREFIX = 'immo:scroll:';

/** Mémorise l’identifiant de ligne (ex. bail, bien) pour retrouver la ligne au retour sur cette liste. */
export const FOCUS_STORAGE_PREFIX = 'immo:focusRow:';

export function saveReturnFocusForPath(listPath: string, rowId: string): void {
  if (!rowId || !listPath) return;
  try {
    sessionStorage.setItem(FOCUS_STORAGE_PREFIX + listPath, rowId);
  } catch {
    /* ignore */
  }
}

/** Lecture sans suppression (pour réessayer après le rendu du tableau). */
export function peekReturnFocusForPath(listPath: string): string | null {
  try {
    return sessionStorage.getItem(FOCUS_STORAGE_PREFIX + listPath);
  } catch {
    return null;
  }
}

/** Lit et supprime l’identifiant de ligne mémorisé pour ce chemin (liste + query). */
export function consumeReturnFocusForPath(listPath: string): string | null {
  const k = FOCUS_STORAGE_PREFIX + listPath;
  try {
    const v = sessionStorage.getItem(k);
    if (v) sessionStorage.removeItem(k);
    return v;
  } catch {
    return null;
  }
}

/** Depuis la recherche globale : mémorise la ligne seulement si la cible correspond à la liste courante. */
export function maybeSaveSearchReturnFocus(fromFullPath: string, to: string): void {
  const listPath = fromFullPath.split('?')[0] || '';
  const mLoc = to.match(/^\/locations\/([^/?#]+)/);
  if (mLoc && (listPath === '/locations' || listPath === '/baux' || listPath === '/cautions')) {
    saveReturnFocusForPath(fromFullPath, mLoc[1]);
  }
  const mBien = to.match(/^\/biens\/([^/?#]+)/);
  if (mBien && listPath === '/biens') {
    saveReturnFocusForPath(fromFullPath, mBien[1]);
  }
  if (listPath === '/paiements' && to.startsWith('/paiements')) {
    try {
      const focus = new URL(to, 'https://local.invalid').searchParams.get('focus');
      if (focus) saveReturnFocusForPath(fromFullPath, focus);
    } catch {
      /* ignore */
    }
  }
  if (listPath === '/locataires' && to.startsWith('/locataires')) {
    try {
      const edit = new URL(to, 'https://local.invalid').searchParams.get('edit');
      if (edit) saveReturnFocusForPath(fromFullPath, edit);
    } catch {
      /* ignore */
    }
  }
}

export function saveScrollForPath(path: string): void {
  try {
    sessionStorage.setItem(SCROLL_STORAGE_PREFIX + path, String(window.scrollY));
  } catch {
    /* ignore */
  }
}

export function isSafeInternalReturnPath(from: string | undefined): boolean {
  if (!from || typeof from !== 'string') return false;
  if (!from.startsWith('/')) return false;
  if (from.startsWith('//')) return false;
  if (from.includes('://')) return false;
  return true;
}

export function inferBackLabelFromPath(fullPath: string): string {
  const path = fullPath.split('?')[0] || fullPath;
  const map: Record<string, string> = {
    '/': 'Tableau de bord',
    '/baux': 'Baux',
    '/locations': 'Locations',
    '/biens': 'Biens',
    '/locataires': 'Locataires',
    '/paiements': 'Paiements',
    '/charges': 'Charges',
    '/cautions': 'Cautions',
    '/exports': 'Export / import',
    '/login': 'Connexion',
    '/activite-loyers': 'Activité loyers',
  };
  if (map[path]) return map[path];
  if (path.startsWith('/locations/')) return 'Locations';
  if (path.startsWith('/biens/')) return 'Biens';
  if (path.startsWith('/locataires')) return 'Locataires';
  return 'Retour';
}

export function resolveReturnTarget(
  state: unknown,
  defaults: { fallbackHref: string; fallbackLabel: string },
  extra?: { returnLocationQuery?: string | null },
): { href: string; label: string } {
  const s = state as AppNavigateState | null | undefined;
  if (s?.from && isSafeInternalReturnPath(s.from)) {
    return {
      href: s.from,
      label: s.fromLabel ?? inferBackLabelFromPath(s.from),
    };
  }
  const q = extra?.returnLocationQuery?.trim();
  if (q && isSafeInternalReturnPath(q)) {
    return {
      href: q,
      label: inferBackLabelFromPath(q),
    };
  }
  return { href: defaults.fallbackHref, label: defaults.fallbackLabel };
}

/** URL de fiche bien avec unité en surbrillance + retour (même usage que les liens « depuis Baux / Charges »). */
export function buildReturnToBuildingUrl(options: {
  buildingId: string;
  unitId?: string;
  hintUnitLabel?: string;
  returnLocation: string;
}): string {
  const q = new URLSearchParams();
  if (options.unitId) {
    q.set('unitId', options.unitId);
    if (options.hintUnitLabel) q.set('hintUnitLabel', options.hintUnitLabel);
  }
  q.set('returnLocation', options.returnLocation);
  return `/biens/${encodeURIComponent(options.buildingId)}?${q.toString()}`;
}

/**
 * Après enregistrement d’un formulaire ouvert depuis une autre page (query `returnLocation`, lien contextuel).
 * Ne fait rien si le chemin n’est pas un chemin interne sûr.
 */
export function navigateAfterCreate(
  navigate: (to: string, opts?: { replace?: boolean }) => void,
  path: string | null | undefined,
): void {
  if (!path || !isSafeInternalReturnPath(path)) return;
  navigate(path, { replace: true });
}
