/**
 * Styles communs pour les tableaux et listes « données » (zébrage, séparation, liseré gauche).
 * Utiliser sur Locataires, Baux, Paiements, unités, cautions, etc.
 */

/** Première cellule d’une ligne de données : liseré bleu + padding vertical généreux. */
export const listTableFirstCellClass =
  'border-l-[3px] border-l-brand-500/55 px-3 py-2.5 pl-[10px] sm:px-5 sm:py-4 sm:pl-[17px] dark:border-l-brand-400/45';

/** Cellules suivantes (sans liseré). */
export const listTableCellClass = 'px-3 py-2.5 sm:px-5 sm:py-4';

/** Ligne en édition / mise en avant (locataires, etc.). */
export const listTableRowEditingClass =
  'border-b-2 border-slate-200/90 bg-brand-50/70 dark:border-slate-600 dark:bg-brand-950/30';

export const listTableEditingFirstCellClass =
  'border-l-[3px] border-l-brand-600/60 px-3 py-2.5 pl-[10px] sm:px-5 sm:py-4 sm:pl-[17px] dark:border-l-brand-400/50';

const stripeEven = 'bg-white dark:bg-slate-900/45';
const stripeOdd = 'bg-slate-50/95 dark:bg-slate-800/55';

function stripeClass(rowIndex: number): string {
  return rowIndex % 2 === 0 ? stripeEven : stripeOdd;
}

/** Classes pour `<tr>` de données (bordure bas, zébrage, survol). */
export function listTableDataRowClass(rowIndex: number): string {
  return `align-top border-b-2 border-slate-200/90 transition-colors hover:bg-slate-100/90 dark:border-slate-600/70 dark:hover:bg-slate-700/45 ${stripeClass(rowIndex)}`;
}

/**
 * Ligne de liste en `<ul>` / `<li>` (ex. charges) : même logique visuelle que les tableaux.
 */
export function listBlockRowClass(rowIndex: number): string {
  return `flex flex-col gap-1 border-b-2 border-slate-200/90 border-l-[3px] border-l-brand-500/55 py-2.5 pl-3 pr-3 transition-colors hover:bg-slate-100/90 dark:border-slate-600/70 dark:border-l-brand-400/45 dark:hover:bg-slate-700/45 sm:flex-row sm:items-center sm:justify-between sm:py-4 sm:pl-5 sm:pr-4 ${stripeClass(rowIndex)}`;
}
