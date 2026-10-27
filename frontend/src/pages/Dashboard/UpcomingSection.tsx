import { SmartLink } from '@/components/SmartLink';
import { SortableTh } from '@/components/SortableTh';
import { HelpHint } from '@/components/ui';
import { Card, CardList, ListRow, StatusBadge } from '@/components/ui/index';
import { fcfa, formatDateFr } from '@/lib/format';
import { collectionCollectBadge } from '@/lib/paymentRow';
import { statusLabel } from '@/lib/paymentStatusUi';
import {
  listTableCellClass,
  listTableDataRowClass,
  listTableFirstCellClass,
  listTableRowOpenableClass,
  onListRowClick,
} from '@/lib/listTableStyles';
import type { TableSortDir } from '@/lib/tableSort';
import { unitKindLabel } from '@/lib/unitKind';
import {
  alertRemaining,
  dashboardLinkButtonClass,
  formatEncaissementWindowFr,
  formatUpcomingLoyersPhrase,
  relativeDueDayFr,
} from './types';
import type { DashboardPaymentAlert, Overview, UpcomingSortKey } from './types';

type UpcomingSectionProps = {
  items: DashboardPaymentAlert[];
  upcoming: NonNullable<Overview['upcomingCollections']>;
  sortKey: UpcomingSortKey;
  sortDir: TableSortDir;
  onSort: (key: UpcomingSortKey) => void;
  selectedPaymentId: string | null;
  onOpenPayment: (paymentId: string) => void;
};

function periodCompactOf(period: string) {
  const [pyStr, pmStr] = period.split('-');
  const py = Number(pyStr);
  const pm = Number(pmStr);
  return !Number.isNaN(py) && !Number.isNaN(pm) ? `${String(pm).padStart(2, '0')}/${py}` : period;
}

function lieuTitleOf(row: DashboardPaymentAlert) {
  return row.building
    ? `${row.building} — ${unitKindLabel(row.unitKind)} ${row.unit ?? '—'} · ${[row.commune, row.city].filter(Boolean).join(', ') || '—'}`
    : '';
}

function hasPartialPayment(row: DashboardPaymentAlert) {
  return (row.status === 'PENDING' || row.status === 'LATE') && (row.amountPaid ?? 0) > 0;
}

/** Échéances des 2 prochains jours : tableau (≥ md) et liste de lignes (mobile). */
export function UpcomingSection({
  items,
  upcoming,
  sortKey,
  sortDir,
  onSort,
  selectedPaymentId,
  onOpenPayment,
}: UpcomingSectionProps) {
  const plural = items.length !== 1 ? 's' : '';
  return (
    <Card
      padding="none"
      className="overflow-hidden border-l-4"
      style={{ borderLeftColor: 'var(--status-pending)' }}
      role="region"
      aria-label="Encaissements dans les deux prochains jours"
    >
      <div className="border-b border-[var(--odoo-border)] bg-[var(--status-pending-bg)] px-4 py-3.5 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--status-pending)]">
              Dans les 2 jours — loyers à encaisser
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--color-ink)]">
              {items.length} échéance{plural} à traiter pour{' '}
              <strong className="font-semibold">{formatUpcomingLoyersPhrase(items)}</strong>. Total restant :{' '}
              <strong className="tabular-nums">{fcfa(upcoming.totalRemaining)}</strong>.
            </p>
            <div className="mobile-secondary mt-1.5 flex items-center gap-2 text-xs text-[var(--color-muted)]">
              <HelpHint
                title={`Fenêtre: ${formatEncaissementWindowFr(upcoming.windowStart, upcoming.windowEnd)}. ${items.length} échéance${plural} à encaisser.`}
              />
              <span>Détails période</span>
            </div>
          </div>
          <SmartLink to="/paiements?year=all&month=all" className={`${dashboardLinkButtonClass} shrink-0 self-start`}>
            Voir les paiements →
          </SmartLink>
        </div>
      </div>

      {/* Mobile : liste de lignes cliquables (même ouverture du détail que le tableau). */}
      <div className="p-3 md:hidden">
        <CardList ariaLabel="Échéances des deux prochains jours">
          {items.map((row) => (
            <ListRow
              key={row.paymentId}
              title={row.tenant || 'Locataire'}
              subtitle={`${relativeDueDayFr(row.dueDate)} · ${formatDateFr(row.dueDate)}${
                row.building ? ` · ${row.building}${row.unit ? ` ${row.unit}` : ''}` : ''
              }`}
              meta={
                <>
                  <span className="block font-semibold">{fcfa(row.amountDue)}</span>
                  {hasPartialPayment(row) ? (
                    <span className="block text-[11px] font-medium text-[var(--status-paid)]">
                      Reste {fcfa(alertRemaining(row))}
                    </span>
                  ) : null}
                </>
              }
              trailing={<StatusBadge status={row.status} label={statusLabel(row.status)} size="sm" />}
              onClick={() => onOpenPayment(row.paymentId)}
              className={selectedPaymentId === row.paymentId ? 'bg-brand-50/95 dark:bg-brand-950/40' : undefined}
            />
          ))}
        </CardList>
      </div>

      <div className="table-scroll hidden overflow-x-auto bg-[var(--color-surface)] md:block">
        <table className="odoo-list-table w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--odoo-border)]">
              <SortableTh label="Locataire" columnKey="tenant" activeKey={sortKey} dir={sortDir} onSort={onSort} thClassName="px-4 py-2.5 sm:px-5" />
              <SortableTh label="Lieu" columnKey="place" activeKey={sortKey} dir={sortDir} onSort={onSort} thClassName="px-4 py-2.5 sm:px-5" />
              <SortableTh
                label="Montant"
                columnKey="remaining"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                align="end"
                thClassName="whitespace-nowrap px-4 py-2.5 sm:px-5"
              />
              <SortableTh
                label="Période · échéance"
                columnKey="due"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                thClassName="whitespace-nowrap px-4 py-2.5 sm:px-5"
              />
              <SortableTh label="Statut" columnKey="status" activeKey={sortKey} dir={sortDir} onSort={onSort} thClassName="px-4 py-2.5 sm:px-5" />
              <th
                className="w-[1%] whitespace-nowrap px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)] sm:px-3"
                aria-label="Détail"
              />
            </tr>
          </thead>
          <tbody>
            {items.map((row, rowIndex) => {
              const badge = collectionCollectBadge(row.collectionTask);
              return (
                <tr
                  key={row.paymentId}
                  id={`dashboard-upcoming-${row.paymentId}`}
                  title="Clic pour ouvrir le détail"
                  onClick={(e) => onListRowClick(e, () => onOpenPayment(row.paymentId))}
                  className={`scroll-mt-28 ${listTableDataRowClass(rowIndex)} ${listTableRowOpenableClass} ${
                    selectedPaymentId === row.paymentId
                      ? 'bg-brand-50/95 ring-1 ring-inset ring-brand-500/25 dark:bg-brand-950/40 dark:ring-brand-500/30'
                      : ''
                  }`}
                >
                  <td className={`${listTableFirstCellClass} font-medium text-[var(--color-ink)]`}>
                    <SmartLink
                      to={`/locataires?edit=${encodeURIComponent(row.tenantId)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
                    >
                      {row.tenant || 'Locataire'}
                    </SmartLink>
                  </td>
                  <td className={`max-w-[14rem] truncate ${listTableCellClass} text-[var(--color-ink)]`} title={lieuTitleOf(row)}>
                    {row.building ? (
                      <>
                        <span className="font-medium">{row.building}</span>
                        <span className="text-[var(--color-muted)]"> · </span>
                        <span className="text-xs">{row.unit ?? '—'}</span>
                      </>
                    ) : (
                      <span className="text-[var(--color-muted)]">—</span>
                    )}
                  </td>
                  <td className={`whitespace-nowrap text-right tabular-nums text-[var(--color-ink)] ${listTableCellClass}`}>
                    <span className="font-semibold">{fcfa(row.amountDue)}</span>
                    {hasPartialPayment(row) ? (
                      <span className="mt-0.5 block text-[11px] font-medium tabular-nums text-[var(--status-paid)]">
                        Reste {fcfa(alertRemaining(row))}
                      </span>
                    ) : null}
                  </td>
                  <td className={`whitespace-nowrap tabular-nums text-[var(--color-ink)] ${listTableCellClass}`}>
                    <p className="text-xs font-semibold">{periodCompactOf(row.period)}</p>
                    <p className="text-[11px] text-[var(--color-muted)]">
                      <span className="font-semibold text-[var(--status-pending)]">{relativeDueDayFr(row.dueDate)}</span>
                      {' · '}
                      {formatDateFr(row.dueDate)}
                    </p>
                  </td>
                  <td className={listTableCellClass}>
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={row.status} label={statusLabel(row.status)} size="sm" />
                      {badge ? (
                        <span
                          className={`inline-block max-w-full rounded-md px-2 py-0.5 text-[10px] font-semibold normal-case leading-tight ${badge.className}`}
                        >
                          {badge.label}
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
      </div>
    </Card>
  );
}
