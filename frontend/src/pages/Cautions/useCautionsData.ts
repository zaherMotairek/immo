import { useEffect, useMemo, useState } from 'react';
import { useReturnRowFocus } from '@/hooks/useReturnRowFocus';
import { api } from '@/lib/api';
import { toggleTableSortColumn } from '@/lib/tableSort';
import type { TableSortDir } from '@/lib/tableSort';
import { compareCautionRows } from './cautionUtils';
import type { CautionSortKey, DepositRow } from './types';

/** Liste des cautions encaissées + tri colonne. */
export function useCautionsData() {
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [listFetched, setListFetched] = useState(false);
  const [cautionSortKey, setCautionSortKey] = useState<CautionSortKey>('date');
  const [cautionSortDir, setCautionSortDir] = useState<TableSortDir>('desc');

  function toggleCautionSort(key: CautionSortKey) {
    const n = toggleTableSortColumn(cautionSortKey, cautionSortDir, key);
    setCautionSortKey(n.key);
    setCautionSortDir(n.dir);
  }

  useEffect(() => {
    setListFetched(false);
    api<DepositRow[]>('/leases/deposits-collected')
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setListFetched(true));
  }, []);

  const flashLeaseId = useReturnRowFocus({ rowIdPrefix: 'caution-row-', ready: listFetched });

  const totals = useMemo(() => {
    const sum = rows.reduce((s, r) => s + r.depositAmount, 0);
    return { count: rows.length, sum };
  }, [rows]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => compareCautionRows(a, b, cautionSortKey, cautionSortDir));
    return copy;
  }, [rows, cautionSortKey, cautionSortDir]);

  return {
    rows,
    sortedRows,
    totals,
    flashLeaseId,
    cautionSortKey,
    cautionSortDir,
    toggleCautionSort,
  };
}
