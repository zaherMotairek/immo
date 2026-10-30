import { randomUUID } from 'crypto';
import {
  BuildingStructureKind,
  PaymentStatus,
  PrismaClient,
  UnitKind,
} from '@prisma/client';
import { rentDueDateForBilledPeriod } from '../../src/common/date.util';

export type OrgFixture = {
  organizationId: string;
  buildingId: string;
  unitId: string;
  tenantId: string;
  leaseId: string;
  paymentIds: string[];
};

/** Crée une org isolée + bien + unité + locataire + bail + N échéances PENDING. */
export async function seedOrgFixture(
  prisma: PrismaClient,
  opts?: { monthlyRent?: number; year?: number; months?: number[]; rentDueDay?: number; label?: string },
): Promise<OrgFixture> {
  const tag = opts?.label ?? randomUUID().slice(0, 8);
  const monthlyRent = opts?.monthlyRent ?? 150_000;
  const year = opts?.year ?? new Date().getUTCFullYear();
  const months = opts?.months ?? [1, 2, 3];
  const rentDueDay = opts?.rentDueDay ?? 5;

  const organizationId = randomUUID();
  const buildingId = randomUUID();
  const unitId = randomUUID();
  const tenantId = randomUUID();
  const leaseId = randomUUID();

  await prisma.organization.create({
    data: { id: organizationId, name: `Test org ${tag}` },
  });
  await prisma.building.create({
    data: {
      id: buildingId,
      organizationId,
      name: `Immeuble ${tag}`,
      city: 'Abidjan',
      commune: 'Cocody',
      structureKind: BuildingStructureKind.MONO_LOT,
      floorCount: 2,
      apartmentCount: 4,
    },
  });
  await prisma.unit.create({
    data: {
      id: unitId,
      buildingId,
      label: `Appart ${tag}`,
      kind: UnitKind.APARTMENT,
      floor: 1,
      apartmentSlot: 1,
    },
  });
  await prisma.tenant.create({
    data: {
      id: tenantId,
      organizationId,
      firstName: 'Amadou',
      lastName: `Koné-${tag}`,
      phone: '+2250700000000',
    },
  });
  const start = new Date(Date.UTC(year, 0, 1));
  await prisma.lease.create({
    data: {
      id: leaseId,
      unitId,
      tenantId,
      startDate: start,
      endDate: new Date(Date.UTC(year, 11, 31)),
      monthlyRent,
      rentDueDay,
      depositAmount: monthlyRent * 2,
      active: true,
    },
  });

  const paymentIds: string[] = [];
  for (const mo of months) {
    const id = randomUUID();
    await prisma.payment.create({
      data: {
        id,
        leaseId,
        periodYear: year,
        periodMonth: mo,
        amountDue: monthlyRent,
        dueDate: rentDueDateForBilledPeriod(year, mo, rentDueDay),
        status: PaymentStatus.PENDING,
      },
    });
    paymentIds.push(id);
  }

  return { organizationId, buildingId, unitId, tenantId, leaseId, paymentIds };
}

/** Supprime une org de test et tout son graphe (ordre FK). */
export async function destroyOrgFixture(prisma: PrismaClient, organizationId: string) {
  const buildings = await prisma.building.findMany({
    where: { organizationId },
    select: { id: true },
  });
  const buildingIds = buildings.map((b) => b.id);
  const units = await prisma.unit.findMany({
    where: { buildingId: { in: buildingIds } },
    select: { id: true },
  });
  const unitIds = units.map((u) => u.id);
  const leases = await prisma.lease.findMany({
    where: { unitId: { in: unitIds } },
    select: { id: true },
  });
  const leaseIds = leases.map((l) => l.id);

  if (leaseIds.length) {
    await prisma.payment.deleteMany({ where: { leaseId: { in: leaseIds } } });
    await prisma.lease.deleteMany({ where: { id: { in: leaseIds } } });
  }
  if (unitIds.length) await prisma.unit.deleteMany({ where: { id: { in: unitIds } } });
  if (buildingIds.length) await prisma.building.deleteMany({ where: { id: { in: buildingIds } } });
  await prisma.tenant.deleteMany({ where: { organizationId } });
  await prisma.user.deleteMany({ where: { organizationId } });
  await prisma.organization.deleteMany({ where: { id: organizationId } });
}
