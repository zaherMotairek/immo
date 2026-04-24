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

/** Sans rez-de-chaussée dans la structure : pas d’entrepôt / commerce (réservés au RDC). */
export function immeubleImmeubleUnitKindOptions(hasRezDeChaussee: boolean | null | undefined) {
  if (hasRezDeChaussee === false) {
    return [{ value: 'APARTMENT' as const, label: UNIT_KIND_LABELS.APARTMENT }];
  }
  return IMMEUBLE_NEW_UNIT_KIND_OPTIONS;
}

/** Rez-de-chaussée (étage 0) : par défaut entrepôts et commerces seuls. */
export const IMMEUBLE_RDC_UNIT_KIND_OPTIONS = (['WAREHOUSE', 'COMMERCIAL'] as const).map((value) => ({
  value,
  label: UNIT_KIND_LABELS[value],
}));

/** Options pour l’étage 0 : appartements autorisés si rezApartmentCount > 0 sur le bien. */
export function immeubleRdcUnitKindOptions(rezApartmentCount: number | null | undefined) {
  const n = rezApartmentCount ?? 0;
  if (n <= 0) return IMMEUBLE_RDC_UNIT_KIND_OPTIONS;
  return [
    { value: 'APARTMENT' as const, label: UNIT_KIND_LABELS.APARTMENT },
    ...IMMEUBLE_RDC_UNIT_KIND_OPTIONS,
  ];
}

/** Immeuble : types pour lesquels on choisit étage + numéro (logement ou local pro). */
export function isImmeubleSlotFlowKind(k: string): boolean {
  return k === 'APARTMENT' || k === 'WAREHOUSE' || k === 'COMMERCIAL';
}

export function unitKindLabel(kind: string | undefined | null) {
  if (!kind) return '—';
  if (kind in UNIT_KIND_LABELS) return UNIT_KIND_LABELS[kind as UnitKindCode];
  return kind;
}
