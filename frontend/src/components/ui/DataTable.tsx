import type { ReactNode } from 'react';
import { cn } from './cn';

export type DataTableAlign = 'left' | 'right' | 'center';

export type DataTableColumn<Row> = {
  id: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  /** `right` recommandé pour les montants. */
  align?: DataTableAlign;
  className?: string;
};

export type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowId: (row: Row) => string;
  /** Contenu affiché quand `rows` est vide. */
  empty?: ReactNode;
  /** Nom accessible du tableau (légende masquée). */
  caption?: string;
  className?: string;
};

const alignClass: Record<DataTableAlign, string> = {
  left: 'text-left',
  right: 'text-right tabular-nums',
  center: 'text-center',
};

/** Tableau de données générique, défilement horizontal si nécessaire. */
export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  empty = 'Aucun élément à afficher.',
  caption,
  className,
}: DataTableProps<Row>) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)]',
        className,
      )}
    >
      <table className="w-full min-w-full border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="bg-[var(--odoo-table-head-bg)]">
          <tr className="border-b border-[var(--odoo-border)]">
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={cn(
                  'px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]',
                  alignClass[col.align ?? 'left'],
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-[var(--color-muted)]">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowId(row)}
                className="border-b border-[var(--odoo-border)] text-[var(--color-ink)] last:border-b-0 hover:bg-[var(--odoo-row-hover)]"
              >
                {columns.map((col) => (
                  <td key={col.id} className={cn('px-3 py-2.5 align-middle', alignClass[col.align ?? 'left'], col.className)}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
