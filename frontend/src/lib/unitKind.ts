/** Libellés FR pour les types d’unité (alignés sur l’enum Prisma `UnitKind`). */
export const UNIT_KIND_LABELS: Record<
  'APARTMENT' | 'HOUSE' | 'LAND' | 'OFFICE' | 'WAREHOUSE' | 'COMMERCIAL' | 'GARAGE' | 'OTHER',
  string
> = {
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
  value: value as keyof typeof UNIT_KIND_LABELS,
  label,
}));

export type UnitKindCode = keyof typeof UNIT_KIND_LABELS;

export function unitKindLabel(kind: string | undefined | null) {
  if (!kind) return '—';
  if (kind in UNIT_KIND_LABELS) return UNIT_KIND_LABELS[kind as UnitKindCode];
  return kind;
}
