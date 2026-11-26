import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppPageTitle } from '@/components/AppPageTitle';
import { KpiIconBuilding } from '@/components/dashboardKpiIcons';
import { LinkButton } from '@/components/LinkButton';
import { PaymentZoomModal } from '@/components/PaymentZoomModal';
import { Button, Callout, EmptyState, Skeleton } from '@/components/ui/index';
import { api } from '@/lib/api';
import { toggleTableSortColumn } from '@/lib/tableSort';
import type { TableSortDir } from '@/lib/tableSort';
import { AlertsSection } from './AlertsSection';
import { ChartsSection } from './ChartsSection';
import { FinanceSection } from './FinanceSection';
import { ParkSection } from './ParkSection';
import { UpcomingSection } from './UpcomingSection';
import { compareUpcomingRows } from './types';
import type { DashboardPaymentAlert, Overview, UpcomingSortKey } from './types';

function DashboardSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="Chargement du tableau de bord">
      <span className="sr-only">Chargement du tableau de bord…</span>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-24 rounded-[var(--radius-card)]" />
        <Skeleton className="h-24 rounded-[var(--radius-card)]" />
        <Skeleton className="h-24 rounded-[var(--radius-card)]" />
        <Skeleton className="h-24 rounded-[var(--radius-card)]" />
      </div>
      <Skeleton className="h-60 w-full rounded-[var(--radius-card)]" />
    </div>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setErr(null);
    setData(null);
    api<Overview>('/dashboard')
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Erreur'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      { key: 'enc', name: 'Encaissé', value: enc, fill: 'var(--status-paid)' },
      { key: 'rest', name: 'Reste (à percevoir)', value: rest, fill: 'var(--color-muted)' },
    ];
  }, [data]);

  if (err) {
    return (
      <Callout variant="danger" title="Impossible de charger le tableau de bord.">
        <p>{err}</p>
        <Button className="mt-4" onClick={load}>
          Réessayer
        </Button>
      </Callout>
    );
  }

  if (!data) {
    return <DashboardSkeleton />;
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
        <FinanceSection
          kpis={kpis}
          coveragePieData={coveragePieData}
          monthLabelCap={monthLabelCap}
          rangeLabel={rangeLabel}
          pctOfExpected={pctOfExpected}
          remainingVsExpected={remainingVsExpected}
        />
      ) : null}

      {showUpcomingReminder ? (
        <UpcomingSection
          items={sortedUpcomingItems}
          upcoming={upcomingCollections}
          sortKey={upcomingSortKey}
          sortDir={upcomingSortDir}
          onSort={toggleUpcomingSort}
          selectedPaymentId={zoomAlertPaymentId}
          onOpenPayment={setZoomAlertPaymentId}
        />
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

      <ParkSection kpis={kpis} className="max-lg:hidden" />

      <ChartsSection kpis={kpis} />

      <AlertsSection
        alerts={alerts}
        monthGroups={alertMonthGroups}
        collapsedMonths={collapsedAlertMonths}
        setCollapsedMonths={setCollapsedAlertMonths}
        selectedPaymentId={zoomAlertPaymentId}
        onOpenPayment={setZoomAlertPaymentId}
      />

      <PaymentZoomModal
        paymentId={zoomAlertPaymentId}
        onClose={() => setZoomAlertPaymentId(null)}
        onUpdated={() => {
          void api<Overview>('/dashboard')
            .then((d) => {
              setErr(null);
              setData(d);
            })
            .catch((e) => setErr(e instanceof Error ? e.message : 'Erreur'));
        }}
      />
    </div>
  );
}
