/** Ordre du sélecteur : du plus « fiscal » au plus opérationnel. */
export const CHARGE_CATEGORY_ORDER = [
  'TAX',
  'FEES',
  'INSURANCE',
  'MAINTENANCE',
  'UTILITIES',
  'SECURITY',
  'PAYROLL',
  'OTHER',
] as const;

export type ChargeCategoryCode = (typeof CHARGE_CATEGORY_ORDER)[number];

const LABELS: Record<ChargeCategoryCode, string> = {
  TAX: 'Impôts & taxes',
  FEES: 'Copropriété & honoraires',
  INSURANCE: 'Assurances',
  MAINTENANCE: 'Entretien & travaux',
  UTILITIES: 'Eau, énergie, réseaux',
  SECURITY: 'Sécurité & gardiennage',
  PAYROLL: 'Salaires & personnel (concierge, entretien…)',
  OTHER: 'Autre dépense',
};

export function chargeCategoryLabel(code: string): string {
  return LABELS[code as ChargeCategoryCode] ?? code;
}

export function chargeCategoryOptions(): { value: ChargeCategoryCode; label: string }[] {
  return CHARGE_CATEGORY_ORDER.map((value) => ({ value, label: LABELS[value] }));
}
