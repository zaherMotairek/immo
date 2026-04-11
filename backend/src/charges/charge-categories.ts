/**
 * Valeurs alignées sur `schema.prisma` → enum `ChargeCategory`.
 * Utilisée pour valider les requêtes HTTP sans dépendre d’un `@prisma/client`
 * pas encore régénéré (ex. `prisma generate` bloqué sous Windows).
 */
export const CHARGE_CATEGORY_VALUES = [
  'TAX',
  'FEES',
  'INSURANCE',
  'MAINTENANCE',
  'UTILITIES',
  'SECURITY',
  'PAYROLL',
  'OTHER',
] as const;

export type ChargeCategoryValue = (typeof CHARGE_CATEGORY_VALUES)[number];
