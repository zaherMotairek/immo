/** Montants affichés en FCFA (usage Côte d'Ivoire). */
export function fcfa(n: number) {
  return new Intl.NumberFormat('fr-CI', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(n);
}

/** @deprecated Utilisez `fcfa` — alias conservé pour compatibilité. */
export const eur = fcfa;

/** Entier avec séparateurs milliers (sans devise), ex. pour placeholders. */
export function formatIntegerFr(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
}

const FR_GROUP_SPACE = /[\u202f\u00a0]/g;

/** Chaîne de chiffres seuls → affichage « 1 000 000 » (espaces classiques, pour les champs montant). */
export function formatAmountDigitsGrouped(digits: string): string {
  if (!digits) return '';
  const n = Number(digits);
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n).replace(FR_GROUP_SPACE, ' ');
}

/** Libellé standard des champs saisie (loyers, charges, etc.). Utiliser avec `AmountFcfaInput` dans `@/components/ui`. */
export const INPUT_AMOUNT_FCFA_LABEL = 'Montant (FCFA)';

export function monthLabel(y: number, m: number) {
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/** Affichage date court FR: jour/mois/année (ex: 23/04/2026). */
export function formatDateFr(value: string | Date | null | undefined): string {
  if (!value) return '—';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '—';
    return value.toLocaleDateString('fr-FR');
  }
  const s = value.trim();
  if (!s) return '—';
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/)?.[0];
  const raw = ymd ?? s;
  const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd ?? s;
  return d.toLocaleDateString('fr-FR');
}
