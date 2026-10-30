import { PrismaService } from '../prisma/prisma.service';

/** Empêche e-mail / WhatsApp réels pour les orgs démo (D4). */
export async function isDemoOrganization(
  prisma: PrismaService,
  organizationId: string,
): Promise<boolean> {
  const row = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { isDemo: true },
  });
  return Boolean(row?.isDemo);
}
