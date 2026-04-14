export const UNIT_KIND_LABELS: Record<
  'APARTMENT' | 'HOUSE' | 'LAND' | 'OFFICE' | 'WAREHOUSE' | 'COMMERCIAL' | 'GARAGE' | 'OTHER',
  string
> = {
  APARTMENT: 'Appartement',
  HOUSE: 'Maison',
  LAND: 'Terrain',
  OFFICE: 'Bureau',
  WAREHOUSE: 'Entrepôt',
  COMMERCIAL: 'Commerce / magasin',
  GARAGE: 'Garage / parking',
  OTHER: 'Autre',
};

export type UnitKindCode = keyof typeof UNIT_KIND_LABELS;

export const UNIT_KIND_OPTIONS = Object.entries(UNIT_KIND_LABELS).map(([value, label]) => ({
  value: value as UnitKindCode,
  label,
}));

export const IMMEUBLE_NEW_UNIT_KIND_OPTIONS = (['APARTMENT', 'WAREHOUSE', 'COMMERCIAL'] as const).map(
  (value) => ({ value, label: UNIT_KIND_LABELS[value] }),
);

/** Rez-de-chaussée (étage 0) : réservé aux entrepôts et commerces. */
export const IMMEUBLE_RDC_UNIT_KIND_OPTIONS = (['WAREHOUSE', 'COMMERCIAL'] as const).map((value) => ({
  value,
  label: UNIT_KIND_LABELS[value],
}));

export function isImmeubleCarnetFlowKind(k: string): boolean {
  return k === 'APARTMENT' || k === 'WAREHOUSE' || k === 'COMMERCIAL';
}

export function unitKindLabel(kind: string | undefined | null) {
  if (!kind) return '—';
  if (kind in UNIT_KIND_LABELS) return UNIT_KIND_LABELS[kind as UnitKindCode];
  return kind;
}
