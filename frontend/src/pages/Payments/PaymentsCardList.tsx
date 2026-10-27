import { CardList, StatusBadge, cn } from '@/components/ui/index';
import { fcfa, formatDateFr } from '@/lib/format';
import { collectionCollectBadge, paymentRemaining } from '@/lib/paymentRow';
import { statusLabel } from '@/lib/paymentStatusUi';
import { paymentCheckboxClass, paymentRowFlash, paymentRowZoomedClass } from './types';
import type { PaymentsListProps } from './types';

function Chevron() {
  return (
    <svg
      aria-hidden
      className="size-4 shrink-0 text-[var(--color-muted)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/**
 * Vue mobile des échéances d'un mois : une ligne par paiement (même ouverture du détail que le tableau).
 * Les lignes sont des `<li>` maison (et non `ListRow`) car elles portent une case de sélection à côté du bouton d'ouverture.
 */
export function PaymentsCardList({
  items,
  monthLabel,
  selectedIds,
  onToggle,
  onToggleAll,
  zoomPaymentId,
  flashPaymentRowId,
  onOpen,
}: PaymentsListProps) {
  return (
    <CardList ariaLabel={`Échéances de ${monthLabel}`} className="rounded-none border-x-0">
      <li className="flex min-h-11 list-none items-center gap-2 bg-[var(--odoo-table-head-bg)] px-3 text-xs font-semibold text-[var(--color-muted)]">
        <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className={paymentCheckboxClass}
            checked={items.every((p) => selectedIds.includes(p.id))}
            onChange={(e) => onToggleAll(items, e.target.checked)}
            aria-label={`Sélectionner toutes les lignes de ${monthLabel}`}
          />
          Tout sélectionner
        </label>
      </li>
      {items.map((p) => {
        const tenantName = `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`;
        const collectBadge = collectionCollectBadge(p.collectionTask);
        const partiallyPaid = (p.status === 'PENDING' || p.status === 'LATE') && Number(p.amountPaid ?? 0) > 0;
        return (
          <li
            key={p.id}
            id={`payment-${p.id}`}
            className={cn(
              'flex list-none scroll-mt-28 items-stretch',
              paymentRowFlash(flashPaymentRowId === p.id),
              zoomPaymentId === p.id && paymentRowZoomedClass,
            )}
          >
            <label className="flex w-11 shrink-0 cursor-pointer items-center justify-center">
              <input
                type="checkbox"
                className={paymentCheckboxClass}
                checked={selectedIds.includes(p.id)}
                onChange={() => onToggle(p.id)}
                aria-label={`Sélectionner le paiement de ${tenantName}`}
              />
            </label>
            <button
              type="button"
              onClick={() => onOpen(p.id)}
              className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2.5 pr-3 text-left transition-colors duration-[var(--duration-fast)] hover:bg-[var(--odoo-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">{tenantName}</span>
                <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">
                  {p.lease.unit.building.name} · {p.lease.unit.label}
                </span>
                <span className="mt-0.5 block text-xs tabular-nums text-[var(--color-muted)]">
                  {String(p.periodMonth).padStart(2, '0')}/{p.periodYear} · éch. {formatDateFr(p.dueDate)}
                </span>
                {collectBadge ? (
                  <span
                    className={`mt-1 inline-block max-w-full rounded-md px-2 py-0.5 text-[10px] font-semibold leading-tight ${collectBadge.className}`}
                  >
                    {collectBadge.label}
                  </span>
                ) : null}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                <span className="text-base font-bold tabular-nums text-[var(--color-ink)]">{fcfa(Number(p.amountDue))}</span>
                {partiallyPaid ? (
                  <span className="text-[11px] font-medium tabular-nums text-[var(--status-paid)]">
                    Reste {fcfa(paymentRemaining(p))}
                  </span>
                ) : null}
                <StatusBadge status={p.status} label={statusLabel(p.status)} size="sm" />
              </span>
              <Chevron />
            </button>
          </li>
        );
      })}
    </CardList>
  );
}
