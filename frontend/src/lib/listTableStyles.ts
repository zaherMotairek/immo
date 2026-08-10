/**
 * Styles communs pour les tableaux et listes « données » — rendu type liste Odoo.
 */

import type { MouseEvent } from 'react';

/** Éléments interactifs : un double-clic sur la ligne ne doit pas les déclencher. */
const LIST_ROW_OPEN_IGNORE =
  'a, button, input, textarea, select, label, summary, details, [role="button"], [data-no-row-open]';

export function shouldIgnoreListRowOpen(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true;
  return !!target.closest(LIST_ROW_OPEN_IGNORE);
}

/** Double-clic sur une ligne → ouvrir la fiche (sauf liens / boutons). */
export function onListRowDoubleClick(e: MouseEvent, open: () => void): void {
  if (shouldIgnoreListRowOpen(e.target)) return;
  open();
}

export const listTableRowOpenableClass = 'cursor-pointer';

/** Classes pour `<tr>` ouvrable au double-clic (curseur + titre). */
export function listTableOpenableRowClass(rowIndex: number, extra = ''): string {
  return `${listTableDataRowClass(rowIndex)} ${listTableRowOpenableClass} ${extra}`.trim();
}

/** Première cellule (sans liseré latéral — séparation uniquement entre les lignes). */
export const listTableFirstCellClass = 'px-3 py-1.5 sm:px-3.5 sm:py-2';

/** Cellules suivantes (sans liseré). */
export const listTableCellClass = 'px-3 py-1.5 text-[0.875rem] sm:px-3.5 sm:py-2';

/** Ligne en édition / mise en avant. */
export const listTableRowEditingClass =
  'border-b border-[var(--odoo-border)] bg-brand-50/80 dark:border-zinc-600 dark:bg-brand-950/35';

export const listTableEditingFirstCellClass =
  'border-l-[3px] border-l-brand-600 px-3 py-2 pl-[10px] sm:px-3.5 sm:py-2.5 sm:pl-[14px] dark:border-l-brand-500';

const stripeEven = 'bg-[var(--color-surface)]';
const stripeOdd = 'bg-[var(--odoo-table-head-bg)]/35';

function stripeClass(rowIndex: number): string {
  return rowIndex % 2 === 0 ? stripeEven : stripeOdd;
}

/** Classes pour `<tr>` de données (zébrage, survol — trait horizontal via CSS global). */
export function listTableDataRowClass(rowIndex: number): string {
  return `align-middle transition-colors hover:bg-[var(--odoo-row-hover)] ${stripeClass(rowIndex)}`;
}

/**
 * Ligne de liste en `<ul>` / `<li>` : trait horizontal sous la ligne uniquement.
 */
export function listBlockRowClass(rowIndex: number): string {
  return `flex flex-col gap-0.5 border-b border-[var(--odoo-border)] py-2 pl-3 pr-3 transition-colors hover:bg-[var(--odoo-row-hover)] dark:border-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:py-1.5 sm:pl-4 sm:pr-4 ${stripeClass(rowIndex)}`;
}

/** En-tête de tableau : appliquer sur `<table className="odoo-list-table w-full ...">`. */
export const listTableClassName = 'odoo-list-table w-full text-[0.875rem]';
