import { FicheLocationLink } from '@/components/FicheLocationLink';
import { SmartLink } from '@/components/SmartLink';
import { SortableTh } from '@/components/SortableTh';
import { StatusBadge } from '@/components/ui/index';
import { fcfa, formatDateFr } from '@/lib/format';
import {
  listTableCellClass,
  listTableDataRowClass,
  listTableFirstCellClass,
  listTableRowOpenableClass,
  onListRowClick,
} from '@/lib/listTableStyles';
import type { TableSortDir } from '@/lib/tableSort';
import { unitKindLabel } from '@/lib/unitKind';
import { LeaseActionsMenu, LeaseContractDetails } from './LeaseRowMenus';
import { leaseRowFlashClass } from './leaseUtils';
import type { LeaseSortKey, LeasesViewProps } from './types';

type LeasesTableProps = LeasesViewProps & {
  sort: { key: LeaseSortKey; dir: TableSortDir; onSort: (k: LeaseSortKey) => void };
};

const thPad = 'px-4 py-2.5 sm:px-5';
const thStatic = `${thPad} text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]`;

/** Tableau desktop des baux (tri, ouverture de la fiche au clic, contrat et actions par ligne). */
export function LeasesTable({
  leases,
  genYear,
  flashLeaseRowId,
  onOpen,
  onChanged,
  onGeneratePayments,
  onToggleActive,
  sort,
}: LeasesTableProps) {
  const sortProps = { activeKey: sort.key, dir: sort.dir, onSort: sort.onSort };
  return (
    <div className="table-scroll overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm md:min-w-[1120px]">
        <thead>
          <tr className="border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)]">
            <SortableTh label="Locataire" columnKey="tenant" {...sortProps} />
            <SortableTh label="Bien" columnKey="building" {...sortProps} />
            <SortableTh label="Unité" columnKey="unit" {...sortProps} />
            <SortableTh label="Loyer" columnKey="rent" {...sortProps} />
            <SortableTh label="Début" columnKey="start" {...sortProps} />
            <SortableTh label="Statut" columnKey="status" {...sortProps} />
            <th className={`whitespace-nowrap ${thStatic}`} title="Fiche du bail (location)">
              Fiche location
            </th>
            <th className={`min-w-[10rem] ${thStatic}`}>Contrat</th>
            <th className={`w-[1%] whitespace-nowrap text-right ${thStatic}`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leases.map((l, rowIndex) => (
            <tr
              key={l.id}
              id={`lease-row-${l.id}`}
              title="Clic pour ouvrir la fiche location"
              onClick={(e) => onListRowClick(e, () => onOpen(l.id))}
              className={`scroll-mt-28 ${listTableDataRowClass(rowIndex)} ${listTableRowOpenableClass} ${leaseRowFlashClass(flashLeaseRowId === l.id)}`}
            >
              <td className={`${listTableFirstCellClass} font-medium text-[var(--color-ink)]`}>
                <SmartLink
                  to={`/locataires?edit=${encodeURIComponent(l.tenant.id)}`}
                  returnFocusId={l.id}
                  className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
                >
                  {l.tenant.firstName} {l.tenant.lastName}
                </SmartLink>
              </td>
              <td className={`${listTableCellClass} text-[var(--color-ink)]`}>
                <div className="min-w-0">
                  <SmartLink
                    to={`/biens/${l.unit.building.id}?returnLocation=${encodeURIComponent('/baux')}`}
                    returnFocusId={l.id}
                    className="block font-medium underline-offset-2 hover:underline"
                  >
                    {l.unit.building.name}
                  </SmartLink>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    {l.unit.building.commune}, {l.unit.building.city}
                  </p>
                </div>
              </td>
              <td className={`${listTableCellClass} text-[var(--color-ink)]`}>
                <SmartLink
                  to={`/biens/${l.unit.building.id}?unitId=${encodeURIComponent(l.unit.id)}&hintUnitLabel=${encodeURIComponent(l.unit.label)}&returnLocation=${encodeURIComponent('/baux')}`}
                  returnFocusId={l.id}
                  className="block min-w-0 underline-offset-2 hover:underline"
                >
                  <span className="text-[11px] text-[var(--color-muted)]">{unitKindLabel(l.unit.kind)}</span>
                  <p className="font-medium">{l.unit.label}</p>
                </SmartLink>
              </td>
              <td className={`${listTableCellClass} tabular-nums text-[var(--color-ink)]`}>
                <p className="font-semibold">{fcfa(Number(l.monthlyRent))}</p>
                <p className="text-xs text-[var(--color-muted)]">/ mois · le {l.rentDueDay}</p>
                {l.depositAmount != null && Number(l.depositAmount) > 0 ? (
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    Caution {fcfa(Number(l.depositAmount))}
                    {l.depositPaidAt ? (
                      <span className="text-[var(--status-paid)]"> · enc.</span>
                    ) : (
                      <span className="text-[var(--status-pending)]"> · non enc.</span>
                    )}
                  </p>
                ) : null}
              </td>
              <td className={`${listTableCellClass} text-[var(--color-ink)]`}>
                <p className="text-xs tabular-nums">{formatDateFr(l.startDate)}</p>
                <p className="text-xs text-[var(--color-muted)]">{l.endDate ? `fin ${formatDateFr(l.endDate)}` : 'sans fin'}</p>
              </td>
              <td className={listTableCellClass}>
                <StatusBadge status={l.active ? 'PAID' : 'CANCELLED'} label={l.active ? 'Actif' : 'Inactif'} size="sm" />
              </td>
              <td className={`whitespace-nowrap ${listTableCellClass}`}>
                <FicheLocationLink leaseId={l.id} />
              </td>
              <td className={listTableCellClass}>
                <LeaseContractDetails lease={l} onChanged={onChanged} className="max-w-[14rem]" />
              </td>
              <td className={`text-right align-top ${listTableCellClass}`}>
                <LeaseActionsMenu
                  lease={l}
                  genYear={genYear}
                  onGeneratePayments={onGeneratePayments}
                  onToggleActive={onToggleActive}
                  className="ml-auto inline-block min-w-[8.5rem] max-w-[14rem]"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
