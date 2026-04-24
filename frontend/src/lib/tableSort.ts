export type TableSortDir = 'asc' | 'desc';

/** Clic sur une nouvelle colonne → asc ; même colonne → inversion. */
export function toggleTableSortColumn<K extends string>(
  activeKey: K,
  activeDir: TableSortDir,
  nextKey: K,
): { key: K; dir: TableSortDir } {
  if (activeKey === nextKey) {
    return { key: nextKey, dir: activeDir === 'asc' ? 'desc' : 'asc' };
  }
  return { key: nextKey, dir: 'asc' };
}
