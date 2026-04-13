/** État passé aux navigations pour retrouver le fil d’Ariane « Retour » et la position de scroll. */
export type AppNavigateState = {
  from?: string;
  fromLabel?: string;
};

export const SCROLL_STORAGE_PREFIX = 'immo:scroll:';

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
    '/exports': 'Exports',
    '/login': 'Connexion',
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
