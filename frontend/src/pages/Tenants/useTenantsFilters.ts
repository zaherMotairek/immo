import { useMemo, useState } from 'react';
import type { OdooViewMode } from '@/components/OdooKit';
import { toggleTableSortColumn } from '@/lib/tableSort';
import type { TableSortDir } from '@/lib/tableSort';
import type { Tenant, TenantSortKey } from './types';
import { compareTenantRows, filterTenantsBySearch, groupTenantsByLease } from './tenantUtils';

/** Recherche, mode d'affichage (liste / kanban), tri et regroupement kanban. */
export function useTenantsFilters(rows: Tenant[]) {
  const [listSearch, setListSearch] = useState('');
  const [viewMode, setViewMode] = useState<OdooViewMode>('list');
  const [tenantSortKey, setTenantSortKey] = useState<TenantSortKey>('tenant');
  const [tenantSortDir, setTenantSortDir] = useState<TableSortDir>('asc');

  const filteredRows = useMemo(() => filterTenantsBySearch(rows, listSearch), [rows, listSearch]);

  function toggleTenantSort(key: TenantSortKey) {
    const n = toggleTableSortColumn(tenantSortKey, tenantSortDir, key);
    setTenantSortKey(n.key);
    setTenantSortDir(n.dir);
  }

  const sortedFilteredRows = useMemo(() => {
    const copy = [...filteredRows];
    copy.sort((a, b) => compareTenantRows(a, b, tenantSortKey, tenantSortDir));
    return copy;
  }, [filteredRows, tenantSortKey, tenantSortDir]);

  const kanbanTenants = useMemo(() => groupTenantsByLease(filteredRows), [filteredRows]);

  return {
    listSearch,
    setListSearch,
    viewMode,
    setViewMode,
    filteredRows,
    sortedFilteredRows,
    kanbanTenants,
    sort: { key: tenantSortKey, dir: tenantSortDir, onSort: toggleTenantSort },
  };
}

export type TenantsFilters = ReturnType<typeof useTenantsFilters>;
