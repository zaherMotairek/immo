import { SmartLink } from '@/components/SmartLink';
import { SortableTh } from '@/components/SortableTh';
import { StatusBadge } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import {
  listTableCellClass,
  listTableDataRowClass,
  listTableFirstCellClass,
  listTableRowOpenableClass,
  onListRowClick,
} from '@/lib/listTableStyles';
import type { AppNavigateState } from '@/lib/navigation';
import { unitKindLabel } from '@/lib/unitKind';
import { hrefBiensUnit, locationSortThBase, rowFlashClass, statusKeyFromFr } from './locationUtils';
import type { LocationSortState, OverviewRow } from './types';

type LocationsTableProps = {
  rows: OverviewRow[];
  sort: LocationSortState;
  flashLeaseId: string | null;
  locationSheetState: AppNavigateState;
  onOpen: (leaseId: string) => void;
  onDelete: (r: OverviewRow) => void;
};

/** Tableau desktop triable des locations. */
export function LocationsTable({
  rows,
  sort,
  flashLeaseId,
  locationSheetState,
  onOpen,
  onDelete,
}: LocationsTableProps) {
  const th = {
    activeKey: sort.key,
    dir: sort.dir,
    onSort: sort.onSort,
    thClassName: locationSortThBase,
  };

  return (
    <div className="table-scroll hidden min-w-0 overflow-x-auto bg-[var(--color-surface)] md:block">
      <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--odoo-border)] bg-[var(--color-surface)]">
            <SortableTh label="Lieu" columnKey="place" {...th} />
            <SortableTh label="Bien / unité" columnKey="buildingUnit" {...th} />
            <SortableTh label="Locataire" columnKey="tenant" {...th} />
            <SortableTh label="Loyer" columnKey="rent" align="end" {...th} />
            <SortableTh label="Échéance" columnKey="dueDay" {...th} />
            <SortableTh label="Mois en cours" columnKey="status" {...th} />
            <SortableTh label="Bail" columnKey="active" {...th} />
            <th className="min-w-0 w-[9rem] whitespace-normal px-2 py-2.5 text-right text-[11px] font-semibold uppercase leading-tight tracking-[0.06em] text-[var(--color-muted)] sm:w-[1%] sm:whitespace-nowrap sm:px-4 lg:px-5">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, rowIndex) => (
            <tr
              key={`table-${r.leaseId}`}
              id={`loc-row-d-${r.leaseId}`}
              title="Clic pour ouvrir la fiche"
              onClick={(e) => onListRowClick(e, () => onOpen(r.leaseId))}
              className={`scroll-mt-28 ${listTableDataRowClass(rowIndex)} ${listTableRowOpenableClass} ${rowFlashClass(flashLeaseId === r.leaseId)}`}
            >
              <td className={`${listTableFirstCellClass} min-w-0 max-w-0 text-[var(--color-muted)]`}>
                <span className="block break-words text-xs leading-snug">{r.localizationLine}</span>
              </td>
              <td className={`${listTableCellClass} min-w-0 break-words px-2 py-3 sm:px-4 sm:py-4 lg:px-5`}>
                <SmartLink
                  to={hrefBiensUnit(r.buildingId, r.unitId, r.unitLabel, `/locations/${r.leaseId}`)}
                  returnFocusId={r.leaseId}
                  className="font-semibold leading-snug text-brand-800 underline-offset-2 hover:underline dark:text-brand-400"
                >
                  {r.buildingName} — {r.unitLabel}
                </SmartLink>
                <p className="mt-0.5 break-words text-xs text-[var(--color-muted)]">{unitKindLabel(r.unitKind)}</p>
              </td>
              <td className={`${listTableCellClass} min-w-0 break-words px-2 py-3 font-medium text-[var(--color-ink)] sm:px-4 sm:py-4 lg:px-5`}>
                <SmartLink
                  to={`/locataires?edit=${encodeURIComponent(r.tenantId)}`}
                  className="leading-snug text-brand-800 underline-offset-2 hover:underline dark:text-brand-400"
                >
                  {r.tenantFullName}
                </SmartLink>
              </td>
              <td className={`${listTableCellClass} min-w-0 px-2 py-3 text-right text-xs tabular-nums font-semibold leading-snug text-[var(--color-ink)] sm:px-4 sm:py-4 sm:text-sm lg:px-5`}>
                {fcfa(r.monthlyRent)}
              </td>
              <td className={`${listTableCellClass} min-w-0 px-2 py-3 tabular-nums text-xs text-[var(--color-muted)] sm:px-4 sm:py-4 sm:text-sm lg:px-5`}>
                le {r.rentDueDay}
              </td>
              <td className={`${listTableCellClass} min-w-0 px-2 py-3 sm:px-4 sm:py-4 lg:px-5`}>
                <StatusBadge
                  status={statusKeyFromFr(r.currentMonthStatusFr)}
                  label={r.currentMonthStatusFr}
                  size="sm"
                  className="max-w-full break-words"
                />
              </td>
              <td className={`${listTableCellClass} min-w-0 px-2 py-3 text-xs font-medium text-[var(--color-muted)] sm:px-4 sm:py-4 lg:px-5`}>
                {r.active ? 'Actif' : 'Inactif'}
              </td>
              <td className={`${listTableCellClass} min-w-0 px-2 py-3 text-right sm:px-4 sm:py-4 lg:px-5`}>
                <div className="flex flex-col items-end gap-1 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-1.5">
                  <SmartLink
                    to={`/locations/${r.leaseId}`}
                    state={locationSheetState}
                    returnFocusId={r.leaseId}
                    className="inline-block rounded-md px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
                  >
                    Fiche
                  </SmartLink>
                  <button
                    type="button"
                    className="inline-block rounded-md px-2 py-1 text-xs font-semibold text-[var(--status-late)] hover:bg-[var(--status-late-bg)]"
                    onClick={() => onDelete(r)}
                  >
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
