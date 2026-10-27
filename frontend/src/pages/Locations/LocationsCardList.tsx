import { SmartLink } from '@/components/SmartLink';
import { StatusBadge } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import type { AppNavigateState } from '@/lib/navigation';
import { unitKindLabel } from '@/lib/unitKind';
import { rowFlashClass, statusKeyFromFr } from './locationUtils';
import type { OverviewRow } from './types';

type LocationsCardListProps = {
  rows: OverviewRow[];
  flashLeaseId: string | null;
  locationSheetState: AppNavigateState;
  onOpen: (leaseId: string) => void;
  onDelete: (r: OverviewRow) => void;
};

/** Fiches empilées (mobile) de la liste des locations. */
export function LocationsCardList({
  rows,
  flashLeaseId,
  locationSheetState,
  onOpen,
  onDelete,
}: LocationsCardListProps) {
  return (
    <ul className="divide-y divide-[var(--odoo-border)] bg-[var(--color-surface)] md:hidden">
      {rows.map((r) => (
        <li
          key={`card-${r.leaseId}`}
          id={`loc-row-${r.leaseId}`}
          className={`scroll-mt-28 space-y-2.5 p-3.5 ${rowFlashClass(flashLeaseId === r.leaseId)}`}
        >
          <button type="button" className="w-full text-left" onClick={() => onOpen(r.leaseId)}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug text-[var(--color-ink)]">
                  {r.buildingName} — {r.unitLabel}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">{unitKindLabel(r.unitKind)}</p>
              </div>
              <StatusBadge
                status={statusKeyFromFr(r.currentMonthStatusFr)}
                label={r.currentMonthStatusFr}
                size="sm"
              />
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)]">{r.localizationLine}</p>
            <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">{r.tenantFullName}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--color-ink)]">
              {fcfa(r.monthlyRent)}
              <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">échéance le {r.rentDueDay}</span>
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-muted)]">{r.active ? 'Actif' : 'Inactif'}</p>
          </button>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <SmartLink
              to={`/locations/${r.leaseId}`}
              state={locationSheetState}
              returnFocusId={r.leaseId}
              className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
            >
              Fiche
            </SmartLink>
            <button
              type="button"
              className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-[var(--status-late)] hover:bg-[var(--status-late-bg)]"
              onClick={() => onDelete(r)}
            >
              Supprimer
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
