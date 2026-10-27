import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import type { PaymentRow } from '@/lib/paymentRow';
import { toggleTableSortColumn } from '@/lib/tableSort';
import type { TableSortDir } from '@/lib/tableSort';
import type { BuildingOpt, TenantOpt, YearlyLeaseSortKey } from './types';
import { buildLeaseRows, compareYearlyLeaseRows, normalizeBuildings, normalizeTenants } from './yearlyRentUtils';

/** Filtres URL (scope / année / locataire|bien), listes, échéances et tri. */
export function useYearlyRentActivity() {
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

  return {
    scope,
    setScope,
    tenantId,
    setTenantId,
    buildingId,
    setBuildingId,
    year,
    setYear,
    yearOptions,
    tenantOptions,
    buildingOptions,
    listsErr,
    err,
    loading,
    selectionOk,
    sortedLeaseRows,
    yearlyLeaseSortKey,
    yearlyLeaseSortDir,
    toggleYearlyLeaseSort,
    paymentsListHref,
    printContextLine,
    printDateLabel,
  };
}
