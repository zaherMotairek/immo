import type { ViewMonth } from './types';

export const MOIS_LONGS = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2000, i, 1)),
);

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Année et mois initiaux : paramètres d'URL si valides, sinon mois courant. */
export function readInitialPeriod(): { y: number; viewMonth: ViewMonth } {
  const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const now = new Date();
  let y = now.getFullYear();
  let viewMonth: ViewMonth = now.getMonth() + 1;
  if (sp) {
    const yp = sp.get('year');
    if (yp) {
      const n = Number(yp);
      if (Number.isFinite(n)) y = n;
    }
    const mp = sp.get('month');
    if (mp === 'all') viewMonth = 'all';
    else if (mp != null && mp !== '') {
      const n = Number(mp);
      if (Number.isFinite(n) && n >= 1 && n <= 12) viewMonth = n;
    }
  }
  return { y, viewMonth };
}

export function periodLabel(y: number, viewMonth: ViewMonth): string {
  return viewMonth === 'all' ? `Année ${y}` : `${capitalize(MOIS_LONGS[viewMonth - 1])} ${y}`;
}

/** Surbrillance de ligne (retour depuis une fiche). */
export function chargeRowFlashClass(active: boolean): string {
  return active
    ? 'bg-brand-50/90 ring-2 ring-inset ring-brand-600/80 dark:bg-brand-950/45 dark:ring-brand-400/80'
    : '';
}
