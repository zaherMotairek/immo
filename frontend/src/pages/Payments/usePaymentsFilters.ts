import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { collectionMethodLabel, COLLECTION_METHOD_OPTIONS } from '@/lib/collectionMethodUi';
import { unitKindLabel } from '@/lib/unitKind';
import { MOIS_SELECT_OPTIONS } from './types';
import type { BuildingOpt, TenantOpt, UpdateParams } from './types';

/** Filtres de la page Paiements : lecture/écriture de l'URL + listes de référence (biens, locataires). */
export function usePaymentsFilters() {
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
  const focusPaymentId = params.get('focus');

  const updateParams: UpdateParams = useCallback(
    (mutate, replace = false) => {
      setParams(
        (prev) => {
          const q = new URLSearchParams(prev);
          mutate(q);
          return q;
        },
        replace ? { replace: true } : undefined,
      );
    },
    [setParams],
  );

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

  const [buildings, setBuildings] = useState<BuildingOpt[]>([]);
  const [tenants, setTenants] = useState<TenantOpt[]>([]);

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
      updateParams((q) => q.delete('unitId'), true);
    }
  }, [buildingIdFilter, buildings, leaseIdFilter, unitIdFilter, updateParams]);

  /** Lien direct avec unitId seul : on complète buildingId pour afficher les listes cohérentes. */
  useEffect(() => {
    if (leaseIdFilter || buildingIdFilter || !unitIdFilter || buildings.length === 0) return;
    for (const b of buildings) {
      if (b.units.some((u) => u.id === unitIdFilter)) {
        updateParams((q) => q.set('buildingId', b.id), true);
        return;
      }
    }
  }, [buildingIdFilter, buildings, leaseIdFilter, unitIdFilter, updateParams]);

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
    const scope = scopeSummaryParts.length > 0 ? ` · ${scopeSummaryParts.join(' · ')}` : '';
    const methodPart = methodFilter === 'all' ? '' : ` · ${collectionMethodLabel(methodFilter)}`;
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

  function clearLeaseFilter() {
    updateParams((q) => {
      q.delete('leaseId');
      q.delete('hintTenant');
      q.delete('hintPlace');
    }, true);
  }

  function clearScopeFilters() {
    updateParams((q) => {
      q.delete('buildingId');
      q.delete('unitId');
      q.delete('tenantId');
    }, true);
  }

  return {
    updateParams,
    overdueOnly,
    leaseIdFilter,
    hintTenant,
    hintPlace,
    buildingIdFilter,
    unitIdFilter,
    tenantIdFilter,
    focusPaymentId,
    methodFilter,
    methodFilterOptions,
    yearFilter,
    monthFilter,
    worksheetPdfPath,
    yearOptions,
    periodSummaryLabel,
    tenantSearchOptions,
    buildingSearchOptions,
    unitSearchOptions,
    clearLeaseFilter,
    clearScopeFilters,
  };
}

export type PaymentsFilters = ReturnType<typeof usePaymentsFilters>;
