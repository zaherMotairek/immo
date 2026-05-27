/**
 * Styles communs pour les tableaux et listes « données » — rendu type liste Odoo.
 */

/** Première cellule : accent de module discret. */
export const listTableFirstCellClass =
  'border-l-[3px] border-l-brand-600/70 px-3 py-2 pl-[10px] sm:px-4 sm:py-2.5 sm:pl-[14px] dark:border-l-brand-500/55';

/** Cellules suivantes (sans liseré). */
export const listTableCellClass = 'px-3 py-2 text-[0.94rem] sm:px-4 sm:py-2.5';

/** Ligne en édition / mise en avant. */
export const listTableRowEditingClass =
  'border-b border-[var(--odoo-border)] bg-brand-50/80 dark:border-zinc-600 dark:bg-brand-950/35';

export const listTableEditingFirstCellClass =
  'border-l-[3px] border-l-brand-600 px-3 py-2 pl-[10px] sm:px-4 sm:py-2.5 sm:pl-[14px] dark:border-l-brand-500';

const stripeEven = 'bg-[var(--color-surface)] dark:bg-zinc-900/40';
const stripeOdd = 'bg-[var(--odoo-table-head-bg)]/40 dark:bg-zinc-800/40';

function stripeClass(rowIndex: number): string {
  return rowIndex % 2 === 0 ? stripeEven : stripeOdd;
}

/** Classes pour `<tr>` de données (bordure bas, zébrage, survol). */
export function listTableDataRowClass(rowIndex: number): string {
  return `align-top border-b border-[var(--odoo-border-subtle)] transition-colors hover:bg-[var(--odoo-row-hover)] dark:border-zinc-700/80 dark:hover:bg-zinc-800/60 ${stripeClass(rowIndex)}`;
}

/**
 * Ligne de liste en `<ul>` / `<li>` : même logique visuelle que les tableaux.
 */
export function listBlockRowClass(rowIndex: number): string {
  return `flex flex-col gap-1 border-b border-[var(--odoo-border-subtle)] border-l-[3px] border-l-brand-600/70 py-2.5 pl-3 pr-3 transition-colors hover:bg-[var(--odoo-row-hover)] dark:border-zinc-700/80 dark:border-l-brand-500/55 dark:hover:bg-zinc-800/60 sm:flex-row sm:items-center sm:justify-between sm:py-2.5 sm:pl-4 sm:pr-4 ${stripeClass(rowIndex)}`;
}

/** En-tête de tableau : appliquer sur `<table className="odoo-list-table w-full ...">`. */
export const listTableClassName = 'odoo-list-table w-full text-[0.94rem]';
