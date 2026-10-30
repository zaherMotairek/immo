import { ForbiddenException } from '@nestjs/common';
import { billingGraceDays } from '../billing/billing.config';

type OrgAccessRow = {
  platformAccessSuspended: boolean;
  platformAccessPaidUntil: Date | null;
};

function toYmdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Accès bloqué après date + délai de grâce (D6, défaut 3 jours). */
export function isOrganizationPlatformAccessBlocked(org: OrgAccessRow | null | undefined): boolean {
  if (!org) return true;
  if (org.platformAccessSuspended) return true;
  if (org.platformAccessPaidUntil == null) return false;
  const paidThrough = toYmdUtc(org.platformAccessPaidUntil);
  const grace = billingGraceDays();
  const limit = new Date(`${paidThrough}T12:00:00.000Z`);
  limit.setUTCDate(limit.getUTCDate() + grace);
  const today = toYmdUtc(new Date());
  return today > toYmdUtc(limit);
}

export function assertOrganizationPlatformAccess(
  role: 'USER' | 'PLATFORM_ADMIN',
  org: OrgAccessRow | null | undefined,
): void {
  if (role === 'PLATFORM_ADMIN') return;
  if (!org) {
    throw new ForbiddenException('Organisation introuvable.');
  }
  if (org.platformAccessSuspended) {
    throw new ForbiddenException(
      'Accès suspendu : votre abonnement ou paiement plateforme est en attente. Contactez votre administrateur.',
    );
  }
  if (org.platformAccessPaidUntil == null) {
    return;
  }
  if (isOrganizationPlatformAccessBlocked(org)) {
    const until = org.platformAccessPaidUntil.toISOString().slice(0, 10);
    const d = new Date(`${until}T12:00:00`);
    const label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const grace = billingGraceDays();
    throw new ForbiddenException(
      grace > 0
        ? `Accès réservé : la licence était valable jusqu’au ${label} inclus (+ ${grace} j de grâce). Réglez votre facturation pour réactiver l’accès.`
        : `Accès réservé : la licence était valable jusqu’au ${label} inclus. Réglez votre facturation pour réactiver l’accès.`,
    );
  }
}
