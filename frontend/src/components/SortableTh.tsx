import type { ReactNode } from 'react';
import type { TableSortDir } from '@/lib/tableSort';

type SortableThProps<K extends string> = {
  label: ReactNode;
  columnKey: K;
  activeKey: K;
  dir: TableSortDir;
  onSort: (k: K) => void;
  align?: 'start' | 'end' | 'center';
  /** Classes CSS du `<th>` (padding, sticky, couleurs de fond, etc.). */
  thClassName?: string;
  scope?: 'col' | 'row';
};

export function SortableTh<K extends string>({
  label,
  columnKey,
  activeKey,
  dir,
  onSort,
  align = 'start',
  thClassName = 'whitespace-nowrap px-4 py-2.5 sm:px-5',
  scope = 'col',
}: SortableThProps<K>) {
  const active = activeKey === columnKey;
  const thAlign = align === 'end' ? 'text-right' : align === 'center' ? 'text-center' : '';
  const btnJustify =
    align === 'end' ? 'w-full justify-end' : align === 'center' ? 'w-full justify-center' : 'text-left';

  return (
    <th scope={scope} className={`${thAlign} ${thClassName}`.trim()}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-md text-[11px] font-semibold uppercase tracking-[0.06em] transition hover:text-brand-700 dark:hover:text-brand-300 ${btnJustify} ${
          active ? 'text-brand-700 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'
        }`}
        aria-label={`Trier par ${typeof label === 'string' ? label : 'colonne'}${active ? ` (${dir === 'asc' ? 'croissant' : 'décroissant'})` : ''}`}
      >
        <span>{label}</span>
        <span className="select-none font-normal tabular-nums opacity-75" aria-hidden>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  );
}
