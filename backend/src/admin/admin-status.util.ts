import type { OrgSubscriptionStatus } from '../entitlements/entitlements.types';

export const STATUS_LABEL_FR: Record<OrgSubscriptionStatus, string> = {
  ACTIVE: 'Actif',
  EXPIRING_SOON: 'Bientôt expiré',
  EXPIRED: 'Expiré',
  TRIAL: 'Essai',
  SUSPENDED: 'Suspendu',
  FREE: 'Gratuit',
};

export function ymd(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export function parseOptionalDate(raw: string | null | undefined): Date | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  return new Date(`${raw.slice(0, 10)}T12:00:00.000Z`);
}
