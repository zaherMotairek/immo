import type { Dispatch, SetStateAction } from 'react';
import { LinkButton } from '@/components/LinkButton';
import { SmartLink } from '@/components/SmartLink';
import { HelpHint } from '@/components/ui';
import { Button, Callout, Card, StatusBadge } from '@/components/ui/index';
import { fcfa, formatDateFr } from '@/lib/format';
import { listBlockRowClass, listTableRowOpenableClass, onListRowClick } from '@/lib/listTableStyles';
import { collectionCollectBadge } from '@/lib/paymentRow';
import { monthTitle, statusLabel } from '@/lib/paymentStatusUi';
import { unitKindLabel } from '@/lib/unitKind';
import { alertRemaining, dashboardAlertOverdue } from './types';
import type { DashboardPaymentAlert } from './types';

type AlertsSectionProps = {
  alerts: DashboardPaymentAlert[];
  /** Alertes groupées par période (`YYYY-MM`), déjà triées. */
  monthGroups: [string, DashboardPaymentAlert[]][];
  collapsedMonths: Set<string>;
  setCollapsedMonths: Dispatch<SetStateAction<Set<string>>>;
  selectedPaymentId: string | null;
  onOpenPayment: (paymentId: string) => void;
};

/** Alertes loyers groupées par mois (accordéon) ; les lignes se réorganisent en colonne sur mobile. */
export function AlertsSection({
  alerts,
  monthGroups,
  collapsedMonths,
  setCollapsedMonths,
  selectedPaymentId,
  onOpenPayment,
}: AlertsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Alertes loyers</h2>
          <HelpHint
            className="align-middle"
            title="Liste des mois en alerte. Clic sur un mois pour voir les échéances ; clic sur une ligne pour ouvrir le détail (encaissement, relances, fiche location)."
          />
        </div>
        <LinkButton to="/paiements?overdue=1&year=all&month=all" variant="secondary" className="py-2 text-xs">
          Tous les paiements en retard
        </LinkButton>
      </div>
      {alerts.length === 0 ? (
        <Callout variant="success">Aucune alerte : tous les loyers suivis sont à jour.</Callout>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 py-2.5">
            <p className="text-xs font-medium tabular-nums text-[var(--color-muted)]">
              {monthGroups.length} mois · {alerts.length} échéance{alerts.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCollapsedMonths(new Set(monthGroups.map(([k]) => k)))}>
                Tout replier
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setCollapsedMonths(new Set())}>
                Tout déplier
              </Button>
            </div>
          </div>

          <ul className="divide-y divide-[var(--odoo-border)]">
            {monthGroups.map(([key, items]) => {
              const [yStr, mStr] = key.split('-');
              const py = Number(yStr);
              const pm = Number(mStr);
              const monthDue = items.reduce((acc, a) => acc + a.amountDue, 0);
              const monthRemaining = items.reduce((acc, a) => acc + alertRemaining(a), 0);
              const overdueInMonth = items.filter((a) => dashboardAlertOverdue(a)).length;
              const monthCollapsed = collapsedMonths.has(key);

              return (
                <li key={key} className="bg-[var(--color-surface)]">
                  <button
                    type="button"
                    aria-expanded={!monthCollapsed}
                    aria-controls={`dashboard-alerts-month-${key}`}
                    onClick={() =>
                      setCollapsedMonths((prev) => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })
                    }
                    className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[var(--odoo-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600 sm:px-5"
                  >
                    <span className="w-[7.5rem] shrink-0 sm:w-[9.5rem]">
                      <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">{monthTitle(py, pm)}</span>
                      <span className="text-[11px] tabular-nums text-[var(--color-muted)]">
                        {String(pm).padStart(2, '0')}/{py}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                      <span className="tabular-nums text-[var(--color-muted)]">
                        {items.length} alerte{items.length !== 1 ? 's' : ''}
                      </span>
                      <span className="font-semibold tabular-nums text-[var(--color-ink)]">{fcfa(monthDue)}</span>
                      <span className="font-medium tabular-nums text-[var(--status-pending)]">{fcfa(monthRemaining)} dû</span>
                      {overdueInMonth > 0 ? (
                        <span className="rounded-md bg-[var(--status-late-bg)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--status-late)]">
                          {overdueInMonth} retard
                        </span>
                      ) : null}
                    </span>
                    <svg
                      className={`size-4 shrink-0 text-[var(--color-muted)] transition-transform duration-200 ${monthCollapsed ? '' : 'rotate-180'}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  <ul
                    id={`dashboard-alerts-month-${key}`}
                    className="list-none border-t border-[var(--odoo-border-subtle)] bg-[var(--odoo-table-head-bg)]"
                    hidden={monthCollapsed}
                  >
                    {items.map((a, rowIdx) => {
                      const [pY, pM] = a.period.split('-');
                      const periodCompact =
                        pY && pM && !Number.isNaN(Number(pY)) && !Number.isNaN(Number(pM)) ? `${String(pM).padStart(2, '0')}/${pY}` : a.period;
                      const lieuTitle = a.building
                        ? `${a.building} — ${unitKindLabel(a.unitKind)} ${a.unit ?? '—'} · ${[a.commune, a.city].filter(Boolean).join(', ') || '—'}`
                        : '';
                      const badge = collectionCollectBadge(a.collectionTask);
                      const place = [a.commune, a.city].filter(Boolean).join(', ');
                      return (
                        <li
                          key={a.paymentId}
                          id={`dashboard-alert-${a.paymentId}`}
                          title="Clic pour ouvrir le détail"
                          onClick={(e) => onListRowClick(e, () => onOpenPayment(a.paymentId))}
                          className={`scroll-mt-28 ${listBlockRowClass(rowIdx)} sm:items-center ${listTableRowOpenableClass} ${
                            selectedPaymentId === a.paymentId
                              ? '!bg-brand-50/95 ring-1 ring-inset ring-brand-500/25 dark:!bg-brand-950/40 dark:ring-brand-500/30'
                              : ''
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <SmartLink
                                to={`/locataires?edit=${encodeURIComponent(a.tenantId)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
                              >
                                {a.tenant || 'Locataire'}
                              </SmartLink>
                              <StatusBadge status={a.status} label={statusLabel(a.status)} size="sm" />
                              {badge ? (
                                <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold normal-case ${badge.className}`}>
                                  {badge.label}
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate text-xs text-[var(--color-muted)]" title={lieuTitle}>
                              {a.building ? (
                                <>
                                  <span className="font-medium text-[var(--color-ink)]">{a.building}</span>
                                  <span> · </span>
                                  <span>{a.unit ?? '—'}</span>
                                  {place ? (
                                    <>
                                      <span> · </span>
                                      <span>{place}</span>
                                    </>
                                  ) : null}
                                </>
                              ) : (
                                '—'
                              )}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <p className="text-right text-sm tabular-nums">
                              <span className="block font-semibold text-[var(--color-ink)]">{fcfa(a.amountDue)}</span>
                              {(a.status === 'PENDING' || a.status === 'LATE') && (a.amountPaid ?? 0) > 0 ? (
                                <span className="text-[11px] font-medium text-[var(--status-paid)]">Reste {fcfa(alertRemaining(a))}</span>
                              ) : (
                                <span className="text-[11px] text-[var(--color-muted)]">
                                  {periodCompact} · {formatDateFr(a.dueDate)}
                                </span>
                              )}
                            </p>
                            <svg className="size-4 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
