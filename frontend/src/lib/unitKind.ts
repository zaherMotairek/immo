/** Libellés FR pour les types d’unité (alignés sur l’enum Prisma `UnitKind`). */
export const UNIT_KIND_LABELS: Record<string, string> = {
  APARTMENT: 'Appartement',
  HOUSE: 'Maison',
  LAND: 'Terrain',
  OFFICE: 'Bureau',
  WAREHOUSE: 'Entrepôt',
  COMMERCIAL: 'Local commercial',
  GARAGE: 'Garage / parking',
  OTHER: 'Autre',
};

export const UNIT_KIND_OPTIONS = Object.entries(UNIT_KIND_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function unitKindLabel(kind: string | undefined | null) {
  if (!kind) return '—';
  return UNIT_KIND_LABELS[kind] ?? kind;
}
