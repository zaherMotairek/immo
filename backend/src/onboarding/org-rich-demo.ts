import {
  BuildingStructureKind,
  CollectionMethod,
  PaymentStatus,
  Prisma,
  UnitKind,
} from '@prisma/client';
import { rentDueDateForBilledPeriod, startOfTodayUtc } from '../common/date.util';

const TAG = 'Démo année complète (fictif)';

type Tx = Prisma.TransactionClient;

/** Jeu d’exemple type seed CI : biens Abidjan + loyers janv. → mois en cours. */
export async function seedRichDemoYear(tx: Tx, organizationId: string) {
  const year = new Date().getUTCFullYear();
  const throughMonth = new Date().getUTCMonth() + 1;

  const b1 = await tx.building.create({
    data: {
      organizationId,
      name: `${TAG} — Résidence Les Palmiers`,
      city: 'Abidjan',
      commune: 'Cocody',
      address: 'Riviera 3',
      country: "Côte d'Ivoire",
      structureKind: BuildingStructureKind.IMMEUBLE,
      floorCount: 8,
      apartmentCount: 32,
      notes: TAG,
    },
  });
  const b2 = await tx.building.create({
    data: {
      organizationId,
      name: `${TAG} — Immeuble Ranga`,
      city: 'Abidjan',
      commune: 'Marcory',
      country: "Côte d'Ivoire",
      structureKind: BuildingStructureKind.IMMEUBLE,
      floorCount: 4,
      apartmentCount: 2,
      notes: TAG,
    },
  });
  const b3 = await tx.building.create({
    data: {
      organizationId,
      name: `${TAG} — Villa Lagune`,
      city: 'Grand-Bassam',
      commune: 'Quartier France',
      country: "Côte d'Ivoire",
      structureKind: BuildingStructureKind.MONO_LOT,
      notes: TAG,
    },
  });

  const units = await Promise.all([
    tx.unit.create({
      data: {
        buildingId: b1.id,
        label: 'A4',
        kind: UnitKind.APARTMENT,
        floor: 2,
        apartmentSlot: 4,
        rooms: 3,
        defaultRent: 385_000,
      },
    }),
    tx.unit.create({
      data: {
        buildingId: b2.id,
        label: 'Bureau R+1',
        kind: UnitKind.OFFICE,
        floor: 1,
        defaultRent: 520_000,
      },
    }),
    tx.unit.create({
      data: {
        buildingId: b2.id,
        label: 'Entrepôt A',
        kind: UnitKind.WAREHOUSE,
        defaultRent: 890_000,
      },
    }),
    tx.unit.create({
      data: {
        buildingId: b3.id,
        label: 'Villa entière',
        kind: UnitKind.HOUSE,
        rooms: 5,
        defaultRent: 1_200_000,
      },
    }),
  ]);

  const [t1, t2, t3] = await Promise.all([
    tx.tenant.create({
      data: {
        organizationId,
        firstName: 'Amadou',
        lastName: 'Koné',
        phone: '+2250708123456',
        email: 'demo-amadou@example.ci',
        notes: TAG,
      },
    }),
    tx.tenant.create({
      data: {
        organizationId,
        firstName: 'Fatou',
        lastName: 'Diabaté',
        phone: '+2250511223344',
        email: 'demo-fatou@example.ci',
        notes: TAG,
      },
    }),
    tx.tenant.create({
      data: {
        organizationId,
        firstName: 'Koffi',
        lastName: 'Yao',
        phone: '+2250199887766',
        notes: TAG,
      },
    }),
  ]);

  const leases = await Promise.all([
    tx.lease.create({
      data: {
        unitId: units[0].id,
        tenantId: t1.id,
        startDate: new Date(Date.UTC(year - 1, 5, 1)),
        monthlyRent: 385_000,
        rentDueDay: 5,
        depositAmount: 770_000,
        depositPaidAt: new Date(Date.UTC(year - 1, 5, 5)),
        active: true,
      },
    }),
    tx.lease.create({
      data: {
        unitId: units[1].id,
        tenantId: t2.id,
        startDate: new Date(Date.UTC(year - 1, 8, 1)),
        monthlyRent: 520_000,
        rentDueDay: 10,
        active: true,
      },
    }),
    tx.lease.create({
      data: {
        unitId: units[2].id,
        tenantId: t3.id,
        startDate: new Date(Date.UTC(year - 1, 10, 1)),
        monthlyRent: 890_000,
        rentDueDay: 15,
        active: true,
      },
    }),
    tx.lease.create({
      data: {
        unitId: units[3].id,
        tenantId: t1.id,
        startDate: new Date(Date.UTC(year, 0, 1)),
        monthlyRent: 1_200_000,
        rentDueDay: 1,
        active: true,
      },
    }),
  ]);

  await tx.charge.createMany({
    data: [
      {
        buildingId: b1.id,
        category: 'SECURITY',
        label: 'Gardiennage (démo)',
        amount: 45_000,
        periodYear: year,
        periodMonth: throughMonth,
        paid: true,
      },
      {
        buildingId: b1.id,
        category: 'INSURANCE',
        label: 'Assurance multirisque (démo)',
        amount: 120_000,
        periodYear: year,
        paid: false,
      },
    ],
  });

  const today = startOfTodayUtc();
  let paymentCount = 0;

  for (const le of leases) {
    const rent = Number(le.monthlyRent);
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
        status = PaymentStatus.PAID;
        amountPaid = Math.round(rent * 0.85);
        paidAt = today;
        collectionMethod = CollectionMethod.BANK_TRANSFER;
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
    buildings: 3,
    units: units.length,
    tenants: 3,
    leases: leases.length,
    payments: paymentCount,
    year,
    throughMonth,
  };
}