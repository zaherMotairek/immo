import { useEffect, useMemo, useRef, useState } from 'react';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { AppPageTitle } from '@/components/AppPageTitle';
import { EmptyState } from '@/components/EmptyState';
import { api } from '@/lib/api';
import { fcfa, formatDateFr } from '@/lib/format';
import { monthTitle, statusLabel, statusStyle } from '@/lib/paymentStatusUi';
import {
  KpiIconAlert,
  KpiIconBuilding,
  KpiIconMoney,
  KpiIconTenant,
  KpiIconTrendUp,
  KpiIconUnits,
} from '@/components/dashboardKpiIcons';
import { BuildingUnitStack } from '@/components/BuildingUnitBadges';
import { FicheLocationLink } from '@/components/FicheLocationLink';
import { LinkButton } from '@/components/LinkButton';
import { SmartLink } from '@/components/SmartLink';
import { PaymentZoomModal } from '@/components/PaymentZoomModal';
import { PdfPrintButton } from '@/components/PdfPrintButton';
import { Button, Card, HelpHint, StatTile } from '@/components/ui';
import { unitKindLabel } from '@/lib/unitKind';
import { listTableCellClass, listTableDataRowClass, listTableFirstCellClass } from '@/lib/listTableStyles';
import {
  formatPhoneForWhatsApp,
  overdueReminderWhatsAppText,
  whatsAppWebUrl,
} from '@/lib/whatsappReminder';
import { SortableTh } from '@/components/SortableTh';
import { toggleTableSortColumn } from '@/lib/tableSort';
import type { TableSortDir } from '@/lib/tableSort';

type DashboardPaymentAlert = {
  paymentId: string;
  leaseId: string;
  tenantId: string;
  tenantFirstName: string;
  tenantEmail: string | null;
  tenantPhone: string | null;
  dueDate: string;
  amountDue: number;
  amountPaid?: number;
  amountRemaining?: number;
  status: string;
  period: string;
  tenant: string;
  unit?: string;
  unitKind?: string;
  building?: string;
  commune?: string;
  city?: string;
};

type Overview = {
  kpis: {
    buildings: number;
    units: number;
    tenants: number;
    expectedMonthlyRent: number;
    collectedThisMonth: number;
    depositsCollectedThisMonth: number;
    overdueCount: number;
    overdueAmount: number;
  };
  alerts: DashboardPaymentAlert[];
  upcomingCollections?: {
    count: number;
    totalRemaining: number;
    windowStart: string;
    windowEnd: string;
    /** Détail des échéances PENDING dans la fenêtre aujourd’hui…+2 jours (reste &gt; 0). */
    items?: DashboardPaymentAlert[];
  };
};

function formatEncaissementWindowFr(startIso: string, endIso: string) {
  const s = new Date(`${startIso}T12:00:00`);
  const e = new Date(`${endIso}T12:00:00`);
  const d1 = s.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const d2 = e.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `${d1} → ${d2}`;
}

/** Texte du type « Aujourd'hui », « Demain », « Dans 2 jours » selon l’échéance (fuseau local). */
function relativeDueDayFr(dueIso: string): string {
  const d = dueIso.slice(0, 10);
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${day}`;
  const t0 = new Date(`${todayStr}T12:00:00`).getTime();
  const t1 = new Date(`${d}T12:00:00`).getTime();
  const diffDays = Math.round((t1 - t0) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';
  if (diffDays === 2) return 'Dans 2 jours';
  return new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Liste de locataires pour la phrase d’intro (« …loyers de X et Y »). */
function formatUpcomingLoyersPhrase(items: DashboardPaymentAlert[]): string {
  const names = items.map((i) => i.tenant?.trim() || 'Locataire');
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} et ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} et ${names[2]}`;
  const n = names.length - 3;
  return `${names[0]}, ${names[1]}, ${names[2]} et ${n} autre${n > 1 ? 's' : ''}`;
}

function alertRemaining(a: DashboardPaymentAlert) {
  return a.amountRemaining ?? a.amountDue;
}

function dashboardAlertOverdue(a: DashboardPaymentAlert) {
  if (a.status === 'LATE') return true;
  if (a.status !== 'PENDING') return false;
  const d = typeof a.dueDate === 'string' ? a.dueDate.slice(0, 10) : '';
  const today = new Date().toISOString().slice(0, 10);
  return d < today;
}

type UpcomingSortKey = 'tenant' | 'place' | 'remaining' | 'due' | 'status' | 'lease';

function compareUpcomingRows(a: DashboardPaymentAlert, b: DashboardPaymentAlert, key: UpcomingSortKey, dir: TableSortDir): number {
  const sign = dir === 'asc' ? 1 : -1;
  let c = 0;
  switch (key) {
    case 'tenant':
      c = (a.tenant || '').localeCompare(b.tenant || '', 'fr', { sensitivity: 'base' });
      break;
    case 'place':
      c = `${a.building ?? ''} ${a.unit ?? ''} ${a.commune ?? ''} ${a.city ?? ''}`
        .trim()
        .localeCompare(`${b.building ?? ''} ${b.unit ?? ''} ${b.commune ?? ''} ${b.city ?? ''}`.trim(), 'fr', {
          sensitivity: 'base',
        });
      break;
    case 'remaining':
      c = alertRemaining(a) - alertRemaining(b);
      break;
    case 'due':
      c = a.dueDate.localeCompare(b.dueDate);
      if (c === 0) c = a.period.localeCompare(b.period);
      break;
    case 'status':
      c = a.status.localeCompare(b.status);
      break;
    case 'lease':
      c = (a.leaseId ?? '').localeCompare(b.leaseId ?? '');
      break;
    default:
      c = 0;
  }
  if (c === 0) c = a.paymentId.localeCompare(b.paymentId);
  return c * sign;
}

export function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function sendReminder(paymentId: string) {
    setSendingId(paymentId);
    try {
      const res = await api<{ message?: string }>(`/payments/${paymentId}/send-reminder`, { method: 'POST' });
      alert(res.message ?? 'Relance envoyée.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setSendingId(null);
    }
  }

  useEffect(() => {
    api<Overview>('/dashboard')
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Erreur'));
  }, []);

  const [zoomAlertPaymentId, setZoomAlertPaymentId] = useState<string | null>(null);
  const [upcomingSortKey, setUpcomingSortKey] = useState<UpcomingSortKey>('due');
  const [upcomingSortDir, setUpcomingSortDir] = useState<TableSortDir>('asc');

  const sortedUpcomingItems = useMemo(() => {
    const items = [...(data?.upcomingCollections?.items ?? [])];
    items.sort((a, b) => compareUpcomingRows(a, b, upcomingSortKey, upcomingSortDir));
    return items;
  }, [data?.upcomingCollections?.items, upcomingSortKey, upcomingSortDir]);

  function toggleUpcomingSort(key: UpcomingSortKey) {
    const n = toggleTableSortColumn(upcomingSortKey, upcomingSortDir, key);
    setUpcomingSortKey(n.key);
    setUpcomingSortDir(n.dir);
  }

  const [collapsedAlertMonths, setCollapsedAlertMonths] = useState(() => new Set<string>());
  const alertsCollapseInitialized = useRef(false);

  const alertMonthGroups = useMemo(() => {
    const alerts = data?.alerts ?? [];
    const map = new Map<string, DashboardPaymentAlert[]>();
    for (const a of alerts) {
      const k = a.period;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    for (const list of map.values()) {
      list.sort((x, y) => {
        const nx = x.tenant || '';
        const ny = y.tenant || '';
        return nx.localeCompare(ny, 'fr', { sensitivity: 'base' });
      });
    }
    return [...map.entries()].sort(([ka], [kb]) => ka.localeCompare(kb));
  }, [data?.alerts]);

  useEffect(() => {
    if (alertMonthGroups.length === 0) return;
    if (alertsCollapseInitialized.current) return;
    alertsCollapseInitialized.current = true;
    setCollapsedAlertMonths(new Set(alertMonthGroups.map(([k]) => k)));
  }, [alertMonthGroups]);

  if (err) {
    return (
      <Card className="border-red-200/90 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/30">
        <p className="font-medium text-red-800 dark:text-red-200">Impossible de charger le tableau de bord.</p>
        <p className="mt-1 text-sm text-red-700/90 dark:text-red-300/90">{err}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </Card>
    );
  }

  if (!data) {
    return <AppLoadingScreen message="Chargement du tableau de bord…" />;
  }

  const { kpis, alerts } = data;
  const upcomingCollections = data.upcomingCollections ?? {
    count: 0,
    totalRemaining: 0,
    windowStart: '',
    windowEnd: '',
    items: [],
  };
  const isEmptyPortfolio = kpis.buildings === 0;
  const showUpcomingReminder = !isEmptyPortfolio && sortedUpcomingItems.length > 0;

  return (
    <div className="space-y-6">
      <AppPageTitle
        className="max-w-3xl"
        iconTo="/"
        title="Tableau de bord"
        hintTitle="Vue d’ensemble : encaissements du mois, retards, alertes, accès rapide aux paiements. « Encaissé ce mois » = loyers + cautions reçus ce mois-ci (détail en deux lignes plus bas sur la page)."
        titleExtra={
          <div className="flex flex-wrap items-center gap-2">
            <StatTile className="shrink-0" label="Total" value={String(kpis.tenants)} />
            <PdfPrintButton
              path="/dashboard/worksheet.pdf"
              title="Feuille de route PDF : cases « perçu », notes manuscrites, puis saisie dans Paiements"
            />
          </div>
        }
      />

      {!isEmptyPortfolio ? (
        <p className="mobile-secondary max-w-3xl rounded-xl border border-slate-200/90 bg-white/90 px-4 py-3 text-sm leading-snug text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-200">
          <span className="font-semibold text-slate-900 dark:text-slate-50">Mois en cours : </span>
          loyers attendus <strong className="tabular-nums">{fcfa(kpis.expectedMonthlyRent)}</strong>
          {' · '}
          déjà encaissés <strong className="tabular-nums text-emerald-800 dark:text-emerald-300">{fcfa(kpis.collectedThisMonth)}</strong>
          {kpis.depositsCollectedThisMonth > 0 ? (
            <>
              {' · '}
              cautions encaissées ce mois <strong className="tabular-nums">{fcfa(kpis.depositsCollectedThisMonth)}</strong>
            </>
          ) : null}
          {kpis.overdueAmount > 0 ? (
            <>
              {' · '}
              <span className="text-amber-900 dark:text-amber-200">
                retards / impayés <strong className="tabular-nums">{fcfa(kpis.overdueAmount)}</strong>
              </span>
            </>
          ) : null}
        </p>
      ) : null}

      {showUpcomingReminder ? (
        <Card
          className="!p-0 overflow-hidden border-sky-200/90 bg-gradient-to-br from-sky-50/95 to-white shadow-sm shadow-sky-900/5 dark:border-sky-800/60 dark:from-sky-950/35 dark:to-slate-900/95 dark:shadow-black/20"
          role="region"
          aria-label="Encaissements dans les deux prochains jours"
        >
          <div className="border-b border-sky-200/80 bg-sky-100/50 px-4 py-3.5 dark:border-sky-800/50 dark:bg-sky-950/40 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-900 dark:text-sky-200/95">
                  Dans les 2 jours — loyers à encaisser
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100">
                  D’ici <strong className="font-semibold text-sky-950 dark:text-sky-100">deux jours</strong> (y compris{' '}
                  <span className="whitespace-nowrap">aujourd’hui</span>), loyers à encaisser pour{' '}
                  <strong className="font-semibold text-slate-900 dark:text-slate-50">
                    {formatUpcomingLoyersPhrase(sortedUpcomingItems)}
                  </strong>
                  . Reste au total :{' '}
                  <strong className="tabular-nums text-slate-900 dark:text-slate-50">
                    {fcfa(upcomingCollections.totalRemaining)}
                  </strong>
                  .
                </p>
                <p className="mobile-secondary mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                  Fenêtre : {formatEncaissementWindowFr(upcomingCollections.windowStart, upcomingCollections.windowEnd)} ·{' '}
                  {sortedUpcomingItems.length} échéance{sortedUpcomingItems.length !== 1 ? 's' : ''}
                </p>
              </div>
              <SmartLink
                to="/paiements?year=all&month=all"
                className="shrink-0 self-start rounded-xl border border-sky-300/80 bg-white/90 px-3 py-2 text-xs font-semibold text-sky-900 underline-offset-2 transition hover:bg-sky-50 dark:border-sky-700 dark:bg-slate-800/90 dark:text-sky-100 dark:hover:bg-slate-800"
              >
                Voir les paiements →
              </SmartLink>
            </div>
          </div>
          <div className="overflow-x-auto bg-white dark:bg-slate-950/25">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
                  <SortableTh
                    label="Locataire"
                    columnKey="tenant"
                    activeKey={upcomingSortKey}
                    dir={upcomingSortDir}
                    onSort={toggleUpcomingSort}
                    thClassName="px-4 py-2.5 sm:px-5"
                  />
                  <SortableTh
                    label="Bien / unité"
                    columnKey="place"
                    activeKey={upcomingSortKey}
                    dir={upcomingSortDir}
                    onSort={toggleUpcomingSort}
                    thClassName="px-4 py-2.5 sm:px-5"
                  />
                  <SortableTh
                    label="Reste à encaisser"
                    columnKey="remaining"
                    activeKey={upcomingSortKey}
                    dir={upcomingSortDir}
                    onSort={toggleUpcomingSort}
                    align="end"
                    thClassName="whitespace-nowrap px-4 py-2.5 sm:px-5"
                  />
                  <SortableTh
                    label="Période & échéance"
                    columnKey="due"
                    activeKey={upcomingSortKey}
                    dir={upcomingSortDir}
                    onSort={toggleUpcomingSort}
                    thClassName="whitespace-nowrap px-4 py-2.5 sm:px-5"
                  />
                  <SortableTh
                    label="Statut"
                    columnKey="status"
                    activeKey={upcomingSortKey}
                    dir={upcomingSortDir}
                    onSort={toggleUpcomingSort}
                    thClassName="px-4 py-2.5 sm:px-5"
                  />
                  <SortableTh
                    label="Fiche location"
                    columnKey="lease"
                    activeKey={upcomingSortKey}
                    dir={upcomingSortDir}
                    onSort={toggleUpcomingSort}
                    thClassName="whitespace-nowrap px-4 py-2.5 sm:px-5"
                  />
                  <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 sm:px-5 dark:text-slate-400">
                    Détail
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUpcomingItems.map((row, rowIndex) => {
                  const [pyStr, pmStr] = row.period.split('-');
                  const py = Number(pyStr);
                  const pm = Number(pmStr);
                  const dueStr = formatDateFr(row.dueDate);
                  return (
                    <tr key={row.paymentId} className={listTableDataRowClass(rowIndex)}>
                      <td className={`${listTableFirstCellClass} font-medium text-slate-900 dark:text-slate-100`}>
                        <SmartLink
                          to={`/locataires?edit=${encodeURIComponent(row.tenantId)}`}
                          className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
                        >
                          {row.tenant || 'Locataire'}
                        </SmartLink>
                      </td>
                      <td className={`max-w-[24rem] ${listTableCellClass} text-slate-800 dark:text-slate-200`}>
                        {row.building ? (
                          <BuildingUnitStack
                            buildingName={row.building}
                            buildingSubline={
                              [row.commune, row.city].filter(Boolean).length ? (
                                <>{[row.commune, row.city].filter(Boolean).join(', ')}</>
                              ) : undefined
                            }
                            unitKindLabel={unitKindLabel(row.unitKind)}
                            unitLabel={row.unit ?? '—'}
                          />
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className={`whitespace-nowrap text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100 ${listTableCellClass}`}>
                        {fcfa(alertRemaining(row))}
                        {(row.amountPaid ?? 0) > 0 ? (
                          <span className="mt-1 block text-xs font-medium text-emerald-800 dark:text-emerald-300">
                            Déjà {fcfa(row.amountPaid ?? 0)} · Loyer {fcfa(row.amountDue)}
                          </span>
                        ) : null}
                      </td>
                      <td className={`whitespace-nowrap tabular-nums text-slate-700 dark:text-slate-300 ${listTableCellClass}`}>
                        <p className="text-sm font-medium">
                          {!Number.isNaN(py) && !Number.isNaN(pm) ? monthTitle(py, pm) : row.period}
                        </p>
                        <p className="mt-0.5 text-xs">
                          <span className="font-semibold text-sky-800 dark:text-sky-300">{relativeDueDayFr(row.dueDate)}</span>
                          {' · '}
                          {dueStr}
                        </p>
                      </td>
                      <td className={listTableCellClass}>
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyle(row.status)}`}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap ${listTableCellClass}`}>
                        {row.leaseId ? (
                          <FicheLocationLink leaseId={row.leaseId} returnFocusRowId={row.paymentId} />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className={`text-right align-middle ${listTableCellClass}`}>
                        <button
                          type="button"
                          title="Détail et encaissement"
                          aria-label={`Détail pour ${row.tenant}`}
                          onClick={() => setZoomAlertPaymentId(row.paymentId)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-500/40 bg-brand-50/90 text-brand-800 shadow-sm transition hover:bg-brand-100 dark:border-brand-500/35 dark:bg-brand-950/50 dark:text-brand-200 dark:hover:bg-brand-900/45"
                        >
                          <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {isEmptyPortfolio ? (
        <EmptyState
          title="Commencez par un bien"
          description="Ajoutez un immeuble ou une villa et ses lots. Ensuite, vous pourrez lier locataires, baux et loyers."
          icon={<KpiIconBuilding className="h-6 w-6" />}
          action={
            <>
              <LinkButton to="/biens" variant="primary" className="py-2.5 text-sm font-semibold">
                Ajouter un bien
              </LinkButton>
              <LinkButton to="/locataires" variant="secondary" className="py-2.5 text-sm font-semibold">
                Locataires
              </LinkButton>
            </>
          }
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SmartLink
          to="/biens"
          className="group block rounded-2xl no-underline outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)] dark:focus-visible:ring-offset-slate-900"
          aria-label={`Voir les biens — ${kpis.buildings} enregistré${kpis.buildings !== 1 ? 's' : ''}`}
        >
          <Card className="relative !p-4 h-full transition-all duration-200 group-hover:border-brand-400/55 group-hover:shadow-md group-hover:shadow-slate-900/8 group-hover:ring-1 group-hover:ring-brand-500/15 dark:group-hover:border-brand-500/40 dark:group-hover:shadow-black/30">
            <p className="flex items-center justify-between gap-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <KpiIconBuilding className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400" />
                Biens
              </span>
              <span className="text-[10px] font-semibold normal-case tracking-normal text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-brand-400">
                Ouvrir →
              </span>
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums dark:text-slate-100">{kpis.buildings}</p>
          </Card>
        </SmartLink>
        <SmartLink
          to="/biens"
          className="group block rounded-2xl no-underline outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)] dark:focus-visible:ring-offset-slate-900"
          aria-label={`Voir les biens et les unités — ${kpis.units} unité${kpis.units !== 1 ? 's' : ''}`}
        >
          <Card className="relative !p-4 h-full transition-all duration-200 group-hover:border-brand-400/55 group-hover:shadow-md group-hover:shadow-slate-900/8 group-hover:ring-1 group-hover:ring-brand-500/15 dark:group-hover:border-brand-500/40 dark:group-hover:shadow-black/30">
            <p className="flex items-center justify-between gap-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <KpiIconUnits className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400" />
                Unités
              </span>
              <span className="text-[10px] font-semibold normal-case tracking-normal text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-brand-400">
                Ouvrir →
              </span>
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums dark:text-slate-100">{kpis.units}</p>
          </Card>
        </SmartLink>
        <SmartLink
          to="/locataires"
          className="group block rounded-2xl no-underline outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)] dark:focus-visible:ring-offset-slate-900"
          aria-label={`Voir les locataires — ${kpis.tenants} enregistré${kpis.tenants !== 1 ? 's' : ''}`}
        >
          <Card className="relative !p-4 h-full transition-all duration-200 group-hover:border-brand-400/55 group-hover:shadow-md group-hover:shadow-slate-900/8 group-hover:ring-1 group-hover:ring-brand-500/15 dark:group-hover:border-brand-500/40 dark:group-hover:shadow-black/30">
            <p className="flex items-center justify-between gap-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <KpiIconTenant className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400" />
                Locataires
              </span>
              <span className="text-[10px] font-semibold normal-case tracking-normal text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-brand-400">
                Ouvrir →
              </span>
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums dark:text-slate-100">{kpis.tenants}</p>
          </Card>
        </SmartLink>
        <Card className="!p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
            <KpiIconMoney className="h-4 w-4 shrink-0 text-slate-400" />
            Loyer mensuel attendu
          </p>
          <p className="mt-1 text-2xl font-semibold dark:text-slate-100">{fcfa(kpis.expectedMonthlyRent)}</p>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <KpiIconTrendUp className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            Encaissements du mois
          </h2>
          <div className="mt-3 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Loyers (échéances)</p>
              <p className="mt-1 text-3xl font-bold text-emerald-700 dark:text-emerald-400">{fcfa(kpis.collectedThisMonth)}</p>
            </div>
            <div className="border-t border-slate-200/90 pt-3 dark:border-slate-600/80">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Cautions encaissées ce mois
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {fcfa(kpis.depositsCollectedThisMonth)}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Dépôts de garantie marqués encaissés ce mois — non confondus avec les loyers.
              </p>
              <SmartLink
                to="/cautions"
                className="mt-2 inline-block text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400"
              >
                Voir toutes les cautions encaissées →
              </SmartLink>
            </div>
          </div>
        </Card>
        <Card
          className={
            kpis.overdueCount > 0
              ? 'border-amber-200 bg-amber-50/50 dark:border-amber-700/50 dark:bg-amber-950/25'
              : ''
          }
        >
          <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <KpiIconAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            Impayés / retard
          </h2>
          <p className="mt-2 text-3xl font-bold text-amber-800 dark:text-amber-300">{fcfa(kpis.overdueAmount)}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{kpis.overdueCount} échéance(s)</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <SmartLink to="/locations" className="text-sm font-medium text-brand-700 dark:text-brand-400">
              Voir les locations →
            </SmartLink>
            <SmartLink to="/paiements?overdue=1" className="text-sm font-medium text-brand-700 dark:text-brand-400">
              Paiements en retard →
            </SmartLink>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Alertes loyers</h2>
            <HelpHint
              className="align-middle"
              title="Même présentation que la page Paiements : regroupement par mois de facturation, badge de statut, actions de relance. La loupe ouvre le détail sur place : encaissement, versement partiel, relances. Un lien vers Paiements reste disponible dans la fenêtre."
            />
          </div>
          <LinkButton to="/paiements?overdue=1&year=all&month=all" variant="secondary" className="py-2 text-xs">
            Tous les paiements en retard
          </LinkButton>
        </div>
        {alerts.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600 dark:text-slate-400">Aucune alerte : tous les loyers suivis sont à jour.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="mobile-secondary flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
                onClick={() => setCollapsedAlertMonths(new Set(alertMonthGroups.map(([k]) => k)))}
              >
                Tout replier
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
                onClick={() => setCollapsedAlertMonths(new Set())}
              >
                Tout déplier
              </button>
            </div>
            {alertMonthGroups.map(([key, items]) => {
              const [yStr, mStr] = key.split('-');
              const py = Number(yStr);
              const pm = Number(mStr);
              const monthDue = items.reduce((acc, a) => acc + a.amountDue, 0);
              const monthRemaining = items.reduce((acc, a) => acc + alertRemaining(a), 0);
              const overdueInMonth = items.filter((a) => dashboardAlertOverdue(a)).length;
              const monthCollapsed = collapsedAlertMonths.has(key);

              return (
                <Card key={key} className="!p-0 overflow-hidden shadow-sm ring-1 ring-slate-900/[0.04] dark:ring-slate-600/35">
                  <button
                    type="button"
                    aria-expanded={!monthCollapsed}
                    aria-controls={`dashboard-alerts-month-${key}`}
                    onClick={() =>
                      setCollapsedAlertMonths((prev) => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })
                    }
                    className="relative z-10 flex w-full items-start gap-3 border-b border-slate-200/90 bg-gradient-to-r from-slate-100/90 to-slate-50/95 px-4 py-3 text-left transition hover:from-slate-100 hover:to-slate-50/90 sm:px-5 dark:border-slate-700 dark:from-slate-800/95 dark:to-slate-900/98 dark:hover:from-slate-800 dark:hover:to-slate-900/95"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{monthTitle(py, pm)}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {items.length} échéance{items.length !== 1 ? 's' : ''} en alerte · {fcfa(monthDue)} loyer dû au total
                        <span className="font-medium text-amber-900 dark:text-amber-300">
                          {' '}
                          · {fcfa(monthRemaining)} encore dû{items.length !== 1 ? 'es' : ''}
                        </span>
                        {overdueInMonth > 0 && (
                          <span className="font-medium text-red-800 dark:text-red-300"> · {overdueInMonth} en retard</span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 self-start">
                      <span className="rounded-lg bg-slate-100/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200/90 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600">
                        Période {String(pm).padStart(2, '0')}/{py}
                      </span>
                      <svg
                        className={`size-5 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${monthCollapsed ? '' : 'rotate-180'}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>
                  <ul id={`dashboard-alerts-month-${key}`} className="list-none" hidden={monthCollapsed}>
                    {items.map((a, rowIdx) => (
                      <li
                        key={a.paymentId}
                        className={`grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-start sm:gap-3 sm:px-5 ${
                          rowIdx < items.length - 1 ? 'border-b border-slate-100 dark:border-slate-700/80' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <SmartLink
                              to={`/locataires?edit=${encodeURIComponent(a.tenantId)}`}
                              className="font-medium text-slate-900 underline-offset-2 hover:underline dark:text-slate-100"
                            >
                              {a.tenant || 'Locataire'}
                            </SmartLink>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyle(a.status)}`}
                            >
                              {statusLabel(a.status)}
                            </span>
                            {a.leaseId ? <FicheLocationLink leaseId={a.leaseId} /> : null}
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {[a.commune, a.city].filter(Boolean).join(', ') || '—'} · {a.building ?? '—'} —{' '}
                            {unitKindLabel(a.unitKind)} — {a.unit ?? '—'}
                          </p>
                          <p className="mt-1 text-sm">
                            <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                              Loyer {fcfa(a.amountDue)}
                            </span>
                            {(a.status === 'PENDING' || a.status === 'LATE') && (a.amountPaid ?? 0) > 0 && (
                              <span className="ml-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                                · encaissé {fcfa(a.amountPaid ?? 0)} · reste {fcfa(alertRemaining(a))}
                              </span>
                            )}
                            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                              échéance {formatDateFr(a.dueDate)}
                            </span>
                          </p>
                          {dashboardAlertOverdue(a) &&
                            !a.tenantEmail &&
                            !formatPhoneForWhatsApp(a.tenantPhone) && (
                              <p className="mt-1 max-w-[28rem] text-xs text-amber-800 dark:text-amber-200">
                                Ajoutez un e-mail ou un n° avec indicatif (ex. +225…) dans Locataires pour relancer.
                              </p>
                            )}
                        </div>
                        <button
                          type="button"
                          title="Détail et encaissement — sur le tableau de bord"
                          aria-label={`Détail et encaissement pour ${a.tenant}`}
                          onClick={() => setZoomAlertPaymentId(a.paymentId)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-xl border border-brand-500/40 bg-brand-50/90 text-brand-800 shadow-sm transition hover:bg-brand-100 dark:border-brand-500/35 dark:bg-brand-950/50 dark:text-brand-200 dark:hover:bg-brand-900/45 sm:mt-0.5"
                        >
                          <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <div className="flex flex-wrap gap-2 sm:max-w-[min(100%,24rem)] sm:justify-end sm:self-start">
                          {dashboardAlertOverdue(a) && a.tenantEmail && (
                            <Button
                              variant="secondary"
                              className="py-2 text-xs"
                              disabled={sendingId !== null}
                              onClick={() => sendReminder(a.paymentId)}
                            >
                              {sendingId === a.paymentId ? 'Envoi…' : 'Relance e-mail'}
                            </Button>
                          )}
                          {dashboardAlertOverdue(a) &&
                            (() => {
                              const waDigits = formatPhoneForWhatsApp(a.tenantPhone);
                              if (!waDigits || !a.building || !a.unit) return null;
                              const [pY, pM] = a.period.split('-');
                              const periodLabel = pY && pM ? `${pM}/${pY}` : a.period;
                              const waHref = whatsAppWebUrl(
                                waDigits,
                                overdueReminderWhatsAppText({
                                  firstName: a.tenantFirstName || a.tenant || '—',
                                  periodLabel,
                                  amountFcfa: alertRemaining(a),
                                  dueDateStr: formatDateFr(a.dueDate),
                                  buildingName: a.building,
                                  unitLabel: a.unit,
                                }),
                              );
                              return (
                                <a
                                  href={waHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center rounded-xl border border-emerald-600/90 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-900 shadow-sm hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200"
                                >
                                  WhatsApp
                                </a>
                              );
                            })()}
                          <LinkButton to={`/locataires?edit=${a.tenantId}`} variant="ghost" className="py-2 text-xs">
                            Modifier locataire
                          </LinkButton>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <PaymentZoomModal
        paymentId={zoomAlertPaymentId}
        onClose={() => setZoomAlertPaymentId(null)}
        onUpdated={() => {
          void api<Overview>('/dashboard')
            .then(setData)
            .catch((e) => setErr(e instanceof Error ? e.message : 'Erreur'));
        }}
      />
    </div>
  );
}
