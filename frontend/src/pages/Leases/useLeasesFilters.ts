import { useMemo, useState } from 'react';
import { toggleTableSortColumn } from '@/lib/tableSort';
import type { TableSortDir } from '@/lib/tableSort';
import { UNIT_KIND_OPTIONS, unitKindLabel } from '@/lib/unitKind';
import { compareLeaseRows } from './leaseUtils';
import type { LeaseRow, LeaseSortKey, StatusTab, WellViewFilter } from './types';

/** Filtres (statut, nature du local, recherche), année des échéances, tri et listes dérivées. */
export function useLeasesFilters(leases: LeaseRow[]) {
  const [genYear, setGenYear] = useState(String(new Date().getFullYear()));
  const [statusTab, setStatusTab] = useState<StatusTab>('active');
  const [wellViewFilter, setWellViewFilter] = useState<WellViewFilter>('all');
  const [leasesFiltersOpen, setLeasesFiltersOpen] = useState(false);
  const [leaseSortKey, setLeaseSortKey] = useState<LeaseSortKey>('tenant');
  const [leaseSortDir, setLeaseSortDir] = useState<TableSortDir>('asc');
  const [leaseListSearch, setLeaseListSearch] = useState('');

  function toggleLeaseSort(key: LeaseSortKey) {
    const n = toggleTableSortColumn(leaseSortKey, leaseSortDir, key);
    setLeaseSortKey(n.key);
    setLeaseSortDir(n.dir);
  }

  const leasesByStatus = useMemo(() => {
    if (statusTab === 'active') return leases.filter((l) => l.active);
    if (statusTab === 'inactive') return leases.filter((l) => !l.active);
    return leases;
  }, [leases, statusTab]);

  const wellViewCounts = useMemo(() => {
    const counts: Record<string, number> = { all: leasesByStatus.length };
    for (const { value } of UNIT_KIND_OPTIONS) {
      counts[value] = leasesByStatus.filter((l) => l.unit.kind === value).length;
    }
    return counts;
  }, [leasesByStatus]);

  const filteredLeases = useMemo(() => {
    if (wellViewFilter === 'all') return leasesByStatus;
    return leasesByStatus.filter((l) => l.unit.kind === wellViewFilter);
  }, [leasesByStatus, wellViewFilter]);

  /** Filtre textuel (locataire, bien, ville, unité). */
  const leasesForTable = useMemo(() => {
    const q = leaseListSearch.trim().toLowerCase();
    if (!q) return filteredLeases;
    return filteredLeases.filter((l) => {
      const tenant = `${l.tenant.firstName} ${l.tenant.lastName}`.toLowerCase();
      const b = l.unit.building;
      const place = `${b.name} ${b.commune ?? ''} ${b.city}`.toLowerCase();
      const unit = `${l.unit.label} ${unitKindLabel(l.unit.kind)}`.toLowerCase();
      return `${tenant} ${place} ${unit}`.includes(q);
    });
  }, [filteredLeases, leaseListSearch]);

  const filterSummaryShort = useMemo(() => {
    const statusFr = statusTab === 'active' ? 'Actifs' : statusTab === 'inactive' ? 'Inactifs' : 'Tous';
    const wellFr = wellViewFilter === 'all' ? 'Tous types' : unitKindLabel(wellViewFilter);
    return `${statusFr} · ${wellFr} · échéances ${genYear}`;
  }, [statusTab, wellViewFilter, genYear]);

  /** Baux visibles, triés selon la colonne choisie. */
  const tableLeases = useMemo(() => {
    return [...leasesForTable].sort((a, b) => compareLeaseRows(a, b, leaseSortKey, leaseSortDir));
  }, [leasesForTable, leaseSortKey, leaseSortDir]);

  return {
    genYear,
    setGenYear,
    statusTab,
    setStatusTab,
    wellViewFilter,
    setWellViewFilter,
    leasesFiltersOpen,
    setLeasesFiltersOpen,
    leaseSortKey,
    leaseSortDir,
    toggleLeaseSort,
    leaseListSearch,
    setLeaseListSearch,
    wellViewCounts,
    filteredLeases,
    leasesForTable,
    filterSummaryShort,
    tableLeases,
  };
}

export type LeasesFilters = ReturnType<typeof useLeasesFilters>;
