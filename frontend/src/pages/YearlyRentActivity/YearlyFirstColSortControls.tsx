import type { TableSortDir } from '@/lib/tableSort';
import type { YearlyLeaseSortKey } from './types';

type YearlyFirstColSortControlsProps = {
  scope: 'tenant' | 'building';
  activeKey: YearlyLeaseSortKey;
  dir: TableSortDir;
  onSort: (k: YearlyLeaseSortKey) => void;
};

/** Boutons de tri de la première colonne (lieu / locataire). */
export function YearlyFirstColSortControls({ scope, activeKey, dir, onSort }: YearlyFirstColSortControlsProps) {
  function btn(key: YearlyLeaseSortKey, text: string) {
    const active = activeKey === key;
    return (
      <button
        type="button"
        onClick={() => onSort(key)}
        className={`inline-flex max-w-full items-center gap-1 rounded-md text-left text-[10px] font-semibold uppercase tracking-wide transition hover:text-brand-700 dark:hover:text-brand-300 ${
          active ? 'text-brand-700 dark:text-brand-400' : 'text-[var(--color-muted)]'
        }`}
        aria-label={`Trier par ${text}${active ? ` (${dir === 'asc' ? 'croissant' : 'décroissant'})` : ''}`}
      >
        <span>{text}</span>
        <span className="select-none font-normal tabular-nums opacity-75" aria-hidden>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      {btn('label', scope === 'tenant' ? 'Bail (lieu)' : 'Lieu')}
      {btn('sub', 'Locataire · nature')}
    </div>
  );
}
