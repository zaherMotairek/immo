/**
 * Tri « naturel » : Unité 1, 2, 10… (pas 1, 10, 100, 11).
 */
export function naturalCompare(a: string, b: string): number {
  return String(a ?? '').localeCompare(String(b ?? ''), 'fr', { numeric: true, sensitivity: 'base' });
}

export function sortByNaturalLabel<T extends { label: string }>(items: readonly T[]): T[] {
  return [...items].sort((x, y) => naturalCompare(x.label, y.label));
}
