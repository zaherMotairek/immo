import { Button, Card } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import { isOverduePayment, paymentRemaining } from '@/lib/paymentRow';
import type { PaymentRow } from '@/lib/paymentRow';
import { monthTitle } from '@/lib/paymentStatusUi';
import { PaymentsCardList } from './PaymentsCardList';
import { PaymentsTable } from './PaymentsTable';
import type { MonthGroup, PaymentSortState, PaymentsListProps } from './types';
import { useIsDesktop } from './useIsDesktop';

type PaymentsMonthListProps = Omit<PaymentsListProps, 'items' | 'monthLabel'> & {
  monthGroups: MonthGroup[];
  totalRows: number;
  collapsedMonthKeys: Set<string>;
  onToggleMonth: (key: string) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  sort: PaymentSortState;
};

function MonthSummaryButton({
  monthKey,
  items,
  collapsed,
  onToggle,
}: {
  monthKey: string;
  items: PaymentRow[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [yStr, mStr] = monthKey.split('-');
  const py = Number(yStr);
  const pm = Number(mStr);
  const monthDue = items.reduce((acc, p) => acc + Number(p.amountDue), 0);
  const monthPending = items.filter((p) => p.status === 'PENDING' || p.status === 'LATE');
  const monthPendingSum = monthPending.reduce((acc, p) => acc + paymentRemaining(p), 0);
  const overdueInMonth = items.filter((p) => isOverduePayment(p)).length;

  return (
    <button
      type="button"
      id={`payments-month-head-${monthKey}`}
      aria-expanded={!collapsed}
      aria-controls={`payments-month-body-${monthKey}`}
      onClick={onToggle}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--odoo-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600 sm:px-5"
    >
      <span className="w-[7.5rem] shrink-0 sm:w-[9.5rem]">
        <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">{monthTitle(py, pm)}</span>
        <span className="text-[11px] tabular-nums text-[var(--color-muted)]">
          {String(pm).padStart(2, '0')}/{py}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
        <span className="tabular-nums text-[var(--color-muted)]">
          {items.length} échéance{items.length !== 1 ? 's' : ''}
        </span>
        <span className="text-sm font-semibold tabular-nums text-[var(--color-ink)]">{fcfa(monthDue)}</span>
        {monthPending.length > 0 ? (
          <span className="font-semibold tabular-nums text-[var(--status-pending)]">{fcfa(monthPendingSum)} dû</span>
        ) : null}
        {overdueInMonth > 0 ? (
          <span className="rounded-md bg-[var(--status-late-bg)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--status-late)]">
            {overdueInMonth} retard
          </span>
        ) : null}
      </span>
      <svg
        className={`size-4 shrink-0 text-[var(--color-muted)] transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** Détail des échéances, groupé par mois de facturation (repliable) : tableau desktop ou cartes mobile. */
export function PaymentsMonthList({
  monthGroups,
  totalRows,
  collapsedMonthKeys,
  onToggleMonth,
  onCollapseAll,
  onExpandAll,
  sort,
  ...listProps
}: PaymentsMonthListProps) {
  const isDesktop = useIsDesktop();
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 py-2.5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Détail des échéances (par mois de facturation)
          </p>
          <p className="mt-0.5 text-xs font-medium tabular-nums text-[var(--color-muted)]">
            {monthGroups.length} mois · {totalRows} échéance{totalRows !== 1 ? 's' : ''}
          </p>
        </div>
        {monthGroups.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onCollapseAll}>
              Tout replier
            </Button>
            <Button variant="secondary" size="sm" onClick={onExpandAll}>
              Tout déplier
            </Button>
          </div>
        ) : null}
      </div>

      <ul className="m-0 divide-y divide-[var(--odoo-border)] p-0">
        {monthGroups.map(([key, items]) => {
          const collapsed = collapsedMonthKeys.has(key);
          const [yStr, mStr] = key.split('-');
          const monthLabel = monthTitle(Number(yStr), Number(mStr));
          return (
            <li key={key} className="list-none bg-[var(--color-surface)]">
              <MonthSummaryButton monthKey={key} items={items} collapsed={collapsed} onToggle={() => onToggleMonth(key)} />
              <div
                id={`payments-month-body-${key}`}
                className="table-scroll overflow-x-auto border-t border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)]"
                hidden={collapsed}
              >
                {isDesktop ? (
                  <PaymentsTable items={items} monthLabel={monthLabel} sort={sort} {...listProps} />
                ) : (
                  <PaymentsCardList items={items} monthLabel={monthLabel} {...listProps} />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
