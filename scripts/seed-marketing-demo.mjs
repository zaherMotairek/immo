#!/usr/bin/env node
/**
 * Données fictives Abidjan pour captures marketing (DB locale uniquement).
 * Usage : node scripts/seed-marketing-demo.mjs
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(path.join(root, 'backend/package.json'));
const { PrismaClient, PaymentStatus, ChargeCategory, ReminderChannel, BuildingStructureKind, CollectionMethod } =
  require('@prisma/client');

const DEFAULT_ORG_ID = '00000000-0000-4000-8000-000000000001';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function augment(prisma) {
  const year = new Date().getFullYear();

  const terrain = await prisma.building.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      name: 'Parcelle Cocody Angre',
      city: 'Abidjan',
      commune: 'Cocody',
      address: 'Angré 8e tranche',
      country: "Côte d'Ivoire",
      structureKind: BuildingStructureKind.TERRAIN_LOTS,
      terrainLotCount: 6,
    },
  });

  for (let lot = 1; lot <= 3; lot++) {
    await prisma.unit.create({
      data: {
        buildingId: terrain.id,
        label: `Lot ${lot}`,
        kind: 'LAND',
        defaultRent: 75000 + lot * 5000,
      },
    });
  }

  const leases = await prisma.lease.findMany({ take: 2, include: { payments: true } });
  const latePayment = leases
    .flatMap((l) => l.payments)
    .find((p) => p.status === PaymentStatus.LATE || p.status === PaymentStatus.PENDING);
  if (latePayment) {
    await prisma.payment.update({
      where: { id: latePayment.id },
      data: {
        status: PaymentStatus.LATE,
        amountPaid: Math.round(Number(latePayment.amountDue) * 0.35),
        collectionMethod: CollectionMethod.ORANGE_MONEY,
        collectionReference: 'OM-DEMO-8821',
      },
    });
    await prisma.paymentReminder.create({
      data: { paymentId: latePayment.id, channel: ReminderChannel.WHATSAPP },
    });
    await prisma.paymentReminder.create({
      data: { paymentId: latePayment.id, channel: ReminderChannel.EMAIL },
    });
  }

  const building = await prisma.building.findFirst();
  if (building) {
    await prisma.charge.createMany({
      data: [
        {
          buildingId: building.id,
          category: ChargeCategory.SECURITY,
          label: 'Gardiennage immeuble',
          amount: 45000,
          periodYear: year,
          periodMonth: new Date().getMonth() + 1,
          paid: true,
        },
        {
          buildingId: building.id,
          category: ChargeCategory.INSURANCE,
          label: 'Assurance multirisque',
          amount: 120000,
          periodYear: year,
          periodMonth: null,
          paid: false,
          notes: 'Annuel',
        },
        {
          buildingId: building.id,
          category: ChargeCategory.PAYROLL,
          label: 'Concierge — salaire',
          amount: 85000,
          periodYear: year,
          periodMonth: new Date().getMonth() + 1,
          paid: true,
        },
      ],
    });
  }

  console.log('Marketing seed : terrain + lots, paiement partiel, relances, charges ajoutés.');
}

async function main() {
  run('node', [path.join(root, 'scripts/assert-local-db.mjs')]);
  run('npm', ['run', 'seed'], {
    cwd: path.join(root, 'backend'),
    env: { ...process.env, SEED_DEMO_FORCE: '1' },
    shell: true,
  });

  const prisma = new PrismaClient();
  try {
    await augment(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});