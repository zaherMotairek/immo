import { CollectionMethod, PaymentStatus, Prisma } from '@prisma/client';
import { rentDueDateForBilledPeriod, startOfTodayUtc } from '../common/date.util';
import {
  SEED_TAG,
  buildRichDemoBuildingPlans,
  buildRichDemoTenants,
  flattenDemoLeases,
} from '../demo/rich-demo-catalog';

type Tx = Prisma.TransactionClient;

/** Jeu d’exemple volumineux : ~28 biens, ~28 locataires, loyers janv. → mois en cours. */
export async function seedRichDemoYear(tx: Tx, organizationId: string) {
  const year = new Date().getUTCFullYear();
  const throughMonth = new Date().getUTCMonth() + 1;
  const buildingPlans = buildRichDemoBuildingPlans(SEED_TAG);
  const tenants = buildRichDemoTenants();
  const leasePlans = flattenDemoLeases(buildingPlans, tenants, year);

  let unitCount = 0;
  const leaseRecords: Array<{ id: string; rentDueDay: number; monthlyRent: number }> = [];

  for (const plan of buildingPlans) {
    const building = await tx.building.create({
      data: {
        organizationId,
        name: plan.name,
        city: plan.city,
        commune: plan.commune,
        address: plan.address,
        country: "Côte d'Ivoire",
        structureKind: plan.structureKind,
        floorCount: plan.floorCount ?? null,
        apartmentCount: plan.apartmentCount ?? null,
        terrainLotCount: plan.terrainLotCount ?? null,
        notes: SEED_TAG,
      },
    });

    for (const u of plan.units) {
      unitCount += 1;
      const unit = await tx.unit.create({
        data: {
          buildingId: building.id,
          label: u.label,
          kind: u.kind,
          floor: u.floor ?? null,
          defaultRent: u.rent,
        },
      });

      if (u.lease === false) continue;

      const lp = leasePlans.find(
        (l) => l.buildingName === plan.name && l.unitLabel === u.label,
      );
      if (!lp) continue;

      let tenant = await tx.tenant.findFirst({
        where: { organizationId, email: lp.tenant.email },
      });
      if (!tenant) {
        tenant = await tx.tenant.create({
          data: {
            organizationId,
            firstName: lp.tenant.firstName,
            lastName: lp.tenant.lastName,
            phone: lp.tenant.phone,
            email: lp.tenant.email,
            notes: SEED_TAG,
          },
        });
      }

      const lease = await tx.lease.create({
        data: {
          unitId: unit.id,
          tenantId: tenant.id,
          startDate: lp.start,
          monthlyRent: lp.rent,
          rentDueDay: lp.rentDueDay,
          depositAmount: lp.deposit > 0 ? lp.deposit : null,
          active: true,
        },
      });
      leaseRecords.push({
        id: lease.id,
        rentDueDay: lp.rentDueDay,
        monthlyRent: lp.rent,
      });
    }
  }

  const uniqueTenants = await tx.tenant.count({
    where: { organizationId, notes: { contains: SEED_TAG } },
  });

  const chargeCats = ['SECURITY', 'INSURANCE', 'MAINTENANCE', 'UTILITIES', 'TAX'] as const;
  const buildings = await tx.building.findMany({
    where: { organizationId, notes: SEED_TAG },
    take: 18,
    select: { id: true },
  });
  for (let c = 0; c < buildings.length; c += 1) {
    const b = buildings[c]!;
    await tx.charge.create({
      data: {
        buildingId: b.id,
        category: chargeCats[c % chargeCats.length]!,
        label: `Charge démo ${c + 1}`,
        amount: 35_000 + c * 4_500,
        periodYear: year,
        periodMonth: c % 3 === 0 ? throughMonth : (c % 12) + 1,
        paid: c % 2 === 0,
      },
    });
  }

  const today = startOfTodayUtc();
  let paymentCount = 0;

  for (const le of leaseRecords) {
    const rent = le.monthlyRent;
    for (let mo = 1; mo <= throughMonth; mo += 1) {
      const due = rentDueDateForBilledPeriod(year, mo, le.rentDueDay);
      let status: PaymentStatus = PaymentStatus.PENDING;
      let amountPaid: number | null = null;
      let paidAt: Date | null = null;
      let collectionMethod: CollectionMethod | null = null;

      if (mo < throughMonth - 1) {
        status = PaymentStatus.PAID;
        amountPaid = rent;
        paidAt = due;
        collectionMethod = mo % 3 === 0 ? CollectionMethod.ORANGE_MONEY : CollectionMethod.CASH;
      } else if (mo === throughMonth - 1) {
        status = mo % 4 === 0 ? PaymentStatus.LATE : PaymentStatus.PAID;
        if (status === PaymentStatus.PAID) {
          amountPaid = rent;
          paidAt = today;
          collectionMethod = CollectionMethod.BANK_TRANSFER;
        } else {
          amountPaid = Math.round(rent * 0.5);
          collectionMethod = CollectionMethod.WAVE;
        }
      } else if (mo === throughMonth) {
        status = mo % 2 === 0 ? PaymentStatus.LATE : PaymentStatus.PENDING;
        if (status === PaymentStatus.LATE) {
          amountPaid = Math.round(rent * 0.4);
          collectionMethod = CollectionMethod.WAVE;
        }
      }

      await tx.payment.create({
        data: {
          leaseId: le.id,
          periodYear: year,
          periodMonth: mo,
          amountDue: rent,
          amountPaid: amountPaid != null ? amountPaid : undefined,
          dueDate: due,
          status,
          paidAt: paidAt ?? undefined,
          collectionMethod: collectionMethod ?? undefined,
        },
      });
      paymentCount += 1;
    }
  }

  return {
    buildings: buildingPlans.length,
    units: unitCount,
    tenants: uniqueTenants,
    leases: leaseRecords.length,
    payments: paymentCount,
    year,
    throughMonth,
  };
}