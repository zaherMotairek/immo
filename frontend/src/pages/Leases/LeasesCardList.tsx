import { CardList, StatusBadge, cn } from '@/components/ui/index';
import { fcfa, formatDateFr } from '@/lib/format';
import { unitKindLabel } from '@/lib/unitKind';
import { LeaseActionsMenu, LeaseContractDetails } from './LeaseRowMenus';
import { leaseRowFlashClass } from './leaseUtils';
import type { LeasesViewProps } from './types';

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
 * Vue mobile des baux : une ligne par bail (ouvre la fiche location) + volet « Contrat & actions ».
 * Les lignes sont des `<li>` maison (et non `ListRow`) car elles portent un id de ligne et un volet déroulant.
 */
export function LeasesCardList({
  leases,
  genYear,
  flashLeaseRowId,
  onOpen,
  onChanged,
  onGeneratePayments,
  onToggleActive,
}: LeasesViewProps) {
  return (
    <CardList ariaLabel="Liste des baux" className="rounded-none border-x-0 border-b-0">
      {leases.map((l) => (
        <li
          key={l.id}
          id={`lease-row-${l.id}`}
          className={cn('list-none scroll-mt-28', leaseRowFlashClass(flashLeaseRowId === l.id))}
        >
          <button
            type="button"
            onClick={() => onOpen(l.id)}
            className="flex min-h-14 w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left transition-colors duration-[var(--duration-fast)] hover:bg-[var(--odoo-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
                {l.tenant.firstName} {l.tenant.lastName}
              </span>
              <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">
                {l.unit.building.name} · {unitKindLabel(l.unit.kind)} {l.unit.label}
              </span>
              <span className="mt-0.5 block text-xs tabular-nums text-[var(--color-muted)]">
                Depuis le {formatDateFr(l.startDate)} · {l.endDate ? `fin ${formatDateFr(l.endDate)}` : 'sans fin'}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1 text-right">
              <span className="text-base font-bold tabular-nums text-[var(--color-ink)]">{fcfa(Number(l.monthlyRent))}</span>
              <span className="text-[11px] text-[var(--color-muted)]">/ mois · le {l.rentDueDay}</span>
              <StatusBadge status={l.active ? 'PAID' : 'CANCELLED'} label={l.active ? 'Actif' : 'Inactif'} size="sm" />
            </span>
            <Chevron />
          </button>
          <div className="grid gap-2 px-3 pb-3 sm:grid-cols-2">
            <LeaseContractDetails lease={l} onChanged={onChanged} />
            <LeaseActionsMenu
              lease={l}
              genYear={genYear}
              onGeneratePayments={onGeneratePayments}
              onToggleActive={onToggleActive}
            />
          </div>
        </li>
      ))}
    </CardList>
  );
}
