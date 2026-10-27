import { HelpHint } from '@/components/ui';
import { Button, StatusBadge } from '@/components/ui/index';
import { SortableTh } from '@/components/SortableTh';
import { fcfa } from '@/lib/format';
import { monthTitle, statusLabel } from '@/lib/paymentStatusUi';
import type { PaymentScheduleRow, ScheduleSortKey } from './types';
import type { TableSortDir } from '@/lib/tableSort';

type LocationScheduleTableProps = {
  rows: PaymentScheduleRow[];
  leaseActive: boolean;
  sortKey: ScheduleSortKey;
  sortDir: TableSortDir;
  onSort: (key: ScheduleSortKey) => void;
  onWaive: (paymentId: string) => void;
};

/** Tableau des échéances / gestes commerciaux sur la fiche. */
export function LocationScheduleTable({
  rows,
  leaseActive,
  sortKey,
  sortDir,
  onSort,
  onWaive,
}: LocationScheduleTableProps) {
  if (!rows.length) return null;

  const thClass = 'bg-[var(--odoo-table-head-bg)] px-3 py-2';

  return (
    <div className="mb-5 rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink)]">
          Loyers & gestes commerciaux
        </span>
        <HelpHint title="Gratuité : le mois reste tracé avec son montant théorique, sans encaissement. Motif obligatoire." />
      </div>
      <div className="max-h-72 overflow-auto rounded-md border border-[var(--odoo-border)]">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="sticky top-0 bg-[var(--odoo-table-head-bg)] text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            <tr>
              <SortableTh label="Période" columnKey="period" activeKey={sortKey} dir={sortDir} onSort={onSort} thClassName={thClass} />
              <SortableTh label="Montant dû" columnKey="amount" activeKey={sortKey} dir={sortDir} onSort={onSort} align="end" thClassName={thClass} />
              <SortableTh label="Statut" columnKey="status" activeKey={sortKey} dir={sortDir} onSort={onSort} thClassName={thClass} />
              <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--odoo-border)]">
            {rows.map((row) => {
              const canWaive = leaseActive && (row.status === 'PENDING' || row.status === 'LATE');
              return (
                <tr key={row.id} className="bg-[var(--color-surface)]">
                  <td className="px-3 py-2.5 font-medium text-[var(--color-ink)]">
                    {monthTitle(row.periodYear, row.periodMonth)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--color-ink)]">{fcfa(row.amountDue)}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={row.status} label={statusLabel(row.status)} size="sm" />
                    {row.status === 'WAIVED' && row.waiveReason?.trim() ? (
                      <p className="mt-1 max-w-[14rem] text-xs text-[var(--color-muted)]" title={row.waiveReason}>
                        {row.waiveReason}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {canWaive ? (
                      <Button type="button" variant="secondary" className="py-1.5 text-xs" onClick={() => onWaive(row.id)}>
                        Offrir ce mois
                      </Button>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
