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

export function monthLabel(y: number, m: number) {
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
