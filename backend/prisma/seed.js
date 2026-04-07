/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient, PaymentStatus, BuildingStructureKind } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@immopilot.local';
  const password = process.env.SEED_ADMIN_PASSWORD || 'AdminImmo2026!';
  const hash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash: hash,
      name: 'Administrateur',
    },
    update: {
      passwordHash: hash,
    },
  });

  console.log('Seed OK — compte gestionnaire :', email);
  console.log('Mot de passe (à changer en prod) :', password);
}

async function seedDemoIvoryCoast() {
  if (process.env.SEED_DEMO_DATA === '0') {
    console.log('Seed démo CI désactivé (SEED_DEMO_DATA=0).');
    return;
  }

  if (process.env.SEED_DEMO_FORCE === '1') {
    await prisma.payment.deleteMany();
    await prisma.charge.deleteMany();
    await prisma.lease.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.building.deleteMany();
    console.log('Seed démo CI : anciennes données supprimées (SEED_DEMO_FORCE=1).');
  } else {
    const existing = await prisma.building.count();
    if (existing > 0) {
      console.log('Seed démo CI : des biens existent déjà — ignoré. Utilisez SEED_DEMO_FORCE=1 pour réinitialiser.');
      return;
    }
  }

  const b1 = await prisma.building.create({
    data: {
      name: 'Résidence Les Palmiers',
      city: 'Abidjan',
      commune: 'Cocody',
      address: 'Riviera 3, près de la voie express',
      country: "Côte d'Ivoire",
      structureKind: BuildingStructureKind.IMMEUBLE,
    },
  });

  const b2 = await prisma.building.create({
    data: {
      name: 'Immeuble Ranga',
      city: 'Abidjan',
      commune: 'Marcory',
      address: 'Zone 4, non loin du marché',
      country: "Côte d'Ivoire",
      structureKind: BuildingStructureKind.IMMEUBLE,
    },
  });

  const b3 = await prisma.building.create({
    data: {
      name: 'Villa Lagune',
      city: 'Grand-Bassam',
      commune: 'Quartier France',
      address: 'Route de la plage',
      country: "Côte d'Ivoire",
      structureKind: BuildingStructureKind.MONO_LOT,
    },
  });

  const u1 = await prisma.unit.create({
    data: {
      buildingId: b1.id,
      label: 'A4',
      kind: 'APARTMENT',
      floor: 2,
      rooms: 3,
      surfaceM2: 95,
      description: 'Appartement lumineux, balcon, cuisine équipée.',
      defaultRent: 385000,
    },
  });

  const u2 = await prisma.unit.create({
    data: {
      buildingId: b2.id,
      label: 'Bureau R+1',
      kind: 'OFFICE',
      floor: 1,
      rooms: 2,
      surfaceM2: 42,
      description: 'Open space avec petite salle de réunion.',
      defaultRent: 520000,
    },
  });

  const u3 = await prisma.unit.create({
    data: {
      buildingId: b2.id,
      label: 'Entrepôt A',
      kind: 'WAREHOUSE',
      surfaceM2: 280,
      description: 'Hangar sécurisé, accès camion.',
      defaultRent: 890000,
    },
  });

  const u4 = await prisma.unit.create({
    data: {
      buildingId: b3.id,
      label: 'Villa entière',
      kind: 'HOUSE',
      rooms: 5,
      surfaceM2: 180,
      description: 'Maison familiale, jardin, parking 2 véhicules.',
      defaultRent: 1200000,
    },
  });

  const t1 = await prisma.tenant.create({
    data: {
      firstName: 'Amadou',
      lastName: 'Koné',
      phone: '+225 07 08 12 34 56',
      email: 'amadou.kone@example.ci',
    },
  });

  const t2 = await prisma.tenant.create({
    data: {
      firstName: 'Fatou',
      lastName: 'Diabaté',
      phone: '+225 05 11 22 33 44',
      email: 'fatou.diabate@example.ci',
    },
  });

  const t3 = await prisma.tenant.create({
    data: {
      firstName: 'Koffi',
      lastName: 'Yao',
      phone: '+225 01 99 88 77 66',
    },
  });

  const l1 = await prisma.lease.create({
    data: {
      unitId: u1.id,
      tenantId: t1.id,
      startDate: new Date('2025-06-01'),
      monthlyRent: 385000,
      rentDueDay: 5,
      active: true,
    },
  });

  const l2 = await prisma.lease.create({
    data: {
      unitId: u2.id,
      tenantId: t2.id,
      startDate: new Date('2025-09-01'),
      monthlyRent: 520000,
      rentDueDay: 10,
      active: true,
    },
  });

  const l3 = await prisma.lease.create({
    data: {
      unitId: u3.id,
      tenantId: t3.id,
      startDate: new Date('2025-11-01'),
      monthlyRent: 890000,
      rentDueDay: 15,
      active: true,
    },
  });

  const l4 = await prisma.lease.create({
    data: {
      unitId: u4.id,
      tenantId: t1.id,
      startDate: new Date('2026-01-01'),
      monthlyRent: 1200000,
      rentDueDay: 1,
      active: true,
    },
  });

  const year = new Date().getFullYear();
  for (const le of [l1, l2, l3, l4]) {
    for (let mo = 1; mo <= 12; mo++) {
      const last = new Date(year, mo, 0).getDate();
      const day = Math.min(Math.max(1, le.rentDueDay), last);
      const due = new Date(Date.UTC(year, mo - 1, day));
      const isPaid = mo <= 2;
      await prisma.payment.create({
        data: {
          leaseId: le.id,
          periodYear: year,
          periodMonth: mo,
          amountDue: le.monthlyRent,
          dueDate: due,
          status: isPaid ? PaymentStatus.PAID : mo === 3 ? PaymentStatus.LATE : PaymentStatus.PENDING,
          paidAt: isPaid ? new Date() : null,
          amountPaid: isPaid ? le.monthlyRent : null,
        },
      });
    }
  }

  console.log('Seed démo CI : 3 biens, 4 unités, 3 locataires, 4 locations (baux) + loyers', year, 'créés.');
}

async function main() {
  await seedAdmin();
  await seedDemoIvoryCoast();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
