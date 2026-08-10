import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { SmartLink } from '@/components/SmartLink';
import { useReturnRowFocus } from '@/hooks/useReturnRowFocus';
import { api } from '@/lib/api';
import { fcfa, formatDateFr } from '@/lib/format';
import {
  collectionCollectBadge,
  isOverduePayment,
  monthGroupKey,
  paymentRemaining,
  type PaymentRow,
} from '@/lib/paymentRow';
import { AppPageTitle, PageHeaderKpi } from '@/components/AppPageTitle';
import { PdfPrintButton } from '@/components/PdfPrintButton';
import { PaymentZoomModal } from '@/components/PaymentZoomModal';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { SearchableSelect } from '@/components/SearchableSelect';
import { AmountFcfaInput, Button, Card, HelpHint, Label, Select } from '@/components/ui';
import { monthTitle, statusLabel, statusStyle } from '@/lib/paymentStatusUi';
import { listTableCellClass, listTableDataRowClass, listTableFirstCellClass, listTableRowOpenableClass, onListRowDoubleClick } from '@/lib/listTableStyles';
import { shouldDeferEscapeCancel } from '@/lib/useEscapeCancel';
import { unitKindLabel } from '@/lib/unitKind';
import { SortableTh } from '@/components/SortableTh';
import type { TableSortDir } from '@/lib/tableSort';
import { toggleTableSortColumn } from '@/lib/tableSort';
import { collectionMethodLabel, COLLECTION_METHOD_OPTIONS } from '@/lib/collectionMethodUi';
import { OdooActionBar } from '@/components/OdooKit';

type PaymentSortKey = 'tenant' | 'place' | 'amount' | 'schedule' | 'status' | 'lease';

function paymentPlaceSortKey(p: PaymentRow) {
  const u = p.lease.unit;
  const b = u.building;
  return `${b.name} ${u.label} ${b.commune ?? ''} ${b.city ?? ''}`.trim();
}

function comparePaymentRows(a: PaymentRow, b: PaymentRow, key: PaymentSortKey, dir: TableSortDir): number {
  const sign = dir === 'asc' ? 1 : -1;
  let c = 0;
  switch (key) {
    case 'tenant':
      c = `${a.lease.tenant.lastName} ${a.lease.tenant.firstName}`.localeCompare(
        `${b.lease.tenant.lastName} ${b.lease.tenant.firstName}`,
        'fr',
        { sensitivity: 'base' },
      );
      break;
    case 'place':
      c = paymentPlaceSortKey(a).localeCompare(paymentPlaceSortKey(b), 'fr', { sensitivity: 'base' });
      break;
    case 'amount':
      c = Number(a.amountDue) - Number(b.amountDue);
      break;
    case 'schedule':
      c = a.periodYear !== b.periodYear ? a.periodYear - b.periodYear : a.periodMonth - b.periodMonth;
      if (c === 0) c = a.dueDate.localeCompare(b.dueDate);
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
  if (c === 0) {
    c = a.dueDate.localeCompare(b.dueDate);
    if (c === 0) c = a.id.localeCompare(b.id);
  }
  return c * sign;
}

type BuildingOpt = {
  id: string;
  name: string;
  units: { id: string; label: string; kind: string }[];
};

type TenantOpt = { id: string; firstName: string; lastName: string };

const MOIS_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tous les mois' },
  ...Array.from({ length: 12 }, (_, i) => {
    const label = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2000, i, 1));
    return { value: String(i + 1), label: label.charAt(0).toUpperCase() + label.slice(1) };
  }),
];

function IconCalendar({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 2v3M16 2v3M3 9h18" strokeLinecap="round" />
      <rect x="3" y="5" width="18" height="17" rx="2" />
    </svg>
  );
}

function IconLayoutList({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 6h12M9 12h12M9 18h12M5 6h.01M5 12h.01M5 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PaymentsPage() {
  useRegisterRootSectionFallback();
  const routerLocation = useLocation();
  const locationSheetState = useMemo(() => ({ backgroundLocation: routerLocation }), [routerLocation]);
  const [params, setParams] = useSearchParams();
  const overdueOnly = params.get('overdue') === '1' || params.get('overdue') === 'true';
  const leaseIdFilter = params.get('leaseId')?.trim() || '';
  const hintTenant = params.get('hintTenant')?.trim() || '';
  const hintPlace = params.get('hintPlace')?.trim() || '';
  const buildingIdFilter = params.get('buildingId')?.trim() || '';
  const unitIdFilter = params.get('unitId')?.trim() || '';
  const tenantIdFilter = params.get('tenantId')?.trim() || '';
  const yearParam = params.get('year');
  const monthParam = params.get('month');
  const methodParam = params.get('method')?.trim() || 'all';
  const methodFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'Tous les modes' },
      ...COLLECTION_METHOD_OPTIONS.filter((o) => o.value !== ''),
    ],
    [],
  );
  const methodFilter = useMemo(() => {
    const allowed = new Set(methodFilterOptions.map((o) => o.value));
    return allowed.has(methodParam) ? methodParam : 'all';
  }, [methodFilterOptions, methodParam]);

  const yearFilter: number | 'all' = useMemo(() => {
    if (yearParam === 'all') return 'all';
    if (yearParam !== null && yearParam !== '') {
      const n = Number(yearParam);
      if (!Number.isNaN(n)) return n;
    }
    return new Date().getFullYear();
  }, [yearParam]);

  const monthFilter: number | 'all' = useMemo(() => {
    if (monthParam === 'all') return 'all';
    if (monthParam !== null && monthParam !== '') {
      const n = Number(monthParam);
      if (Number.isInteger(n) && n >= 1 && n <= 12) return n;
    }
    if (overdueOnly) return 'all';
    return new Date().getMonth() + 1;
  }, [monthParam, overdueOnly]);

  const worksheetPdfPath = useMemo(() => {
    const q = new URLSearchParams();
    if (overdueOnly) q.set('overdue', '1');
    if (leaseIdFilter) q.set('leaseId', leaseIdFilter);
    else {
      if (buildingIdFilter) q.set('buildingId', buildingIdFilter);
      if (unitIdFilter) q.set('unitId', unitIdFilter);
      if (tenantIdFilter) q.set('tenantId', tenantIdFilter);
    }
    if (yearFilter !== 'all') q.set('year', String(yearFilter));
    if (monthFilter !== 'all') q.set('month', String(monthFilter));
    if (methodFilter !== 'all') q.set('method', methodFilter);
    const s = q.toString();
    return `/payments/worksheet.pdf${s ? `?${s}` : ''}`;
  }, [overdueOnly, leaseIdFilter, buildingIdFilter, unitIdFilter, tenantIdFilter, yearFilter, monthFilter, methodFilter]);

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [paymentsReady, setPaymentsReady] = useState(false);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [partialFor, setPartialFor] = useState<PaymentRow | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialErr, setPartialErr] = useState('');
  const [partialSubmitting, setPartialSubmitting] = useState(false);
  const [collapsedMonthKeys, setCollapsedMonthKeys] = useState(() => new Set<string>());
  const [zoomPaymentId, setZoomPaymentId] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<BuildingOpt[]>([]);
  const [tenants, setTenants] = useState<TenantOpt[]>([]);
  const [paySortKey, setPaySortKey] = useState<PaymentSortKey>('tenant');
  const [paySortDir, setPaySortDir] = useState<TableSortDir>('asc');
  const [mobileCriteriaOpen, setMobileCriteriaOpen] = useState(false);

  function togglePaySort(key: PaymentSortKey) {
    const n = toggleTableSortColumn(paySortKey, paySortDir, key);
    setPaySortKey(n.key);
    setPaySortDir(n.dir);
  }

  const load = useCallback(() => {
    /* Ne pas passer paymentsReady à false : ça déclenche des effets et peut faire « sauter » le scroll. */
    const q = new URLSearchParams();
    if (overdueOnly) q.set('overdue', '1');
    if (leaseIdFilter) q.set('leaseId', leaseIdFilter);
    else {
      if (buildingIdFilter) q.set('buildingId', buildingIdFilter);
      if (unitIdFilter) q.set('unitId', unitIdFilter);
      if (tenantIdFilter) q.set('tenantId', tenantIdFilter);
    }
    if (yearFilter !== 'all') q.set('year', String(yearFilter));
    if (monthFilter !== 'all') q.set('month', String(monthFilter));
    const qs = q.toString();
    api<PaymentRow[]>(`/payments${qs ? `?${qs}` : ''}`)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setPaymentsReady(true));
  }, [
    buildingIdFilter,
    leaseIdFilter,
    monthFilter,
    overdueOnly,
    tenantIdFilter,
    unitIdFilter,
    yearFilter,
  ]);

  useEffect(() => {
    api<BuildingOpt[]>('/buildings').then(setBuildings).catch(() => setBuildings([]));
    api<TenantOpt[]>('/tenants').then(setTenants).catch(() => setTenants([]));
  }, []);

  /** Si l’unité ne correspond plus au bien choisi, on retire unitId de l’URL. */
  useEffect(() => {
    if (leaseIdFilter) return;
    if (!buildingIdFilter || !unitIdFilter || buildings.length === 0) return;
    const b = buildings.find((x) => x.id === buildingIdFilter);
    if (!b?.units.some((u) => u.id === unitIdFilter)) {
      setParams(
        (prev) => {
          const q = new URLSearchParams(prev);
          q.delete('unitId');
          return q;
        },
        { replace: true },
      );
    }
  }, [buildingIdFilter, buildings, leaseIdFilter, setParams, unitIdFilter]);

  /** Lien direct avec unitId seul : on complète buildingId pour afficher les listes cohérentes. */
  useEffect(() => {
    if (leaseIdFilter || buildingIdFilter || !unitIdFilter || buildings.length === 0) return;
    for (const b of buildings) {
      if (b.units.some((u) => u.id === unitIdFilter)) {
        setParams(
          (prev) => {
            const q = new URLSearchParams(prev);
            q.set('buildingId', b.id);
            return q;
          },
          { replace: true },
        );
        return;
      }
    }
  }, [buildingIdFilter, buildings, leaseIdFilter, setParams, unitIdFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const visibleIds = new Set(
      rows
        .filter((r) =>
          methodFilter === 'all'
            ? true
            : (r.collectionMethod ?? 'CASH') === methodFilter,
        )
        .map((r) => r.id),
    );
    setSelectedPaymentIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [rows, methodFilter]);

  /** Après versement partiel / marquer payé / relance / modale : éviter le retour en haut de page. */
  const scrollRestoreAfterPaymentsRef = useRef<{ paymentId: string; fallbackY: number } | null>(null);

  function scheduleScrollRestoreBeforeLoad(paymentId: string, fallbackY?: number) {
    scrollRestoreAfterPaymentsRef.current = {
      paymentId,
      fallbackY: fallbackY ?? window.scrollY,
    };
  }

  function applyPaymentRowScrollRestore(pending: { paymentId: string; fallbackY: number }) {
    const maxScrollY = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const applyY = (top: number) => {
      const t = Math.max(0, Math.min(top, maxScrollY()));
      window.scrollTo({ top: t, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = t;
      document.body.scrollTop = t;
    };

    const row = document.getElementById(`payment-${pending.paymentId}`);
    if (row) {
      row.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      const details = row.querySelector('details');
      if (details) details.open = true;
    } else {
      applyY(pending.fallbackY);
    }
  }

  useLayoutEffect(() => {
    if (!paymentsReady) return;
    const pending = scrollRestoreAfterPaymentsRef.current;
    if (!pending) return;
    scrollRestoreAfterPaymentsRef.current = null;

    const p = rows.find((r) => r.id === pending.paymentId);
    if (p) {
      const mk = monthGroupKey(p);
      setCollapsedMonthKeys((prev) => {
        if (!prev.has(mk)) return prev;
        const next = new Set(prev);
        next.delete(mk);
        return next;
      });
    }

    const run = () => applyPaymentRowScrollRestore(pending);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        run();
        window.setTimeout(run, 0);
      });
    });
  }, [rows, paymentsReady]);

  const flashPaymentRowId = useReturnRowFocus({ rowIdPrefix: 'payment-', ready: paymentsReady });

  function paymentRowFlash(active: boolean) {
    return active
      ? 'ring-2 ring-inset ring-brand-500/90 bg-brand-50/90 shadow-[0_0_0_1px_rgba(59,130,246,0.35)] dark:bg-brand-950/45 dark:ring-brand-400/80'
      : '';
  }

  const focusPaymentId = params.get('focus');

  useEffect(() => {
    if (!focusPaymentId || rows.length === 0) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(`payment-${focusPaymentId}`);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('ring-2', 'ring-brand-500', 'ring-offset-1', 'rounded-xl');
      window.setTimeout(() => el.classList.remove('ring-2', 'ring-brand-500', 'ring-offset-1', 'rounded-xl'), 2400);
    }, 220);
    return () => clearTimeout(t);
  }, [focusPaymentId, rows]);

  const visibleRows = useMemo(() => {
    if (methodFilter === 'all') return rows;
    return rows.filter((p) => (p.collectionMethod ?? 'CASH') === methodFilter);
  }, [rows, methodFilter]);

  const stats = useMemo(() => {
    let aEncaisser = 0;
    let encaisse = 0;
    let retards = 0;
    let payees = 0;
    let partialLines = 0;
    for (const p of visibleRows) {
      if (p.status === 'PAID') {
        payees += 1;
        encaisse += Number(p.amountPaid ?? p.amountDue);
      } else if (p.status === 'PENDING' || p.status === 'LATE') {
        aEncaisser += paymentRemaining(p);
        encaisse += Number(p.amountPaid ?? 0);
        if (Number(p.amountPaid ?? 0) > 0) partialLines += 1;
        if (isOverduePayment(p)) retards += 1;
      }
    }
    return { total: visibleRows.length, aEncaisser, encaisse, retards, payees, partialLines };
  }, [visibleRows]);

  const collectionTotals = useMemo(() => {
    const sums = new Map<string, number>();
    for (const p of visibleRows) {
      const key = p.collectionMethod ?? 'CASH';
      const current = sums.get(key) ?? 0;
      const enc = p.status === 'PAID' ? Number(p.amountPaid ?? p.amountDue) : Number(p.amountPaid ?? 0);
      sums.set(key, current + enc);
    }
    return [...sums.entries()].map(([key, total]) => ({
      key,
      label: collectionMethodLabel(key),
      total,
    }));
  }, [visibleRows]);

  const monthGroups = useMemo(() => {
    const map = new Map<string, PaymentRow[]>();
    for (const p of visibleRows) {
      const k = monthGroupKey(p);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    for (const list of map.values()) {
      list.sort((a, b) => comparePaymentRows(a, b, paySortKey, paySortDir));
    }
    return [...map.entries()].sort(([ka], [kb]) => ka.localeCompare(kb));
  }, [visibleRows, paySortKey, paySortDir]);

  const selectedRows = useMemo(() => {
    if (selectedPaymentIds.length === 0) return [];
    const selected = new Set(selectedPaymentIds);
    return visibleRows.filter((r) => selected.has(r.id));
  }, [visibleRows, selectedPaymentIds]);

  const selectableRows = useMemo(
    () =>
      selectedRows.filter(
        (p) =>
          (p.status === 'PENDING' || p.status === 'LATE') &&
          paymentRemaining(p) > 0,
      ),
    [selectedRows],
  );

  const monthKeysSig = useMemo(() => monthGroups.map(([k]) => k).join('\0'), [monthGroups]);

  /**
   * Par défaut : tous les mois sont repliés. Lien direct ?focus= : ne déplier que le mois du paiement ciblé.
   * Ne pas dépendre de `rows` : un simple rechargement des données (versement, marquer payé…) change `rows`
   * mais pas la liste des clés de mois — sinon on replie tout à chaque `load()` et on perd scroll + menus ouverts.
   */
  useLayoutEffect(() => {
    const keys = monthGroups.map(([k]) => k);
    if (focusPaymentId && rows.length > 0) {
      const p = rows.find((r) => r.id === focusPaymentId);
      if (p) {
        const focusKey = monthGroupKey(p);
        const next = new Set<string>();
        for (const k of keys) {
          if (k !== focusKey) next.add(k);
        }
        setCollapsedMonthKeys(next);
        return;
      }
    }
    setCollapsedMonthKeys(new Set(keys));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- volontaire : éviter reset au refresh des lignes
  }, [monthKeysSig, focusPaymentId]);

  useEffect(() => {
    if (!partialFor || partialSubmitting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (shouldDeferEscapeCancel()) return;
      e.preventDefault();
      setPartialFor(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [partialFor, partialSubmitting]);

  useEffect(() => {
    if (!zoomPaymentId) return;
    if (!rows.some((r) => r.id === zoomPaymentId)) setZoomPaymentId(null);
  }, [rows, zoomPaymentId]);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => y + 1 - i);
  }, []);

  const scopeSummaryParts = useMemo(() => {
    if (leaseIdFilter) return [];
    const parts: string[] = [];
    if (tenantIdFilter) {
      const t = tenants.find((x) => x.id === tenantIdFilter);
      parts.push(t ? `${t.firstName} ${t.lastName}`.trim() : 'Locataire');
    }
    if (buildingIdFilter) {
      const b = buildings.find((x) => x.id === buildingIdFilter);
      parts.push(b ? b.name : 'Bien');
    }
    if (unitIdFilter) {
      let label: string | null = null;
      for (const b of buildings) {
        const u = b.units.find((x) => x.id === unitIdFilter);
        if (u) {
          label = unitKindLabel(u.kind) + ' — ' + u.label;
          break;
        }
      }
      parts.push(label ?? 'Unité');
    }
    return parts;
  }, [leaseIdFilter, tenantIdFilter, buildingIdFilter, unitIdFilter, tenants, buildings]);

  const periodSummaryLabel = useMemo(() => {
    const y = yearFilter === 'all' ? 'Toutes les années' : String(yearFilter);
    const m =
      monthFilter === 'all'
        ? 'tous les mois'
        : MOIS_SELECT_OPTIONS.find((o) => o.value === String(monthFilter))?.label ?? '';
    const scope =
      scopeSummaryParts.length > 0 ? ` · ${scopeSummaryParts.join(' · ')}` : '';
    const methodPart =
      methodFilter === 'all'
        ? ''
        : ` · ${collectionMethodLabel(methodFilter)}`;
    return `${y} · ${m}${scope}${methodPart}`;
  }, [yearFilter, monthFilter, scopeSummaryParts, methodFilter]);

  const unitsForBuildingFilter = useMemo(() => {
    if (!buildingIdFilter) return [];
    const b = buildings.find((x) => x.id === buildingIdFilter);
    if (!b?.units.length) return [];
    return [...b.units].sort((a, c) =>
      a.label.localeCompare(c.label, 'fr', { numeric: true, sensitivity: 'base' }),
    );
  }, [buildingIdFilter, buildings]);

  const paymentScopeInputClass =
    'min-h-[2rem] border-slate-200 bg-white py-1.5 pl-2.5 text-xs font-medium text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-950/80';

  const tenantSearchOptions = useMemo(
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

  const buildingSearchOptions = useMemo(
    () =>
      [...buildings]
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
        .map((b) => ({ id: b.id, label: b.name })),
    [buildings],
  );

  const unitSearchOptions = useMemo(
    () =>
      unitsForBuildingFilter.map((u) => ({
        id: u.id,
        label: `${unitKindLabel(u.kind)} — ${u.label}`,
      })),
    [unitsForBuildingFilter],
  );

  const leaseFocusSummary = useMemo(() => {
    if (!leaseIdFilter) return null;
    if (rows.length > 0) {
      const l = rows[0]!.lease;
      return {
        tenant: `${l.tenant.firstName} ${l.tenant.lastName}`.trim(),
        place: `${l.unit.building.name} — ${l.unit.label}`,
      };
    }
    if (hintTenant || hintPlace) {
      return { tenant: hintTenant || '—', place: hintPlace || '—' };
    }
    return { tenant: '', place: '' };
  }, [leaseIdFilter, rows, hintTenant, hintPlace]);

  function clearLeaseFilter() {
    setParams(
      (prev) => {
        const q = new URLSearchParams(prev);
        q.delete('leaseId');
        q.delete('hintTenant');
        q.delete('hintPlace');
        return q;
      },
      { replace: true },
    );
  }

  function clearScopeFilters() {
    setParams(
      (prev) => {
        const q = new URLSearchParams(prev);
        q.delete('buildingId');
        q.delete('unitId');
        q.delete('tenantId');
        return q;
      },
      { replace: true },
    );
  }

  async function submitPartial() {
    if (!partialFor) return;
    const remaining = paymentRemaining(partialFor);
    const n = Number(partialAmount.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(n) || n < 1) {
      setPartialErr('Indiquez un montant valide (minimum 1 FCFA).');
      return;
    }
    if (n > remaining + 0.01) {
      setPartialErr(`Maximum : ${Math.round(remaining).toLocaleString('fr-FR')} FCFA.`);
      return;
    }
    const paymentId = partialFor.id;
    setPartialSubmitting(true);
    setPartialErr('');
    try {
      await api(`/payments/${paymentId}`, {
        method: 'PATCH',
        json: { addAmountPaid: n },
      });
      setPartialFor(null);
      /* Après fermeture du modal, la mise en page change : on attend le prochain frame puis on mémorise le scroll et on recharge. */
      window.setTimeout(() => {
        scheduleScrollRestoreBeforeLoad(paymentId, window.scrollY);
        load();
      }, 0);
    } catch (e) {
      setPartialErr(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setPartialSubmitting(false);
    }
  }

  function togglePaymentSelection(paymentId: string) {
    setSelectedPaymentIds((prev) =>
      prev.includes(paymentId)
        ? prev.filter((id) => id !== paymentId)
        : [...prev, paymentId],
    );
  }

  function toggleAllInMonth(items: PaymentRow[], checked: boolean) {
    const ids = items.map((p) => p.id);
    setSelectedPaymentIds((prev) => {
      if (checked) {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return [...next];
      }
      return prev.filter((id) => !ids.includes(id));
    });
  }

  async function markSelectedPaid() {
    if (selectableRows.length === 0) {
      alert('Aucune ligne sélectionnée payable (en attente / en retard).');
      return;
    }
    const count = selectableRows.length;
    const ok = confirm(
      `Marquer ${count} paiement${count > 1 ? 's' : ''} comme payé${count > 1 ? 's' : ''} ?`,
    );
    if (!ok) return;
    setBulkSubmitting(true);
    try {
      await Promise.all(
        selectableRows.map((p) =>
          api(`/payments/${p.id}`, {
            method: 'PATCH',
            json: {
              status: 'PAID',
              amountPaid: Number(p.amountDue),
              paidAt: new Date().toISOString().slice(0, 10),
            },
          }),
        ),
      );
      setSelectedPaymentIds([]);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action groupée impossible.');
    } finally {
      setBulkSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-10">
      {focusPaymentId ? (
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
          <button
            type="button"
            className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
            onClick={() =>
              setParams(
                (prev) => {
                  const q = new URLSearchParams(prev);
                  q.delete('focus');
                  return q;
                },
                { replace: true },
              )
            }
          >
            Fermer la surbrillance (lien direct)
          </button>
        </p>
      ) : null}
      <AppPageTitle
        iconTo="/paiements"
        title="Paiements"
        hintTitle="Double-cliquez une ligne pour le détail (bien, mode d’encaissement, fiche bail, actions). La liste ne montre que l’essentiel."
        subtitle={
          leaseIdFilter ? (
            <>
              <strong className="font-semibold text-slate-800 dark:text-slate-200">Ce bail uniquement</strong> — échéances
              filtrées. La caution se gère sur la fiche location.
            </>
          ) : (
            <>Échéances mensuelles, encaissements et relances.</>
          )
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PageHeaderKpi label="Total" value={String(visibleRows.length)} />
            <PdfPrintButton
              path={worksheetPdfPath}
              title="Feuille de route PDF (mêmes filtres que la liste) : cases perçu, notes, puis saisie dans l’app"
            />
          </div>
        }
      >
        {leaseIdFilter ? (
          <div
            className="max-w-2xl rounded-lg border border-brand-200/90 bg-gradient-to-br from-brand-50/95 to-white px-4 py-3 shadow-sm dark:border-brand-500/35 dark:from-brand-950/50 dark:to-slate-900/80"
            role="status"
          >
            <p className="text-sm font-semibold text-brand-950 dark:text-brand-100">
              Paiements / échéances — ce bail seulement
            </p>
            {leaseFocusSummary && (leaseFocusSummary.tenant || leaseFocusSummary.place) ? (
              <p className="mt-2 text-sm leading-snug text-slate-800 dark:text-slate-200">
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {leaseFocusSummary.tenant || 'Locataire'}
                </span>
                {leaseFocusSummary.place ? (
                  <>
                    {' '}
                    · <span className="font-normal">{leaseFocusSummary.place}</span>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Les lignes listées correspondent uniquement à ce bail (identifiant interne). Si la liste est vide, elles ne
                sont peut-être pas encore générées pour la période choisie.
              </p>
            )}
            <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
              <SmartLink
                to={`/locations/${leaseIdFilter}`}
                state={locationSheetState}
                className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
              >
                ← Fiche location de ce bail
              </SmartLink>
              <button
                type="button"
                className="font-semibold text-slate-700 underline-offset-2 hover:underline dark:text-slate-300"
                onClick={clearLeaseFilter}
              >
                Afficher tous les baux
              </button>
            </p>
          </div>
        ) : null}
      </AppPageTitle>

      <OdooActionBar
        left={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs font-semibold text-[var(--color-muted)]">Filtres</span>
            <span className="text-xs text-[var(--color-muted)]">Année: {yearFilter === 'all' ? 'Toutes' : yearFilter}</span>
            <span className="text-xs text-[var(--color-muted)]">Mois: {monthFilter === 'all' ? 'Tous' : monthFilter}</span>
            {overdueOnly ? <span className="text-xs font-semibold text-red-700 dark:text-red-300">Impayés</span> : null}
          </div>
        }
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="py-2 text-xs"
              onClick={() => setZoomPaymentId(null)}
              disabled={!zoomPaymentId}
            >
              Fermer panneau
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden !p-0 shadow-[0_1px_3px_rgb(0_0_0/0.06),0_8px_24px_rgb(0_0_0/0.06)] ring-1 ring-slate-900/[0.04] dark:shadow-[0_1px_3px_rgb(0_0_0/0.2)] dark:ring-slate-600/40">
        <div className="flex flex-col gap-1 border-b border-slate-200/90 bg-gradient-to-r from-slate-50/98 via-white to-slate-50/95 px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:px-3 sm:py-2 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900/98 dark:to-slate-900/95">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-600/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              <IconCalendar className="size-3.5" />
            </span>
            <p className="truncate text-[12px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
              Critères d’affichage
            </p>
          </div>
          <div className="flex items-center gap-2 sm:block">
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-sm sm:hidden dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              onClick={() => setMobileCriteriaOpen((v) => !v)}
              aria-expanded={mobileCriteriaOpen}
            >
              {mobileCriteriaOpen ? 'Masquer' : 'Afficher'}
            </button>
            <p className="min-w-0 truncate text-[10px] font-medium tabular-nums text-slate-500 dark:text-slate-400 sm:max-w-[55%] sm:text-right">
              <span className="text-slate-400 dark:text-slate-500">Vue · </span>
              {periodSummaryLabel}
              {overdueOnly ? (
                <span className="text-amber-700 dark:text-amber-400"> · impayés / retard</span>
              ) : null}
            </p>
          </div>
        </div>
        <div className={mobileCriteriaOpen ? 'block' : 'hidden sm:block'}>
        <div className="grid gap-2 p-2 sm:p-2.5 lg:grid-cols-12 lg:items-end lg:gap-3">
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              <div>
                <Label htmlFor="payments-year" className="!mb-0.5 !text-[10px] !font-semibold !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300">
                  Année comptable
                </Label>
                <Select
                  id="payments-year"
                  className="min-h-[2rem] border-slate-200 bg-white py-1.5 pl-2.5 pr-9 text-xs font-medium text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-950/80"
                  value={yearFilter === 'all' ? 'all' : String(yearFilter)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setParams((prev) => {
                      const q = new URLSearchParams(prev);
                      if (v === 'all') q.set('year', 'all');
                      else q.set('year', v);
                      return q;
                    });
                  }}
                >
                  <option value="all">Toutes les années</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="payments-month" className="!mb-0.5 !text-[10px] !font-semibold !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300">
                  Mois de facturation
                </Label>
                <Select
                  id="payments-month"
                  className="min-h-[2rem] border-slate-200 bg-white py-1.5 pl-2.5 pr-9 text-xs font-medium text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-950/80"
                  value={monthFilter === 'all' ? 'all' : String(monthFilter)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setParams((prev) => {
                      const q = new URLSearchParams(prev);
                      if (v === 'all') q.set('month', 'all');
                      else q.set('month', v);
                      return q;
                    });
                  }}
                >
                  {MOIS_SELECT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2.5 dark:border-slate-800 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            <div className="mb-1 flex items-center gap-1">
              <IconLayoutList className="size-3 text-slate-400 dark:text-slate-500" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                Statut
              </p>
            </div>
            <div
              className="flex w-full rounded-lg border border-slate-200/95 bg-slate-100/90 p-px shadow-[inset_0_1px_2px_rgb(0_0_0/0.05)] dark:border-slate-600 dark:bg-slate-800/95"
              role="group"
              aria-label="Filtrer par statut de paiement"
            >
              <button
                type="button"
                onClick={() => {
                  setParams((prev) => {
                    const q = new URLSearchParams(prev);
                    q.delete('overdue');
                    return q;
                  });
                }}
                className={`min-h-[2rem] flex-1 rounded-[0.45rem] px-2 py-1 text-center text-[10px] font-semibold leading-tight transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:flex-initial ${
                  !overdueOnly
                    ? 'bg-white text-brand-800 shadow-md ring-1 ring-slate-200/90 dark:bg-brand-600 dark:text-white dark:ring-brand-500/50'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-100'
                }`}
              >
                Tous les statuts
              </button>
              <button
                type="button"
                onClick={() => {
                  setParams((prev) => {
                    const q = new URLSearchParams(prev);
                    q.set('overdue', '1');
                    return q;
                  });
                }}
                className={`min-h-[2rem] flex-1 rounded-[0.45rem] px-2 py-1 text-center text-[10px] font-semibold leading-tight transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 sm:flex-initial ${
                  overdueOnly
                    ? 'bg-white text-amber-950 shadow-md ring-1 ring-amber-200/90 dark:bg-amber-600 dark:text-white dark:ring-amber-400/40'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-100'
                }`}
              >
                Impayés & retard
              </button>
            </div>
            <span className="sr-only">En mode impayés, la liste exclut les échéances soldées.</span>
            <div className="mt-2">
              <Label htmlFor="payments-method" className="!mb-0.5 !text-[10px] !font-semibold !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300">
                Mode d'encaissement
              </Label>
              <Select
                id="payments-method"
                className="min-h-[2rem] border-slate-200 bg-white py-1.5 pl-2.5 pr-9 text-xs font-medium text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-950/80"
                value={methodFilter}
                onChange={(e) => {
                  const v = e.target.value;
                  setParams((prev) => {
                    const q = new URLSearchParams(prev);
                    if (v === 'all') q.delete('method');
                    else q.set('method', v);
                    return q;
                  });
                }}
              >
                {methodFilterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {leaseIdFilter ? (
          <div className="border-t border-slate-200/90 px-2 py-2.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400 sm:px-3">
            <p>
              <strong className="font-semibold text-slate-800 dark:text-slate-200">Périmètre (bien, locataire, unité)</strong>{' '}
              : indisponible tant qu’un <strong>seul bail</strong> est ciblé ci-dessous. Réinitialisez le filtre bail pour utiliser
              ces critères.
            </p>
          </div>
        ) : (
          <div className="border-t border-slate-200/90 bg-slate-50/40 px-2 py-2.5 dark:border-slate-700 dark:bg-slate-900/30 sm:px-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Périmètre</p>
              <HelpHint
                className="align-middle"
                title="Affinez la liste par locataire, par immeuble ou par lot. Choisissez d’abord le bien pour activer le filtre unité. Compatible avec l’année et le mois de facturation."
              />
              {(buildingIdFilter || unitIdFilter || tenantIdFilter) && (
                <button
                  type="button"
                  onClick={clearScopeFilters}
                  className="ml-auto text-[11px] font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                >
                  Effacer périmètre
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              <div>
                <Label htmlFor="payments-tenant" className="!mb-0.5 !text-[10px] !font-semibold !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300">
                  Locataire
                </Label>
                <SearchableSelect
                  id="payments-tenant"
                  compact
                  inputClassName={paymentScopeInputClass}
                  emptyLabel="Tous les locataires"
                  placeholder="Nom du locataire…"
                  aria-label="Filtrer par locataire"
                  value={tenantIdFilter}
                  onChange={(v) => {
                    setParams((prev) => {
                      const q = new URLSearchParams(prev);
                      if (v) q.set('tenantId', v);
                      else q.delete('tenantId');
                      return q;
                    });
                  }}
                  options={tenantSearchOptions}
                />
              </div>
              <div>
                <Label htmlFor="payments-building" className="!mb-0.5 !text-[10px] !font-semibold !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300">
                  Bien
                </Label>
                <SearchableSelect
                  id="payments-building"
                  compact
                  inputClassName={paymentScopeInputClass}
                  emptyLabel="Tous les biens"
                  placeholder="Nom du bien…"
                  aria-label="Filtrer par bien"
                  value={buildingIdFilter}
                  onChange={(v) => {
                    setParams((prev) => {
                      const q = new URLSearchParams(prev);
                      if (v) q.set('buildingId', v);
                      else q.delete('buildingId');
                      q.delete('unitId');
                      return q;
                    });
                  }}
                  options={buildingSearchOptions}
                />
              </div>
              <div>
                <Label htmlFor="payments-unit" className="!mb-0.5 !text-[10px] !font-semibold !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300">
                  Unité (lot)
                </Label>
                <SearchableSelect
                  id="payments-unit"
                  compact
                  inputClassName={`${paymentScopeInputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={!buildingIdFilter}
                  emptyLabel={
                    buildingIdFilter ? 'Toutes les unités du bien' : 'Choisir un bien d’abord'
                  }
                  placeholder="Lot / unité…"
                  aria-label="Filtrer par unité"
                  value={unitIdFilter}
                  onChange={(v) => {
                    setParams((prev) => {
                      const q = new URLSearchParams(prev);
                      if (v) q.set('unitId', v);
                      else q.delete('unitId');
                      return q;
                    });
                  }}
                  options={unitSearchOptions}
                />
              </div>
            </div>
          </div>
        )}

        {leaseIdFilter ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/90 bg-slate-50/60 px-2 py-2 sm:px-3 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <span className="inline-flex w-fit max-w-full items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200/95 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-600">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand-500" />
                <span className="truncate" title={leaseFocusSummary?.tenant ?? undefined}>
                  Filtre actif ·{' '}
                  {leaseFocusSummary?.tenant
                    ? `paiements de ${leaseFocusSummary.tenant}`
                    : 'un seul bail (loyers)'}
                </span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {leaseFocusSummary?.place ? (
                  <span className="line-clamp-2 sm:line-clamp-1" title={leaseFocusSummary.place}>
                    {leaseFocusSummary.place}
                  </span>
                ) : (
                  'Les autres locations sont masquées.'
                )}
              </span>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
              onClick={clearLeaseFilter}
            >
              Réinitialiser le filtre
            </button>
          </div>
        ) : null}
        </div>
      </Card>

      {visibleRows.length > 0 && (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Synthèse (filtre actif)
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="relative !overflow-hidden !border-slate-200/90 !p-5 !pt-6 shadow-sm dark:!border-slate-600/80">
              <span className="absolute left-0 right-0 top-0 h-1 bg-slate-400/80 dark:bg-slate-500" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Échéances</p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                {stats.total}
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Lignes affichées</p>
            </Card>
            <Card className="relative !overflow-hidden !border-slate-200/90 !p-5 !pt-6 shadow-sm dark:!border-slate-600/80">
              <span className="absolute left-0 right-0 top-0 h-1 bg-amber-500" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Reste à encaisser (loyers)</p>
              <p className="mt-2 text-2xl font-bold tabular-nums leading-tight tracking-tight text-amber-950 dark:text-amber-100 sm:text-3xl">
                {fcfa(stats.aEncaisser)}
              </p>
              {stats.retards > 0 ? (
                <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{stats.retards} en retard</p>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Aucun retard dans cette vue</p>
              )}
            </Card>
            <Card className="relative !overflow-hidden !border-slate-200/90 !p-5 !pt-6 shadow-sm dark:!border-slate-600/80">
              <span className="absolute left-0 right-0 top-0 h-1 bg-emerald-500" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Encaissé (loyers)</p>
              <p className="mt-2 text-2xl font-bold tabular-nums leading-tight tracking-tight text-emerald-950 dark:text-emerald-100 sm:text-3xl">
                {fcfa(stats.encaisse)}
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {stats.payees} soldée{stats.payees !== 1 ? 's' : ''}
                {stats.partialLines > 0 ? ` · ${stats.partialLines} acompte${stats.partialLines !== 1 ? 's' : ''}` : ''}
                <span className="mt-1 block">
                  Hors caution —{' '}
                  <SmartLink to="/cautions" className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
                    cautions encaissées
                  </SmartLink>
                  .
                </span>
              </p>
            </Card>
            <Card className="relative !overflow-hidden !border-slate-200/90 !p-5 !pt-6 shadow-sm dark:!border-slate-600/80">
              <span className="absolute left-0 right-0 top-0 h-1 bg-brand-500" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Regroupement</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 sm:text-3xl">
                {monthGroups.length} mois
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Par mois de facturation</p>
            </Card>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {collectionTotals.length === 0 ? (
              <Card className="sm:col-span-2 lg:col-span-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">Aucun encaissement saisi par mode sur ce filtre.</p>
              </Card>
            ) : (
              collectionTotals.map((row) => (
                <Card key={row.key} className="!p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{row.label}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{fcfa(row.total)}</p>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      <div className="space-y-5">
        {selectedPaymentIds.length > 0 ? (
          <Card className="flex flex-wrap items-center justify-between gap-3 border-brand-200 bg-brand-50/70 py-3 dark:border-brand-500/40 dark:bg-brand-950/30">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {selectedPaymentIds.length} ligne{selectedPaymentIds.length > 1 ? 's' : ''} sélectionnée
              {selectedPaymentIds.length > 1 ? 's' : ''}
              {selectableRows.length !== selectedPaymentIds.length
                ? ` · ${selectableRows.length} payable${selectableRows.length > 1 ? 's' : ''}`
                : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="py-2 text-xs"
                disabled={bulkSubmitting || selectableRows.length === 0}
                onClick={() => void markSelectedPaid()}
              >
                {bulkSubmitting ? 'Traitement…' : 'Marquer la sélection comme payée'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="py-2 text-xs"
                disabled={bulkSubmitting}
                onClick={() => setSelectedPaymentIds([])}
              >
                Vider la sélection
              </Button>
            </div>
          </Card>
        ) : null}
        {monthGroups.length > 0 ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Détail des échéances (par mois de facturation)
          </p>
        ) : null}
        {monthGroups.length > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/90 px-4 py-3 dark:border-slate-600/80 dark:bg-slate-900/40">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="font-semibold text-slate-900 dark:text-slate-50">{monthGroups.length} mois</span>
              {' · '}
              <span className="text-slate-600 dark:text-slate-400">Les détails sont affichés ci-dessous. Vous pouvez masquer un mois pour gagner de la place.</span>
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
                onClick={() => setCollapsedMonthKeys(new Set(monthGroups.map(([k]) => k)))}
              >
                Masquer tous les détails
              </button>
              <button
                type="button"
                className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-900 shadow-sm transition hover:bg-brand-100 dark:border-brand-500/40 dark:bg-brand-950/50 dark:text-brand-100 dark:hover:bg-brand-900/40"
                onClick={() => setCollapsedMonthKeys(new Set())}
              >
                Afficher tous les détails
              </button>
            </div>
          </div>
        ) : null}
        {monthGroups.map(([key, items]) => {
          const [yStr, mStr] = key.split('-');
          const py = Number(yStr);
          const pm = Number(mStr);
          const monthDue = items.reduce((acc, p) => acc + Number(p.amountDue), 0);
          const monthPending = items.filter((p) => p.status === 'PENDING' || p.status === 'LATE');
          const monthPendingSum = monthPending.reduce((acc, p) => acc + paymentRemaining(p), 0);
          const overdueInMonth = items.filter((p) => isOverduePayment(p)).length;
          const monthCollapsed = collapsedMonthKeys.has(key);

          return (
            <Card key={key} className="!p-0 overflow-hidden shadow-md ring-1 ring-slate-900/[0.04] dark:ring-slate-600/35">
              <div
                id={`payments-month-head-${key}`}
                className="relative flex flex-col gap-3 border-b border-slate-200/90 bg-white px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5 dark:border-slate-700 dark:bg-slate-900/85"
              >
                <span
                  className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-brand-500/90 dark:bg-brand-500/80"
                  aria-hidden
                />
                <div className="min-w-0 flex-1 pl-2 sm:pl-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      {monthTitle(py, pm)}
                    </h2>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/90 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600">
                      {String(pm).padStart(2, '0')}/{py}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                    {items.length} échéance{items.length !== 1 ? 's' : ''} · {fcfa(monthDue)} au total
                    {monthPending.length > 0 && (
                      <span className="font-medium text-amber-900 dark:text-amber-300">
                        {' '}
                        · {fcfa(monthPendingSum)} encore dû{monthPending.length !== 1 ? 'es' : ''}
                      </span>
                    )}
                    {overdueInMonth > 0 && (
                      <span className="font-medium text-red-700 dark:text-red-400"> · {overdueInMonth} en retard</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-stretch sm:self-start sm:pt-0.5">
                  <button
                    type="button"
                    aria-expanded={!monthCollapsed}
                    aria-controls={`payments-month-body-${key}`}
                    onClick={() =>
                      setCollapsedMonthKeys((prev) => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-700/80"
                  >
                    {monthCollapsed ? (
                      <>
                        <svg className="size-4 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M15 12H9M12 9v6" strokeLinecap="round" />
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                        </svg>
                        Afficher le tableau
                      </>
                    ) : (
                      <>
                        <svg className="size-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M9 12h6M12 3v18" strokeLinecap="round" />
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                        </svg>
                        Masquer le tableau
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div id={`payments-month-body-${key}`} className="overflow-x-auto bg-white dark:bg-slate-950/30" hidden={monthCollapsed}>
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
                      <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-center sm:px-5">
                        <input
                          type="checkbox"
                          checked={items.every((p) => selectedPaymentIds.includes(p.id))}
                          onChange={(e) => toggleAllInMonth(items, e.target.checked)}
                          aria-label={`Sélectionner toutes les lignes de ${monthTitle(py, pm)}`}
                        />
                      </th>
                      <SortableTh
                        label="Locataire"
                        columnKey="tenant"
                        activeKey={paySortKey}
                        dir={paySortDir}
                        onSort={togglePaySort}
                        thClassName="px-4 py-2.5 sm:px-5"
                      />
                      <SortableTh
                        label="Lieu"
                        columnKey="place"
                        activeKey={paySortKey}
                        dir={paySortDir}
                        onSort={togglePaySort}
                        thClassName="px-4 py-2.5 sm:px-5"
                      />
                      <SortableTh
                        label="Montant"
                        columnKey="amount"
                        activeKey={paySortKey}
                        dir={paySortDir}
                        onSort={togglePaySort}
                        align="end"
                        thClassName="px-4 py-2.5 sm:px-5"
                      />
                      <SortableTh
                        label="Période · échéance"
                        columnKey="schedule"
                        activeKey={paySortKey}
                        dir={paySortDir}
                        onSort={togglePaySort}
                        thClassName="whitespace-nowrap px-4 py-2.5 sm:px-5"
                      />
                      <SortableTh
                        label="Statut"
                        columnKey="status"
                        activeKey={paySortKey}
                        dir={paySortDir}
                        onSort={togglePaySort}
                        thClassName="px-4 py-2.5 sm:px-5"
                      />
                      <th
                        className="w-[1%] whitespace-nowrap px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 sm:px-3 dark:text-slate-400"
                        aria-label="Détail"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p, rowIndex) => (
                      <tr
                        key={p.id}
                        id={`payment-${p.id}`}
                        title="Double-clic pour ouvrir le détail"
                        onDoubleClick={(e) => onListRowDoubleClick(e, () => setZoomPaymentId(p.id))}
                        className={`scroll-mt-28 ${listTableDataRowClass(rowIndex)} ${listTableRowOpenableClass} ${paymentRowFlash(flashPaymentRowId === p.id)} ${
                          zoomPaymentId === p.id
                            ? 'bg-brand-50/95 ring-1 ring-inset ring-brand-500/25 dark:bg-brand-950/40 dark:ring-brand-500/30'
                            : ''
                        }`}
                      >
                        <td className={`text-center ${listTableCellClass}`} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedPaymentIds.includes(p.id)}
                            onChange={() => togglePaymentSelection(p.id)}
                            aria-label={`Sélectionner le paiement de ${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`}
                          />
                        </td>
                        <td className={`${listTableFirstCellClass} font-medium text-slate-900 dark:text-slate-100`}>
                          {p.lease.tenant.id ? (
                            <SmartLink
                              to={`/locataires?edit=${encodeURIComponent(p.lease.tenant.id)}`}
                              returnFocusId={p.id}
                              onClick={(e) => e.stopPropagation()}
                              className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
                            >
                              {p.lease.tenant.firstName} {p.lease.tenant.lastName}
                            </SmartLink>
                          ) : (
                            <span>
                              {p.lease.tenant.firstName} {p.lease.tenant.lastName}
                            </span>
                          )}
                        </td>
                        <td
                          className={`max-w-[14rem] truncate ${listTableCellClass} text-slate-800 dark:text-slate-200`}
                          title={`${p.lease.unit.building.name} — ${unitKindLabel(p.lease.unit.kind)} ${p.lease.unit.label} · ${p.lease.unit.building.commune}`}
                        >
                          <span className="font-medium text-slate-900 dark:text-slate-100">{p.lease.unit.building.name}</span>
                          <span className="text-slate-400 dark:text-slate-500"> · </span>
                          <span className="text-xs text-slate-700 dark:text-slate-300">{p.lease.unit.label}</span>
                        </td>
                        <td className={`whitespace-nowrap text-right tabular-nums text-slate-800 dark:text-slate-200 ${listTableCellClass}`}>
                          <span className="font-semibold">{fcfa(Number(p.amountDue))}</span>
                          {(p.status === 'PENDING' || p.status === 'LATE') && Number(p.amountPaid ?? 0) > 0 ? (
                            <span className="mt-0.5 block text-[11px] font-medium tabular-nums text-emerald-800 dark:text-emerald-300">
                              Reste {fcfa(paymentRemaining(p))}
                            </span>
                          ) : null}
                        </td>
                        <td className={`whitespace-nowrap tabular-nums text-slate-700 dark:text-slate-300 ${listTableCellClass}`}>
                          <p className="text-xs font-semibold">
                            {String(p.periodMonth).padStart(2, '0')}/{p.periodYear}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{formatDateFr(p.dueDate)}</p>
                        </td>
                        <td className={listTableCellClass}>
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyle(p.status)}`}
                            >
                              {statusLabel(p.status)}
                            </span>
                            {(() => {
                              const b = collectionCollectBadge(p.collectionTask);
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
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>

      <PaymentZoomModal
        paymentId={zoomPaymentId}
        onClose={() => setZoomPaymentId(null)}
        onUpdated={() => {
          const id = zoomPaymentId;
          const y = window.scrollY;
          if (id) scheduleScrollRestoreBeforeLoad(id, y);
          load();
        }}
      />

      {visibleRows.length === 0 && (
        <Card className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Aucune échéance pour ce filtre. Essayez une autre année, un autre mois, ou « Toutes les années » / « Tous les
          mois ».
        </Card>
      )}

      {partialFor ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="partial-pay-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !partialSubmitting) setPartialFor(null);
          }}
        >
          <Card className="w-full max-w-md !p-5 shadow-2xl">
            <h2 id="partial-pay-title" className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Versement partiel
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {partialFor.lease.tenant.firstName} {partialFor.lease.tenant.lastName} —{' '}
              {String(partialFor.periodMonth).padStart(2, '0')}/{partialFor.periodYear}
              <span className="mt-1 block">
                Reste à payer :{' '}
                <strong className="tabular-nums text-slate-800 dark:text-slate-200">
                  {fcfa(paymentRemaining(partialFor))}
                </strong>
              </span>
            </p>
            <div className="mt-4">
              <Label htmlFor="partial-amount">Montant du versement</Label>
              <AmountFcfaInput
                id="partial-amount"
                autoFocus
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                min={1}
                max={Math.max(1, Math.ceil(paymentRemaining(partialFor)))}
                step={1}
              />
            </div>
            {partialErr ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{partialErr}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="py-2 text-xs"
                disabled={partialSubmitting}
                onClick={() => setPartialFor(null)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className="py-2 text-xs"
                disabled={partialSubmitting}
                onClick={() => void submitPartial()}
              >
                {partialSubmitting ? 'Enregistrement…' : 'Enregistrer le versement'}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
