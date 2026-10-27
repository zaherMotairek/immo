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
import { collectionCollectBadge, paymentRemaining } from '@/lib/paymentRow';
import { statusLabel } from '@/lib/paymentStatusUi';
import { unitKindLabel } from '@/lib/unitKind';
import { paymentCheckboxClass, paymentRowFlash, paymentRowZoomedClass } from './types';
import type { PaymentSortState, PaymentsListProps } from './types';

type PaymentsTableProps = PaymentsListProps & { sort: PaymentSortState };

const thPad = 'px-4 py-2.5 sm:px-5';

/** Tableau desktop des échéances d'un mois (tri, sélection, ouverture du détail au clic). */
export function PaymentsTable({
  items,
  monthLabel,
  selectedIds,
  onToggle,
  onToggleAll,
  zoomPaymentId,
  flashPaymentRowId,
  onOpen,
  sort,
}: PaymentsTableProps) {
  const sortProps = { activeKey: sort.key, dir: sort.dir, onSort: sort.onSort, thClassName: thPad };
  return (
    <table className="w-full min-w-[24rem] border-collapse text-left text-sm md:min-w-[640px]">
      <thead>
        <tr className="border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)]">
          <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-center sm:px-5">
            <input
              type="checkbox"
              className={paymentCheckboxClass}
              checked={items.every((p) => selectedIds.includes(p.id))}
              onChange={(e) => onToggleAll(items, e.target.checked)}
              aria-label={`Sélectionner toutes les lignes de ${monthLabel}`}
            />
          </th>
          <SortableTh label="Locataire" columnKey="tenant" {...sortProps} />
          <SortableTh label="Lieu" columnKey="place" {...sortProps} />
          <SortableTh label="Montant" columnKey="amount" align="end" {...sortProps} />
          <SortableTh label="Période · échéance" columnKey="schedule" {...sortProps} thClassName={`whitespace-nowrap ${thPad}`} />
          <SortableTh label="Statut" columnKey="status" {...sortProps} />
          <th
            className="w-[1%] whitespace-nowrap px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)] sm:px-3"
            aria-label="Détail"
          />
        </tr>
      </thead>
      <tbody>
        {items.map((p, rowIndex) => {
          const collectBadge = collectionCollectBadge(p.collectionTask);
          const tenantName = `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`;
          const partiallyPaid = (p.status === 'PENDING' || p.status === 'LATE') && Number(p.amountPaid ?? 0) > 0;
          return (
            <tr
              key={p.id}
              id={`payment-${p.id}`}
              title="Clic pour ouvrir le détail"
              onClick={(e) => onListRowClick(e, () => onOpen(p.id))}
              className={`scroll-mt-28 ${listTableDataRowClass(rowIndex)} ${listTableRowOpenableClass} ${paymentRowFlash(flashPaymentRowId === p.id)} ${
                zoomPaymentId === p.id ? paymentRowZoomedClass : ''
              }`}
            >
              <td className={`text-center ${listTableCellClass}`} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className={paymentCheckboxClass}
                  checked={selectedIds.includes(p.id)}
                  onChange={() => onToggle(p.id)}
                  aria-label={`Sélectionner le paiement de ${tenantName}`}
                />
              </td>
              <td className={`${listTableFirstCellClass} font-medium text-[var(--color-ink)]`}>
                {p.lease.tenant.id ? (
                  <SmartLink
                    to={`/locataires?edit=${encodeURIComponent(p.lease.tenant.id)}`}
                    returnFocusId={p.id}
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
                  >
                    {tenantName}
                  </SmartLink>
                ) : (
                  <span>{tenantName}</span>
                )}
              </td>
              <td
                className={`max-w-[14rem] truncate ${listTableCellClass} text-[var(--color-ink)]`}
                title={`${p.lease.unit.building.name} — ${unitKindLabel(p.lease.unit.kind)} ${p.lease.unit.label} · ${p.lease.unit.building.commune}`}
              >
                <span className="font-medium">{p.lease.unit.building.name}</span>
                <span className="text-[var(--color-muted)]"> · </span>
                <span className="text-xs">{p.lease.unit.label}</span>
              </td>
              <td className={`whitespace-nowrap text-right tabular-nums text-[var(--color-ink)] ${listTableCellClass}`}>
                <span className="text-[0.95rem] font-semibold">{fcfa(Number(p.amountDue))}</span>
                {partiallyPaid ? (
                  <span className="mt-0.5 block text-[11px] font-medium tabular-nums text-[var(--status-paid)]">
                    Reste {fcfa(paymentRemaining(p))}
                  </span>
                ) : null}
              </td>
              <td className={`whitespace-nowrap tabular-nums text-[var(--color-ink)] ${listTableCellClass}`}>
                <p className="text-xs font-semibold">
                  {String(p.periodMonth).padStart(2, '0')}/{p.periodYear}
                </p>
                <p className="text-[11px] text-[var(--color-muted)]">{formatDateFr(p.dueDate)}</p>
              </td>
              <td className={listTableCellClass}>
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge status={p.status} label={statusLabel(p.status)} size="sm" />
                  {collectBadge ? (
                    <span
                      className={`inline-block max-w-full rounded-md px-2 py-0.5 text-[10px] font-semibold normal-case leading-tight ${collectBadge.className}`}
                    >
                      {collectBadge.label}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className={`w-10 text-center align-middle ${listTableCellClass} text-[var(--color-muted)]`} aria-hidden>
                <svg className="mx-auto size-5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
