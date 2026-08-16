import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { AppPageTitle } from '@/components/AppPageTitle';
import { EmptyState } from '@/components/EmptyState';
import { api } from '@/lib/api';
import { fcfa, formatDateFr } from '@/lib/format';
import { monthTitle, statusLabel, statusStyle } from '@/lib/paymentStatusUi';
import { collectionCollectBadge, type CollectionTaskSummary } from '@/lib/paymentRow';
import {
  KpiIconAlert,
  KpiIconBuilding,
  KpiIconMoney,
  KpiIconTenant,
  KpiIconTrendUp,
  KpiIconUnits,
} from '@/components/dashboardKpiIcons';
import { LinkButton } from '@/components/LinkButton';
import { SmartLink } from '@/components/SmartLink';
import { PaymentZoomModal } from '@/components/PaymentZoomModal';
import { PdfPrintButton } from '@/components/PdfPrintButton';
import { Button, Card, HelpHint } from '@/components/ui';
import { unitKindLabel } from '@/lib/unitKind';
import { listBlockRowClass, listTableCellClass, listTableDataRowClass, listTableFirstCellClass, listTableRowOpenableClass, onListRowClick } from '@/lib/listTableStyles';
import { SortableTh } from '@/components/SortableTh';
import { toggleTableSortColumn } from '@/lib/tableSort';
import type { TableSortDir } from '@/lib/tableSort';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
  collectionTask?: CollectionTaskSummary | null;
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

type UpcomingSortKey = 'tenant' | 'place' | 'remaining' | 'due' | 'status';

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
    default:
      c = 0;
  }
  if (c === 0) c = a.paymentId.localeCompare(b.paymentId);
  return c * sign;
}

export function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
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

  /** Parts du loyer mensuel attendu : encaissé vs reste (somme = attendu). */
  const coveragePieData = useMemo(() => {
    if (!data) return null;
    const exp = data.kpis.expectedMonthlyRent;
    if (exp <= 0) return null;
    const enc = Math.min(data.kpis.collectedThisMonth, exp);
    const rest = Math.max(0, exp - data.kpis.collectedThisMonth);
    return [
      { key: 'enc', name: 'Encaissé', value: enc, fill: '#10b981' },
      { key: 'rest', name: 'Reste (à percevoir)', value: rest, fill: '#94a3b8' },
    ];
  }, [data]);

  const barChartWrapRef = useRef<HTMLDivElement>(null);
  const [barChartW, setBarChartW] = useState(0);

  useLayoutEffect(() => {
    const el = barChartWrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setBarChartW(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

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
  const dashboardBars = [
    { key: 'expected', label: 'Attendu', value: kpis.expectedMonthlyRent, color: '#3b82f6' },
    { key: 'collected', label: 'Encaissé', value: kpis.collectedThisMonth, color: '#10b981' },
    { key: 'deposits', label: 'Cautions', value: kpis.depositsCollectedThisMonth, color: '#8b5cf6' },
    { key: 'overdue', label: 'Retards', value: kpis.overdueAmount, color: '#f59e0b' },
  ];

  const periodNow = new Date();
  const monthLabelRaw = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(periodNow);
  const monthLabelCap = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1);
  const rangeStart = new Date(periodNow.getFullYear(), periodNow.getMonth(), 1);
  const rangeEnd = new Date(periodNow.getFullYear(), periodNow.getMonth() + 1, 0);
  const rangeLabel = `${rangeStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} – ${rangeEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  const pctOfExpected =
    kpis.expectedMonthlyRent > 0
      ? Math.round((kpis.collectedThisMonth / kpis.expectedMonthlyRent) * 1000) / 10
      : null;
  const remainingVsExpected = Math.max(0, kpis.expectedMonthlyRent - kpis.collectedThisMonth);

  return (
    <div className="dashboard-page space-y-5">
      <AppPageTitle
        iconTo="/"
        title="Tableau de bord"
        hintTitle="Vue d’ensemble : encaissements du mois, retards, alertes, accès rapide aux paiements. Les KPIs reflètent le mois civil en cours."
        subtitle="Synthèse de votre parc locatif et des encaissements du mois en cours."
      />

      {!isEmptyPortfolio ? (
        <section className="dashboard-finance overflow-hidden rounded-xl border border-slate-200/90 bg-[var(--color-surface)] shadow-[0_10px_36px_-18px_rgb(15_23_42/0.18)] dark:border-[var(--odoo-border)] dark:shadow-black/25">
          <div className="dashboard-finance__hero relative overflow-hidden px-4 py-5 text-zinc-50 sm:px-6 sm:py-6">
            <div className="dashboard-finance__hero-grid" aria-hidden />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Synthèse · mois en cours</p>
                <p className="mt-1.5 text-3xl font-bold tracking-tight sm:text-[2rem]">{monthLabelCap}</p>
                <p className="mt-1 text-sm text-zinc-400">{rangeLabel}</p>
                {pctOfExpected !== null ? (
                  <div className="mt-4 max-w-sm">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium text-zinc-300">Couverture des loyers</span>
                      <span className="tabular-nums font-semibold text-amber-300">{pctOfExpected}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="dashboard-finance__bar h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
                        style={{ width: `${Math.min(100, Math.max(0, pctOfExpected))}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="relative z-10 shrink-0">
                <PdfPrintButton
                  path="/dashboard/worksheet.pdf"
                  title="Feuille de route PDF : cases « perçu », notes manuscrites, puis saisie dans Paiements"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-slate-200/80 sm:grid-cols-2 xl:grid-cols-4 dark:bg-zinc-700/50">
            <div className="dashboard-kpi dashboard-kpi--ok bg-[var(--color-surface)] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    Encaissé (loyers)
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-zinc-50">
                    {fcfa(kpis.collectedThisMonth)}
                  </p>
                  {pctOfExpected !== null ? (
                    <p className="mt-1.5 text-xs font-medium text-emerald-700/90 dark:text-emerald-400/90">
                      {pctOfExpected}% de l’attendu
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-500">Attendu non renseigné</p>
                  )}
                </div>
                <span className="dashboard-kpi__icon dashboard-kpi__icon--ok" aria-hidden>
                  <KpiIconMoney className="size-5" />
                </span>
              </div>
            </div>
            <div className="dashboard-kpi dashboard-kpi--neutral bg-[var(--color-surface)] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                    Attendu ce mois
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-zinc-50">
                    {fcfa(kpis.expectedMonthlyRent)}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">Loyers mensuels actifs</p>
                </div>
                <span className="dashboard-kpi__icon dashboard-kpi__icon--neutral" aria-hidden>
                  <KpiIconTrendUp className="size-5" />
                </span>
              </div>
            </div>
            <div className="dashboard-kpi dashboard-kpi--neutral bg-[var(--color-surface)] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                      Reste (vs attendu)
                    </p>
                    <HelpHint title="Écart entre le total attendu du mois et les loyers déjà encaissés sur les échéances du mois (indicateur de couverture, pas un solde comptable)." />
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-zinc-50">
                    {fcfa(remainingVsExpected)}
                  </p>
                </div>
                <span className="dashboard-kpi__icon dashboard-kpi__icon--neutral" aria-hidden>
                  <KpiIconUnits className="size-5" />
                </span>
              </div>
            </div>
            <div className="dashboard-kpi dashboard-kpi--warn bg-[var(--color-surface)] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                      Retards / impayés
                    </p>
                    <HelpHint title="Total restant dû sur les échéances en retard ou impayées." />
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-amber-950 dark:text-amber-100">
                    {fcfa(kpis.overdueAmount)}
                  </p>
                  <p className="mt-1.5 text-xs font-medium text-amber-800/90 dark:text-amber-300/90">
                    {kpis.overdueCount} échéance(s)
                  </p>
                </div>
                <span className="dashboard-kpi__icon dashboard-kpi__icon--warn" aria-hidden>
                  <KpiIconAlert className="size-5" />
                </span>
              </div>
            </div>
          </div>

          {coveragePieData ? (
            <div
              className="border-t border-slate-200/90 bg-gradient-to-br from-slate-50/90 to-white px-4 py-5 sm:px-6 dark:border-[var(--odoo-border)] dark:from-zinc-800/40 dark:to-[var(--color-surface)]"
              role="img"
              aria-label={`Encaissement du mois : ${pctOfExpected ?? 0} pour cent du loyer attendu encaissé, reste ${fcfa(remainingVsExpected)} à percevoir.`}
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-10">
                <div className="min-w-0 flex-1 text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    <p className="text-sm font-semibold text-slate-900 dark:text-zinc-50">Encaissé vs reste (loyer attendu)</p>
                    <HelpHint title="Graphique sur la base du loyer mensuel attendu (baux actifs). « Reste » = différence avec ce qui est déjà encaissé ce mois sur les échéances du mois. En début de mois, l’anneau est souvent très « reste » : les échéances arrivent plus tard." />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-400">
                    Même indicateur que la carte « Encaissé » ({pctOfExpected !== null ? `${pctOfExpected}%` : '—'} de
                    l’attendu), en vue proportionnelle.
                  </p>
                  <ul className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs tabular-nums md:justify-start">
                    <li className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
                      <span className="size-2.5 shrink-0 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40" aria-hidden />
                      <span>
                        Encaissé · <strong>{fcfa(Math.min(kpis.collectedThisMonth, kpis.expectedMonthlyRent))}</strong>
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
                      <span className="size-2.5 shrink-0 rounded-full bg-slate-400 dark:bg-zinc-500" aria-hidden />
                      <span>
                        Reste à percevoir · <strong>{fcfa(remainingVsExpected)}</strong>
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="relative mx-auto h-[200px] w-[200px] shrink-0 md:mx-0">
                  <PieChart width={200} height={200}>
                    <Pie
                      data={coveragePieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={coveragePieData.filter((d) => d.value > 0).length > 1 ? 2 : 0}
                      stroke="none"
                    >
                      {coveragePieData.map((slice) => (
                        <Cell key={slice.key} fill={slice.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [fcfa(Number(v)), 'Montant']} />
                  </PieChart>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-0.5">
                    {pctOfExpected !== null ? (
                      <>
                        <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-zinc-50">{pctOfExpected}%</span>
                        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                          encaissé
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-slate-500">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-[var(--odoo-border)] dark:bg-zinc-800/30 dark:text-zinc-400 sm:px-6">
            <span>
              Cautions encaissées ce mois :{' '}
              <span className="font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
                {fcfa(kpis.depositsCollectedThisMonth)}
              </span>
            </span>
            <span className="text-slate-300 dark:text-zinc-600" aria-hidden>
              ·
            </span>
            <SmartLink to="/cautions" className="font-semibold text-slate-800 underline-offset-2 hover:underline dark:text-zinc-200">
              Voir les cautions →
            </SmartLink>
          </div>
        </section>
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
                  {sortedUpcomingItems.length} échéance{sortedUpcomingItems.length !== 1 ? 's' : ''} à traiter pour{' '}
                  <strong className="font-semibold text-slate-900 dark:text-slate-50">{formatUpcomingLoyersPhrase(sortedUpcomingItems)}</strong>.
                  Total restant : <strong className="tabular-nums text-slate-900 dark:text-slate-50">{fcfa(upcomingCollections.totalRemaining)}</strong>.
                </p>
                <div className="mobile-secondary mt-1.5 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <HelpHint
                    title={`Fenêtre: ${formatEncaissementWindowFr(upcomingCollections.windowStart, upcomingCollections.windowEnd)}. ${sortedUpcomingItems.length} échéance${
                      sortedUpcomingItems.length !== 1 ? 's' : ''
                    } à encaisser.`}
                  />
                  <span>Détails période</span>
                </div>
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
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
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
                    label="Lieu"
                    columnKey="place"
                    activeKey={upcomingSortKey}
                    dir={upcomingSortDir}
                    onSort={toggleUpcomingSort}
                    thClassName="px-4 py-2.5 sm:px-5"
                  />
                  <SortableTh
                    label="Montant"
                    columnKey="remaining"
                    activeKey={upcomingSortKey}
                    dir={upcomingSortDir}
                    onSort={toggleUpcomingSort}
                    align="end"
                    thClassName="whitespace-nowrap px-4 py-2.5 sm:px-5"
                  />
                  <SortableTh
                    label="Période · échéance"
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
                  <th
                    className="w-[1%] whitespace-nowrap px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 sm:px-3 dark:text-slate-400"
                    aria-label="Détail"
                  />
                </tr>
              </thead>
              <tbody>
                {sortedUpcomingItems.map((row, rowIndex) => {
                  const [pyStr, pmStr] = row.period.split('-');
                  const py = Number(pyStr);
                  const pm = Number(pmStr);
                  const dueStr = formatDateFr(row.dueDate);
                  const periodCompact =
                    !Number.isNaN(py) && !Number.isNaN(pm) ? `${String(pm).padStart(2, '0')}/${py}` : row.period;
                  const lieuTitle = row.building
                    ? `${row.building} — ${unitKindLabel(row.unitKind)} ${row.unit ?? '—'} · ${[row.commune, row.city].filter(Boolean).join(', ') || '—'}`
                    : '';
                  return (
                    <tr
                      key={row.paymentId}
                      id={`dashboard-upcoming-${row.paymentId}`}
                      title="Clic pour ouvrir le détail"
                      onClick={(e) => onListRowClick(e, () => setZoomAlertPaymentId(row.paymentId))}
                      className={`scroll-mt-28 ${listTableDataRowClass(rowIndex)} ${listTableRowOpenableClass} ${
                        zoomAlertPaymentId === row.paymentId
                          ? 'bg-brand-50/95 ring-1 ring-inset ring-brand-500/25 dark:bg-brand-950/40 dark:ring-brand-500/30'
                          : ''
                      }`}
                    >
                      <td className={`${listTableFirstCellClass} font-medium text-slate-900 dark:text-slate-100`}>
                        <SmartLink
                          to={`/locataires?edit=${encodeURIComponent(row.tenantId)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
                        >
                          {row.tenant || 'Locataire'}
                        </SmartLink>
                      </td>
                      <td
                        className={`max-w-[14rem] truncate ${listTableCellClass} text-slate-800 dark:text-slate-200`}
                        title={lieuTitle}
                      >
                        {row.building ? (
                          <>
                            <span className="font-medium text-slate-900 dark:text-slate-100">{row.building}</span>
                            <span className="text-slate-400 dark:text-slate-500"> · </span>
                            <span className="text-xs text-slate-700 dark:text-slate-300">{row.unit ?? '—'}</span>
                          </>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className={`whitespace-nowrap text-right tabular-nums text-slate-800 dark:text-slate-200 ${listTableCellClass}`}>
                        <span className="font-semibold">{fcfa(row.amountDue)}</span>
                        {(row.status === 'PENDING' || row.status === 'LATE') && (row.amountPaid ?? 0) > 0 ? (
                          <span className="mt-0.5 block text-[11px] font-medium tabular-nums text-emerald-800 dark:text-emerald-300">
                            Reste {fcfa(alertRemaining(row))}
                          </span>
                        ) : null}
                      </td>
                      <td className={`whitespace-nowrap tabular-nums text-slate-700 dark:text-slate-300 ${listTableCellClass}`}>
                        <p className="text-xs font-semibold">{periodCompact}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-sky-800 dark:text-sky-300">{relativeDueDayFr(row.dueDate)}</span>
                          {' · '}
                          {dueStr}
                        </p>
                      </td>
                      <td className={listTableCellClass}>
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyle(row.status)}`}
                          >
                            {statusLabel(row.status)}
                          </span>
                          {(() => {
                            const b = collectionCollectBadge(row.collectionTask);
                            return b ? (
                              <span
                                className={`inline-block max-w-full rounded-md px-2 py-0.5 text-[10px] font-semibold normal-case leading-tight ${b.className}`}
                              >
                                {b.label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </td>
                      <td className={`w-10 text-center align-middle ${listTableCellClass} text-neutral-400 dark:text-zinc-500`} aria-hidden>
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
          className="group block rounded-xl no-underline outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)]"
          aria-label={`Voir les biens — ${kpis.buildings} enregistré${kpis.buildings !== 1 ? 's' : ''}`}
        >
          <div className="dashboard-park-card dashboard-park-card--sky h-full p-4 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
            <p className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-sky-800/80 dark:text-sky-300/90">
              <span className="flex items-center gap-2">
                <KpiIconBuilding className="h-4 w-4 shrink-0" />
                Biens
              </span>
              <span className="text-[10px] font-semibold normal-case tracking-normal opacity-0 transition-opacity group-hover:opacity-100">
                Ouvrir →
              </span>
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-zinc-50">{kpis.buildings}</p>
          </div>
        </SmartLink>
        <SmartLink
          to="/biens"
          className="group block rounded-xl no-underline outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)]"
          aria-label={`Voir les biens et les unités — ${kpis.units} unité${kpis.units !== 1 ? 's' : ''}`}
        >
          <div className="dashboard-park-card dashboard-park-card--teal h-full p-4 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
            <p className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-teal-800/80 dark:text-teal-300/90">
              <span className="flex items-center gap-2">
                <KpiIconUnits className="h-4 w-4 shrink-0" />
                Unités
              </span>
              <span className="text-[10px] font-semibold normal-case tracking-normal opacity-0 transition-opacity group-hover:opacity-100">
                Ouvrir →
              </span>
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-zinc-50">{kpis.units}</p>
          </div>
        </SmartLink>
        <SmartLink
          to="/locataires"
          className="group block rounded-xl no-underline outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)]"
          aria-label={`Voir les locataires — ${kpis.tenants} enregistré${kpis.tenants !== 1 ? 's' : ''}`}
        >
          <div className="dashboard-park-card dashboard-park-card--amber h-full p-4 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
            <p className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-amber-900/80 dark:text-amber-300/90">
              <span className="flex items-center gap-2">
                <KpiIconTenant className="h-4 w-4 shrink-0" />
                Locataires
              </span>
              <span className="text-[10px] font-semibold normal-case tracking-normal opacity-0 transition-opacity group-hover:opacity-100">
                Ouvrir →
              </span>
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-zinc-50">{kpis.tenants}</p>
          </div>
        </SmartLink>
        <SmartLink
          to="/paiements?year=all&month=all"
          className="group block rounded-xl no-underline outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)]"
        >
          <div className="dashboard-park-card dashboard-park-card--emerald h-full p-4 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-800/80 dark:text-emerald-300/90">
              <KpiIconMoney className="h-4 w-4 shrink-0" />
              Loyer mensuel attendu
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-zinc-50">{fcfa(kpis.expectedMonthlyRent)}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">Ouvrir les paiements →</p>
          </div>
        </SmartLink>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Vue rapide en graphique</h2>
            <HelpHint title="Comparatif direct des montants clés du mois. Bleu : attendu, vert : encaissé, violet : cautions, orange : retards." />
          </div>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Les montants encaissés et cautions sont aussi détaillés dans la synthèse du mois ci-dessus — pas de doublon en dessous.
          </p>
          <div ref={barChartWrapRef} className="h-[240px] w-full min-h-[240px] min-w-0">
            {barChartW > 0 ? (
              <BarChart width={barChartW} height={240} data={dashboardBars} margin={{ top: 12, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.45} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                  formatter={(v) => [fcfa(Number(v)), 'Montant']}
                  labelStyle={{ fontWeight: 700 }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={58}>
                  {dashboardBars.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            ) : null}
          </div>
        </Card>
        <Card
          className={`lg:col-span-2 ${kpis.overdueCount > 0 ? 'border-amber-200 bg-amber-50/50 dark:border-amber-700/50 dark:bg-amber-950/25' : ''}`}
        >
          <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <KpiIconAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            Impayés / retard
          </h2>
          <p className="mt-3 text-3xl font-bold tabular-nums text-amber-800 dark:text-amber-300">{fcfa(kpis.overdueAmount)}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{kpis.overdueCount} échéance(s) concernée(s)</p>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Traiter les retards depuis les paiements ou les fiches location. Les alertes détaillées suivent plus bas.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
            <SmartLink
              to="/locations"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-brand-400 dark:hover:bg-slate-700/80"
            >
              Locations →
            </SmartLink>
            <SmartLink
              to="/paiements?overdue=1"
              className="inline-flex items-center justify-center rounded-xl border border-amber-300/80 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/55"
            >
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
              title="Comme sur la page Paiements : regroupement par mois, liste compacte ; double-cliquer une ligne ouvre le panneau à droite (encaissement, versement partiel, relances, fiche location)."
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
                    {items.map((a, rowIdx) => {
                      const [pY, pM] = a.period.split('-');
                      const periodCompact =
                        pY && pM && !Number.isNaN(Number(pY)) && !Number.isNaN(Number(pM))
                          ? `${String(pM).padStart(2, '0')}/${pY}`
                          : a.period;
                      const lieuTitle = a.building
                        ? `${a.building} — ${unitKindLabel(a.unitKind)} ${a.unit ?? '—'} · ${[a.commune, a.city].filter(Boolean).join(', ') || '—'}`
                        : '';
                      return (
                        <li
                          key={a.paymentId}
                          id={`dashboard-alert-${a.paymentId}`}
                          title="Clic pour ouvrir le détail"
                          onClick={(e) => onListRowClick(e, () => setZoomAlertPaymentId(a.paymentId))}
                          className={`scroll-mt-28 ${listBlockRowClass(rowIdx)} sm:items-start ${listTableRowOpenableClass} ${
                            zoomAlertPaymentId === a.paymentId
                              ? '!bg-brand-50/95 ring-1 ring-inset ring-brand-500/25 dark:!bg-brand-950/40 dark:ring-brand-500/30'
                              : ''
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <SmartLink
                                to={`/locataires?edit=${encodeURIComponent(a.tenantId)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
                              >
                                {a.tenant || 'Locataire'}
                              </SmartLink>
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyle(a.status)}`}
                              >
                                {statusLabel(a.status)}
                              </span>
                              {(() => {
                                const b = collectionCollectBadge(a.collectionTask);
                                return b ? (
                                  <span
                                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold normal-case ${b.className}`}
                                  >
                                    {b.label}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                            <p
                              className="max-w-[min(100%,28rem)] truncate text-xs text-slate-600 dark:text-slate-400"
                              title={lieuTitle}
                            >
                              {a.building ? (
                                <>
                                  <span className="font-medium text-slate-800 dark:text-slate-200">{a.building}</span>
                                  <span className="text-slate-400 dark:text-slate-500"> · </span>
                                  <span>{a.unit ?? '—'}</span>
                                  {[a.commune, a.city].filter(Boolean).length ? (
                                    <>
                                      <span className="text-slate-400 dark:text-slate-500"> · </span>
                                      <span>{[a.commune, a.city].filter(Boolean).join(', ')}</span>
                                    </>
                                  ) : null}
                                </>
                              ) : (
                                '—'
                              )}
                            </p>
                            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm tabular-nums">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{fcfa(a.amountDue)}</span>
                              {(a.status === 'PENDING' || a.status === 'LATE') && (a.amountPaid ?? 0) > 0 ? (
                                <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                                  Reste {fcfa(alertRemaining(a))}
                                </span>
                              ) : null}
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {periodCompact} · {formatDateFr(a.dueDate)}
                              </span>
                            </p>
                          </div>
                          <div className="shrink-0 self-center text-neutral-400 dark:text-zinc-500 sm:pt-0.5" aria-hidden>
                            <svg className="size-5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </li>
                      );
                    })}
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
