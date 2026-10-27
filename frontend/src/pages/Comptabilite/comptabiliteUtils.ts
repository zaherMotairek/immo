export function monthFr(m: number): string {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2026, m - 1, 1));
}

export function downloadCsv(name: string, rows: string[][]) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const content = rows.map((r) => r.map(escape).join(';')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
