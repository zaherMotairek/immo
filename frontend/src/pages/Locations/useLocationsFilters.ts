import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { unitKindLabel } from '@/lib/unitKind';
import { toggleTableSortColumn } from '@/lib/tableSort';
import type { TableSortDir } from '@/lib/tableSort';
import { compareLocationRows } from './locationUtils';
import type { LocationSortKey, OverviewRow } from './types';

/** Recherche (scroll conservé) + tri colonnes de la liste locations. */
export function useLocationsFilters(rows: OverviewRow[]) {
  const [listSearch, setListSearch] = useState('');
  const [tableSortKey, setTableSortKey] = useState<LocationSortKey>('tenant');
  const [tableSortDir, setTableSortDir] = useState<TableSortDir>('asc');
  /** Mémorise le scroll fenêtre avant un changement de recherche pour éviter que le tableau « saute » quand la liste se réduit. */
  const searchScrollYRef = useRef<number | null>(null);

  const setListSearchPreserveScroll = useCallback((next: string) => {
    searchScrollYRef.current = window.scrollY;
    setListSearch(next);
  }, []);

  const filteredRows = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay =
        `${r.tenantFullName} ${r.buildingName} ${r.unitLabel} ${r.localizationLine} ${unitKindLabel(r.unitKind)} ${r.currentMonthStatusFr}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, listSearch]);

  const sortedTableRows = useMemo(() => {
    const arr = [...filteredRows];
    arr.sort((a, b) => compareLocationRows(a, b, tableSortKey, tableSortDir));
    return arr;
  }, [filteredRows, tableSortKey, tableSortDir]);

  function toggleTableSort(key: LocationSortKey) {
    const n = toggleTableSortColumn(tableSortKey, tableSortDir, key);
    setTableSortKey(n.key);
    setTableSortDir(n.dir);
  }

  useLayoutEffect(() => {
    const y = searchScrollYRef.current;
    if (y === null) return;
    searchScrollYRef.current = null;
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(y, max));
  }, [listSearch, filteredRows]);

  return {
    listSearch,
    setListSearchPreserveScroll,
    filteredRows,
    sortedTableRows,
    tableSortKey,
    tableSortDir,
    toggleTableSort,
  };
}
