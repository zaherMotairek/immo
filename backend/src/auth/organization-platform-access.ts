import { ForbiddenException } from '@nestjs/common';

type OrgAccessRow = {
  platformAccessSuspended: boolean;
  platformAccessPaidUntil: Date | null;
};

function toYmdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Accès plateforme autorisé jusqu’à cette date (inclusive), si renseignée. */
export function isOrganizationPlatformAccessBlocked(org: OrgAccessRow | null | undefined): boolean {
  if (!org) return true;
  if (org.platformAccessSuspended) return true;
  if (org.platformAccessPaidUntil == null) return false;
  const paidThrough = toYmdUtc(org.platformAccessPaidUntil);
  const today = toYmdUtc(new Date());
  return today > paidThrough;
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
    throw new ForbiddenException(
      `Accès réservé : la licence était valable jusqu’au ${label} inclus. Réglez votre facturation pour réactiver l’accès.`,
    );
  }
}
