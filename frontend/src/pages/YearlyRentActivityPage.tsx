import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppPageTitle, PageHeaderKpi } from '@/components/AppPageTitle';
import { SmartLink } from '@/components/SmartLink';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { isOverduePayment, paymentRemaining, type PaymentRow } from '@/lib/paymentRow';
import { statusLabel, statusStyle } from '@/lib/paymentStatusUi';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { Button, Card, HelpHint, Label, Select } from '@/components/ui';
import { toggleTableSortColumn } from '@/lib/tableSort';
import type { TableSortDir } from '@/lib/tableSort';
import { unitKindLabel } from '@/lib/unitKind';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function monthShortLabel(m: number): string {
  const raw = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(2000, m - 1, 1));
  return raw.replace(/\.$/, '');
}

type BuildingOpt = { id: string; name: string };
type TenantOpt = { id: string; firstName: string; lastName: string };

/** Réponse JSON parfois enveloppée ; toujours produire un tableau. */
function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.items)) return o.items;
    if (Array.isArray(o.results)) return o.results;
  }
  return [];
}

function normalizeTenants(raw: unknown): TenantOpt[] {
  const seen = new Set<string>();
  const out: TenantOpt[] = [];
  for (const t of extractArray(raw)) {
    if (!t || typeof t !== 'object') continue;
    const x = t as Record<string, unknown>;
    const id = x.id != null ? String(x.id) : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      firstName: String(x.firstName ?? ''),
      lastName: String(x.lastName ?? ''),
    });
  }
  return out;
}

function normalizeBuildings(raw: unknown): BuildingOpt[] {
  const seen = new Set<string>();
  const out: BuildingOpt[] = [];
  for (const b of extractArray(raw)) {
    if (!b || typeof b !== 'object') continue;
    const x = b as Record<string, unknown>;
    const id = x.id != null ? String(x.id) : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: String(x.name ?? ''),
    });
  }
  return out;
}

function leaseKey(p: PaymentRow): string {
  const id = (p as PaymentRow & { leaseId?: string }).leaseId;
  if (id) return id;
  return `${p.lease.tenant.id}-${p.lease.unit.building.name}-${p.lease.unit.label}`;
}

type LeaseRowModel = {
  key: string;
  label: string;
  sub: string;
  byMonth: Map<number, PaymentRow>;
};

function buildLeaseRows(payments: PaymentRow[], _year: number): LeaseRowModel[] {
  const byLease = new Map<string, PaymentRow[]>();
  for (const p of payments) {
    const k = leaseKey(p);
    if (!byLease.has(k)) byLease.set(k, []);
    byLease.get(k)!.push(p);
  }
  return [...byLease.entries()]
    .map(([key, list]) => {
      const first = list[0]!;
      const u = first.lease.unit;
      const b = u.building;
      const t = first.lease.tenant;
      const name = `${t.firstName} ${t.lastName}`.trim();
      const label = `${b.name} — ${u.label}`;
      const sub = `${name} · ${unitKindLabel(u.kind)}`;
      const byMonth = new Map<number, PaymentRow>();
      for (const p of list) {
        byMonth.set(p.periodMonth, p);
      }
      return { key, label, sub, byMonth };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
}

type YearlyLeaseSortKey = 'label' | 'sub';

function compareYearlyLeaseRows(a: LeaseRowModel, b: LeaseRowModel, key: YearlyLeaseSortKey, dir: TableSortDir): number {
  const sign = dir === 'asc' ? 1 : -1;
  const c =
    key === 'sub'
      ? a.sub.localeCompare(b.sub, 'fr', { sensitivity: 'base' })
      : a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' });
  const tie = c === 0 ? a.key.localeCompare(b.key) : c;
  return tie * sign;
}

function YearlyFirstColSortControls({
  scope,
  activeKey,
  dir,
  onSort,
}: {
  scope: 'tenant' | 'building';
  activeKey: YearlyLeaseSortKey;
  dir: TableSortDir;
  onSort: (k: YearlyLeaseSortKey) => void;
}) {
  function btn(key: YearlyLeaseSortKey, text: string) {
    const active = activeKey === key;
    return (
      <button
        type="button"
        onClick={() => onSort(key)}
        className={`inline-flex max-w-full items-center gap-1 rounded-md text-left text-[10px] font-semibold uppercase tracking-wide transition hover:text-brand-700 dark:hover:text-brand-300 ${
          active ? 'text-brand-700 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'
        }`}
        aria-label={`Trier par ${text}${active ? ` (${dir === 'asc' ? 'croissant' : 'décroissant'})` : ''}`}
      >
        <span>{text}</span>
        <span className="select-none font-normal tabular-nums opacity-75" aria-hidden>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      {btn('label', scope === 'tenant' ? 'Bail (lieu)' : 'Lieu')}
      {btn('sub', 'Locataire · nature')}
    </div>
  );
}

type CellBlock = {
  statusText: string;
  className: string;
  title: string;
  /** Ligne(s) montant sous le badge (vide si pas d’échéance). */
  amountLines: string[];
};

function cellContent(p: PaymentRow | undefined): CellBlock {
  if (!p) {
    return {
      statusText: '—',
      className: 'bg-slate-50 text-slate-400 dark:bg-slate-900/50 dark:text-slate-500',
      title: 'Aucune échéance pour ce mois',
      amountLines: [],
    };
  }
  const due = Number(p.amountDue);
  const paid = Number(p.amountPaid ?? 0);
  const rem = paymentRemaining(p);
  const partial = (p.status === 'PENDING' || p.status === 'LATE') && paid > 0 && paid < due;

  if (partial) {
    return {
      statusText: 'Partiel',
      className: 'bg-amber-100 text-amber-950 dark:bg-amber-950/55 dark:text-amber-100',
      title: `Loyer dû ${fcfa(due)} · Encaissé ${fcfa(paid)} · Reste ${fcfa(rem)}`,
      amountLines: [`Dû ${fcfa(due)}`, `Enc. ${fcfa(paid)} · Reste ${fcfa(rem)}`],
    };
  }
  if (p.status === 'PENDING' && isOverduePayment(p)) {
    return {
      statusText: 'Retard',
      className: 'bg-red-100 text-red-950 dark:bg-red-950/55 dark:text-red-100',
      title: `Loyer dû ${fcfa(due)} · Reste ${fcfa(rem)}`,
      amountLines: [`Dû ${fcfa(due)}`, `Reste ${fcfa(rem)}`],
    };
  }
  if (p.status === 'PAID') {
    const enc = Number(p.amountPaid ?? p.amountDue);
    return {
      statusText: 'Payé',
      className: statusStyle(p.status),
      title: `Encaissé ${fcfa(enc)} (loyer dû ${fcfa(due)})`,
      amountLines: [`Enc. ${fcfa(enc)}`],
    };
  }
  if (p.status === 'LATE') {
    return {
      statusText: 'Retard',
      className: statusStyle(p.status),
      title: `Loyer dû ${fcfa(due)} · Reste ${fcfa(rem)}`,
      amountLines: [`Dû ${fcfa(due)}`, `Reste ${fcfa(rem)}`],
    };
  }
  if (p.status === 'WAIVED') {
    return {
      statusText: 'Loyer offert',
      className: statusStyle(p.status),
      title: `Gratuité · référence loyer ${fcfa(due)}`,
      amountLines: [`Réf. ${fcfa(due)}`],
    };
  }
  if (p.status === 'CANCELLED') {
    return {
      statusText: 'Annulé',
      className: statusStyle(p.status),
      title: `Échéance annulée · loyer affiché ${fcfa(due)}`,
      amountLines: [`Dû ${fcfa(due)}`],
    };
  }
  return {
    statusText: p.status === 'PENDING' ? 'Attente' : statusLabel(p.status),
    className: statusStyle(p.status),
    title: `Loyer dû ${fcfa(due)}`,
    amountLines: [`Dû ${fcfa(due)}`],
  };
}

export function YearlyRentActivityPage() {
  useRegisterRootSectionFallback();
  const [params, setParams] = useSearchParams();

  const scope = (params.get('scope') === 'building' ? 'building' : 'tenant') as 'tenant' | 'building';
  const tenantId = params.get('tenantId')?.trim() ?? '';
  const buildingId = params.get('buildingId')?.trim() ?? '';

  const yearParam = params.get('year');
  const year = useMemo(() => {
    if (yearParam) {
      const y = Number(yearParam);
      if (Number.isInteger(y) && y >= 1990 && y <= 2100) return y;
    }
    return new Date().getFullYear();
  }, [yearParam]);

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantOpt[]>([]);
  const [buildings, setBuildings] = useState<BuildingOpt[]>([]);
  const [listsErr, setListsErr] = useState<string | null>(null);
  const [yearlyLeaseSortKey, setYearlyLeaseSortKey] = useState<YearlyLeaseSortKey>('label');
  const [yearlyLeaseSortDir, setYearlyLeaseSortDir] = useState<TableSortDir>('asc');

  useEffect(() => {
    let cancelled = false;
    setListsErr(null);
    Promise.all([api<unknown>('/tenants'), api<unknown>('/buildings')])
      .then(([tRaw, bRaw]) => {
        if (cancelled) return;
        setTenants(normalizeTenants(tRaw));
        setBuildings(normalizeBuildings(bRaw));
      })
      .catch((e) => {
        if (!cancelled) {
          setTenants([]);
          setBuildings([]);
          setListsErr(e instanceof Error ? e.message : 'Impossible de charger les listes locataires / biens.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPayments = useCallback(() => {
    if (scope === 'tenant' && !tenantId) {
      setRows([]);
      return;
    }
    if (scope === 'building' && !buildingId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setErr(null);
    const q = new URLSearchParams();
    q.set('year', String(year));
    if (scope === 'tenant') q.set('tenantId', tenantId);
    else q.set('buildingId', buildingId);
    api<PaymentRow[]>(`/payments?${q.toString()}`)
      .then(setRows)
      .catch((e) => {
        setErr(e instanceof Error ? e.message : 'Erreur');
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [scope, tenantId, buildingId, year]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  /** Paysage + marges à l’impression tant que cette page est affichée (bouton ou Ctrl+P). */
  useEffect(() => {
    const style = document.createElement('style');
    style.dataset.yearlyRentPrintPage = 'true';
    style.textContent = `@media print {
      @page { size: A4 landscape; margin: 8mm; }
    }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const leaseRows = useMemo(() => buildLeaseRows(rows, year), [rows, year]);

  const sortedLeaseRows = useMemo(() => {
    const copy = [...leaseRows];
    copy.sort((a, b) => compareYearlyLeaseRows(a, b, yearlyLeaseSortKey, yearlyLeaseSortDir));
    return copy;
  }, [leaseRows, yearlyLeaseSortKey, yearlyLeaseSortDir]);

  function toggleYearlyLeaseSort(key: YearlyLeaseSortKey) {
    const n = toggleTableSortColumn(yearlyLeaseSortKey, yearlyLeaseSortDir, key);
    setYearlyLeaseSortKey(n.key);
    setYearlyLeaseSortDir(n.dir);
  }

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => y + 1 - i);
  }, []);

  const tenantOptions = useMemo(
    () =>
      [...tenants]
        .sort((a, b) =>
          `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr', {
            sensitivity: 'base',
          }),
        )
        .map((t) => ({ id: t.id, label: `${t.firstName} ${t.lastName}`.trim() })),
    [tenants],
  );

  const buildingOptions = useMemo(
    () =>
      [...buildings]
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
        .map((b) => ({ id: b.id, label: b.name })),
    [buildings],
  );

  function setScope(next: 'tenant' | 'building') {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('scope', next);
        if (next === 'tenant') p.delete('buildingId');
        else p.delete('tenantId');
        return p;
      },
      { replace: true },
    );
  }

  function setTenantId(id: string) {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (id) p.set('tenantId', id);
        else p.delete('tenantId');
        return p;
      },
      { replace: true },
    );
  }

  function setBuildingId(id: string) {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (id) p.set('buildingId', id);
        else p.delete('buildingId');
        return p;
      },
      { replace: true },
    );
  }

  function setYear(y: number) {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('year', String(y));
        return p;
      },
      { replace: true },
    );
  }

  const selectionOk =
    (scope === 'tenant' && tenantId !== '') || (scope === 'building' && buildingId !== '');

  /** Ouvre Paiements avec les mêmes année / locataire ou bien / tous les mois. */
  const paymentsListHref = useMemo(() => {
    const q = new URLSearchParams();
    q.set('year', String(year));
    q.set('month', 'all');
    if (scope === 'tenant' && tenantId) q.set('tenantId', tenantId);
    if (scope === 'building' && buildingId) q.set('buildingId', buildingId);
    return `/paiements?${q.toString()}`;
  }, [year, scope, tenantId, buildingId]);

  const printContextLine = useMemo(() => {
    if (scope === 'tenant' && tenantId) {
      const t = tenants.find((x) => x.id === tenantId);
      return t ? `Locataire : ${t.firstName} ${t.lastName}`.trim() : '';
    }
    if (scope === 'building' && buildingId) {
      const b = buildings.find((x) => x.id === buildingId);
      return b ? `Bien : ${b.name}` : '';
    }
    return '';
  }, [scope, tenantId, buildingId, tenants, buildings]);

  const printDateLabel = useMemo(
    () =>
      new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [],
  );

  return (
    <div className="space-y-6">
      <AppPageTitle
        className="print:hidden"
        iconTo="/paiements"
        title="Activité loyers (vue annuelle)"
        hintTitle="Une ligne par bail actif : statut et montants (FCFA) mois par mois. Le lien vers Paiements reprend la même année, le même locataire ou le même bien, et tous les mois. Les baux inactifs ne sont pas listés par l’API."
        subtitle="Calendrier des encaissements et retards, mois par mois."
        actions={<PageHeaderKpi label="Total" value={String(sortedLeaseRows.length)} />}
      />

      <Card className="space-y-4 p-4 print:hidden sm:p-5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              scope === 'tenant'
                ? 'border-brand-600 bg-brand-50 text-brand-900 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-100'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
            }`}
            onClick={() => setScope('tenant')}
          >
            Par locataire
          </button>
          <button
            type="button"
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              scope === 'building'
                ? 'border-brand-600 bg-brand-50 text-brand-900 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-100'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
            }`}
            onClick={() => setScope('building')}
          >
            Par bien
          </button>
        </div>

        {listsErr ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            {listsErr}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="yra-year">Année</Label>
            <Select id="yra-year" value={String(year)} onChange={(e) => setYear(Number(e.target.value))} className="mt-1 w-full">
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
          {scope === 'tenant' ? (
            <div className="sm:col-span-2">
              <Label htmlFor="yra-tenant">
                Locataire <span className="font-normal text-slate-500">({tenantOptions.length})</span>
              </Label>
              <div className="mt-1">
                <Select
                  id="yra-tenant"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full"
                  aria-label={`Choisir un locataire parmi ${tenantOptions.length} locataires`}
                >
                  <option value="">— Choisir un locataire —</option>
                  {tenantOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <Label htmlFor="yra-building">
                Bien <span className="font-normal text-slate-500">({buildingOptions.length})</span>
              </Label>
              <div className="mt-1">
                <Select
                  id="yra-building"
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  className="w-full"
                  aria-label={`Choisir un bien parmi ${buildingOptions.length} biens`}
                >
                  <option value="">— Choisir un bien —</option>
                  {buildingOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 p-3 dark:border-slate-600 dark:bg-slate-800/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <HelpHint
                title="Chaque colonne = la période de facturation du mois. « — » = pas d’échéance enregistrée pour ce bail sur ce mois."
                className="align-middle"
              />
              <span>
                Le bouton ci-contre ouvre la liste <strong className="font-semibold text-slate-800 dark:text-slate-200">Paiements</strong>{' '}
                avec l’année <strong className="tabular-nums">{year}</strong>, le filtre « tous les mois », et le locataire ou le bien déjà choisis lorsque c’est possible.
              </span>
            </p>
            <SmartLink
              to={paymentsListHref}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400"
            >
              Voir les paiements (mêmes critères) →
            </SmartLink>
          </div>
        </div>
      </Card>

      {err ? (
        <Card className="border-red-200 bg-red-50/90 p-4 text-sm text-red-900 print:hidden dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
          {err}
        </Card>
      ) : null}

      {!selectionOk ? (
        <Card className="p-6 text-sm text-slate-600 print:hidden dark:text-slate-400">
          Choisissez un locataire ou un bien pour afficher le tableau janvier → décembre {year}.
        </Card>
      ) : loading ? (
        <p className="text-slate-500 print:hidden dark:text-slate-400">Chargement…</p>
      ) : sortedLeaseRows.length === 0 ? (
        <Card className="space-y-4 p-6 text-sm text-slate-600 print:hidden dark:text-slate-400">
          <p>Aucune échéance pour cette sélection sur l’année {year} (baux actifs uniquement).</p>
          {selectionOk ? (
            <SmartLink
              to={paymentsListHref}
              className="inline-flex w-fit items-center rounded-lg border border-brand-400/80 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-900 transition hover:bg-brand-100 dark:border-brand-500/50 dark:bg-brand-950/40 dark:text-brand-100 dark:hover:bg-brand-900/50"
            >
              Consulter quand même Paiements (même année & périmètre) →
            </SmartLink>
          ) : null}
        </Card>
      ) : (
        <Card className="overflow-hidden !p-0 shadow-sm ring-1 ring-slate-900/[0.04] print:max-w-none print:overflow-visible print:shadow-none print:ring-0 dark:ring-slate-600/35">
          <div className="hidden border-b border-slate-300 px-4 py-4 print:block print:bg-white">
            <h2 className="text-lg font-bold text-slate-900">ImmoPilot — Activité loyers (vue annuelle)</h2>
            <p className="mt-1 text-sm text-slate-700">Année {year}</p>
            {printContextLine ? <p className="mt-0.5 text-sm text-slate-700">{printContextLine}</p> : null}
            <p className="mt-2 text-xs text-slate-500">Imprimé le {printDateLabel}</p>
          </div>
          <div className="flex flex-col gap-2 border-b border-slate-200/90 bg-gradient-to-r from-brand-50/80 to-slate-50/90 px-4 py-3 dark:border-slate-700 dark:from-brand-950/30 dark:to-slate-900/80 sm:flex-row sm:items-center sm:justify-between sm:px-5 print:hidden">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Liste détaillée</span>
              {' · '}
              année {year}
              {scope === 'tenant' && tenantId
                ? ', locataire sélectionné'
                : scope === 'building' && buildingId
                  ? ', bien sélectionné'
                  : ''}
              , tous les mois.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 text-xs font-semibold"
                onClick={() => window.print()}
              >
                Imprimer le tableau
              </Button>
              <SmartLink
                to={paymentsListHref}
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400"
              >
                Ouvrir Paiements →
              </SmartLink>
            </div>
          </div>
          <div className="overflow-x-auto print:overflow-visible print:max-w-none">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm print:min-w-0 print:table-fixed print:w-full print:text-[10px] print:text-black">
              <colgroup>
                <col className="print:w-[22%]" />
                {MONTHS.map((m) => (
                  <col key={m} className="print:w-[6.5%]" />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400 print:text-[8px]">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 min-w-[14rem] bg-slate-50 px-3 py-2.5 align-top shadow-[1px_0_0_0_rgb(226_232_240)] print:static print:min-w-0 print:max-w-none print:bg-white print:px-1.5 print:py-1 print:align-bottom print:font-bold print:normal-case print:shadow-none dark:bg-slate-900/95 dark:shadow-[1px_0_0_0_rgb(51_65_85)]"
                  >
                    <YearlyFirstColSortControls
                      scope={scope}
                      activeKey={yearlyLeaseSortKey}
                      dir={yearlyLeaseSortDir}
                      onSort={toggleYearlyLeaseSort}
                    />
                  </th>
                  {MONTHS.map((m) => (
                    <th
                      key={m}
                      className="px-1.5 py-2.5 text-center whitespace-nowrap print:px-0.5 print:py-1 print:leading-none"
                    >
                      {monthShortLabel(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedLeaseRows.map((lr) => (
                  <tr
                    key={lr.key}
                    className="border-b border-slate-100 odd:bg-white even:bg-slate-50/50 print:break-inside-avoid dark:border-slate-800 dark:odd:bg-slate-900/40 dark:even:bg-slate-900/20"
                  >
                    <th
                      scope="row"
                      className="sticky left-0 z-10 max-w-[18rem] bg-inherit px-3 py-3 text-left align-top shadow-[1px_0_0_0_rgb(241_245_249)] print:static print:min-w-0 print:max-w-none print:overflow-hidden print:px-1.5 print:py-1.5 print:align-top print:shadow-none dark:shadow-[1px_0_0_0_rgb(30_41_59)]"
                    >
                      <p className="font-semibold text-slate-900 print:text-[10px] print:leading-snug dark:text-slate-100">
                        {lr.label}
                      </p>
                      <p className="mt-0.5 text-xs font-normal text-slate-500 print:text-[8px] print:leading-tight dark:text-slate-400">
                        {lr.sub}
                      </p>
                    </th>
                    {MONTHS.map((m) => {
                      const p = lr.byMonth.get(m);
                      const cell = cellContent(p);
                      return (
                        <td
                          key={m}
                          className="px-1 py-2 text-center align-middle print:px-0.5 print:py-1"
                        >
                          <div
                            className="inline-flex min-w-[4.5rem] max-w-[7.5rem] flex-col items-center gap-0.5 print:min-w-0 print:max-w-full print:gap-0"
                            title={cell.title}
                          >
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-tight print:rounded print:px-0.5 print:py-0 print:text-[8px] print:leading-tight ${cell.className}`}
                            >
                              {cell.statusText}
                            </span>
                            {cell.amountLines.map((line, i) => (
                              <span
                                key={`${m}-amt-${i}`}
                                className="max-w-full break-words text-[10px] font-medium leading-tight tabular-nums text-slate-600 print:text-[7px] print:leading-tight dark:text-slate-400"
                              >
                                {line}
                              </span>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
