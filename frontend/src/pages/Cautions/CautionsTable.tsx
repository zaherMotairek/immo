import type { NavigateFunction } from 'react-router-dom';
import { FicheLocationLink } from '@/components/FicheLocationLink';
import { SmartLink } from '@/components/SmartLink';
import { SortableTh } from '@/components/SortableTh';
import { Card, EmptyState } from '@/components/ui/index';
import type { AppNavigateState } from '@/lib/navigation';
import {
  listTableCellClass,
  listTableDataRowClass,
  listTableFirstCellClass,
  listTableRowOpenableClass,
  onListRowClick,
} from '@/lib/listTableStyles';
import { fcfa } from '@/lib/format';
import type { TableSortDir } from '@/lib/tableSort';
import { cautionMoisLabel, cautionRowFlash } from './cautionUtils';
import type { CautionSortKey, DepositRow } from './types';

type CautionsTableProps = {
  rows: DepositRow[];
  sortedRows: DepositRow[];
  flashLeaseId: string | null;
  cautionSortKey: CautionSortKey;
  cautionSortDir: TableSortDir;
  onSort: (key: CautionSortKey) => void;
  navigate: NavigateFunction;
  locationSheetState: AppNavigateState;
};

/** Tableau triable des cautions encaissées (clic ligne → fiche location). */
export function CautionsTable({
  rows,
  sortedRows,
  flashLeaseId,
  cautionSortKey,
  cautionSortDir,
  onSort,
  navigate,
  locationSheetState,
}: CautionsTableProps) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="table-scroll overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-left text-sm md:min-w-[760px]">
          <thead>
            <tr className="border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)]">
              <SortableTh
                label="Date encaissement"
                columnKey="date"
                activeKey={cautionSortKey}
                dir={cautionSortDir}
                onSort={onSort}
                thClassName="px-4 py-3 font-semibold text-[var(--color-ink)]"
              />
              <SortableTh
                label="Locataire"
                columnKey="tenant"
                activeKey={cautionSortKey}
                dir={cautionSortDir}
                onSort={onSort}
                thClassName="px-4 py-3 font-semibold text-[var(--color-ink)]"
              />
              <SortableTh
                label="Local"
                columnKey="local"
                activeKey={cautionSortKey}
                dir={cautionSortDir}
                onSort={onSort}
                thClassName="px-4 py-3 font-semibold text-[var(--color-ink)]"
              />
              <SortableTh
                label="Mois (équiv.)"
                columnKey="moisEquiv"
                activeKey={cautionSortKey}
                dir={cautionSortDir}
                onSort={onSort}
                align="end"
                thClassName="whitespace-nowrap px-4 py-3 font-semibold text-[var(--color-ink)]"
              />
              <SortableTh
                label="Montant"
                columnKey="amount"
                activeKey={cautionSortKey}
                dir={cautionSortDir}
                onSort={onSort}
                align="end"
                thClassName="px-4 py-3 font-semibold text-[var(--color-ink)]"
              />
              <SortableTh
                label="Fiche location"
                columnKey="lease"
                activeKey={cautionSortKey}
                dir={cautionSortDir}
                onSort={onSort}
                thClassName="whitespace-nowrap px-4 py-3 font-semibold text-[var(--color-ink)]"
              />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-0">
                  <EmptyState
                    className="rounded-none border-0"
                    title="Aucune caution encaissée enregistrée."
                    description="Renseignez le dépôt sur une fiche location, puis « Marquer la caution encaissée »."
                    action={
                      <SmartLink
                        to="/locations"
                        className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                      >
                        Ouvrir les locations
                      </SmartLink>
                    }
                  />
                </td>
              </tr>
            ) : (
              sortedRows.map((r, rowIndex) => (
                <tr
                  key={r.leaseId}
                  id={`caution-row-${r.leaseId}`}
                  title="Clic pour ouvrir la fiche location"
                  onClick={(e) =>
                    onListRowClick(e, () => navigate(`/locations/${r.leaseId}`, { state: locationSheetState }))
                  }
                  className={`scroll-mt-28 ${listTableDataRowClass(rowIndex)} ${listTableRowOpenableClass} ${cautionRowFlash(flashLeaseId === r.leaseId)}`}
                >
                  <td className={`${listTableFirstCellClass} whitespace-nowrap tabular-nums text-[var(--color-ink)]`}>
                    {r.depositPaidAt}
                  </td>
                  <td className={`${listTableCellClass} font-medium text-[var(--color-ink)]`}>{r.tenantFullName}</td>
                  <td className={`${listTableCellClass} text-[var(--color-ink)]`}>
                    <span className="block text-xs text-[var(--color-muted)]">{r.localizationLine}</span>
                    <span>
                      {r.buildingName} — {r.unitLabel}
                    </span>
                    {!r.active ? (
                      <span className="ml-2 rounded-md bg-[var(--odoo-table-head-bg)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-muted)]">
                        Bail inactif
                      </span>
                    ) : null}
                  </td>
                  <td className={`${listTableCellClass} whitespace-nowrap text-right tabular-nums text-[var(--color-ink)]`}>
                    {cautionMoisLabel(r.monthlyRent, r.depositAmount)}
                  </td>
                  <td className={`${listTableCellClass} whitespace-nowrap text-right font-semibold tabular-nums text-[var(--color-ink)]`}>
                    {fcfa(r.depositAmount)}
                  </td>
                  <td className={listTableCellClass}>
                    <FicheLocationLink leaseId={r.leaseId} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
