import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useReturnRowFocus } from '@/hooks/useReturnRowFocus';
import { api } from '@/lib/api';
import { collectionMethodLabel } from '@/lib/collectionMethodUi';
import { isOverduePayment, monthGroupKey, paymentRemaining } from '@/lib/paymentRow';
import type { PaymentRow } from '@/lib/paymentRow';
import { toggleTableSortColumn } from '@/lib/tableSort';
import type { TableSortDir } from '@/lib/tableSort';
import { comparePaymentRows } from './types';
import type { CollectionTotal, LeaseFocusSummary, MonthGroup, PaymentSortKey, PaymentStats } from './types';
import { usePaymentScrollRestore } from './usePaymentScrollRestore';
import type { PaymentsFilters } from './usePaymentsFilters';

/** Chargement des échéances + dérivés (stats, groupes par mois, tri, repli des mois). */
export function usePaymentsList(f: PaymentsFilters) {
  const {
    overdueOnly,
    leaseIdFilter,
    buildingIdFilter,
    unitIdFilter,
    tenantIdFilter,
    yearFilter,
    monthFilter,
    methodFilter,
    focusPaymentId,
    hintTenant,
    hintPlace,
  } = f;

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [paymentsReady, setPaymentsReady] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);
  const [collapsedMonthKeys, setCollapsedMonthKeys] = useState(() => new Set<string>());
  const [paySortKey, setPaySortKey] = useState<PaymentSortKey>('tenant');
  const [paySortDir, setPaySortDir] = useState<TableSortDir>('asc');

  function togglePaySort(key: PaymentSortKey) {
    const n = toggleTableSortColumn(paySortKey, paySortDir, key);
    setPaySortKey(n.key);
    setPaySortDir(n.dir);
  }

  const load = useCallback(() => {
    /* Ne pas passer paymentsReady à false : ça déclenche des effets et peut faire « sauter » le scroll. */
    setListErr(null);
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
      .then((data) => {
        setRows(data);
        setListErr(null);
      })
      .catch((e) => {
        setRows([]);
        setListErr(e instanceof Error ? e.message : 'Impossible de charger les échéances.');
      })
      .finally(() => setPaymentsReady(true));
  }, [buildingIdFilter, leaseIdFilter, monthFilter, overdueOnly, tenantIdFilter, unitIdFilter, yearFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const scheduleScrollRestoreBeforeLoad = usePaymentScrollRestore({ rows, paymentsReady, setCollapsedMonthKeys });

  const flashPaymentRowId = useReturnRowFocus({ rowIdPrefix: 'payment-', ready: paymentsReady });

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

  const stats = useMemo<PaymentStats>(() => {
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

  const collectionTotals = useMemo<CollectionTotal[]>(() => {
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

  const monthGroups = useMemo<MonthGroup[]>(() => {
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

  const leaseFocusSummary = useMemo<LeaseFocusSummary | null>(() => {
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

  function toggleMonth(key: string) {
    setCollapsedMonthKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return {
    rows,
    paymentsReady,
    listErr,
    visibleRows,
    stats,
    collectionTotals,
    monthGroups,
    leaseFocusSummary,
    flashPaymentRowId,
    collapsedMonthKeys,
    collapseAllMonths: () => setCollapsedMonthKeys(new Set(monthGroups.map(([k]) => k))),
    expandAllMonths: () => setCollapsedMonthKeys(new Set()),
    toggleMonth,
    sort: { key: paySortKey, dir: paySortDir, onSort: togglePaySort },
    load,
    scheduleScrollRestoreBeforeLoad,
  };
}
