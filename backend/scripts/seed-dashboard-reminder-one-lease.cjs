/**
 * Un seul bien + une unité + un locataire + un bail + **un paiement dont l’échéance est demain (UTC)**.
 * Le tableau de bord « Rappel encaissements » regarde aujourd’hui…+2 jours → ce paiement tombe toujours dans la fenêtre
 * le jour où vous lancez le script (sans régler la date système).
 *
 * Option `DEMO_AOUT_14=1` : pour une démo narrative **14 → 15 août**, l’échéance est fixée au **15 août**
 * de `DEMO_YEAR` (défaut : année courante). Le rappel n’apparaît que si la **vraie** date du serveur est entre le 13 et le 15 août (UTC).
 *
 * Usage : cd backend && node scripts/seed-dashboard-reminder-one-lease.cjs
 */
const { PrismaClient, PaymentStatus, BuildingStructureKind, UnitKind } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_ORG_ID = '00000000-0000-4000-8000-000000000001';
const DEMO_BUILDING_NAME = 'TEST RAPPEL — Bail unique (démo TDB)';
const DEMO_TENANT_PHONE = 'TEST-RAPPEL-01';

/**
 * Les données doivent être dans la MÊME organisation que l’utilisateur connecté,
 * sinon le tableau de bord (filtré par JWT) ne voit rien.
 * Ordre : SEED_ORG_ID → utilisateur SEED_USER_EMAIL → premier compte dans la base → org par défaut.
 */
async function resolveOrganizationId() {
  const raw = process.env.SEED_ORG_ID?.trim();
  if (raw) return raw;

  const email = process.env.SEED_USER_EMAIL?.trim();
  if (email) {
    const u = await prisma.user.findFirst({ where: { email }, select: { organizationId: true } });
    if (u) return u.organizationId;
    console.warn('SEED_USER_EMAIL introuvable, repli sur le premier utilisateur.');
  }

  const any = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { organizationId: true, email: true },
  });
  if (any) {
    console.log('Organisation utilisée : celle du compte', any.email);
    return any.organizationId;
  }

  console.log('Aucun utilisateur : organisation par défaut (seed admin).');
  return DEFAULT_ORG_ID;
}

function startOfTodayUtc(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUtc(d, days) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/** Aligné sur backend/src/common/date.util.ts */
function rentDueDateUtc(year, month1to12, rentDueDay) {
  const lastDay = new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
  const day = Math.min(Math.max(1, rentDueDay), lastDay);
  return new Date(Date.UTC(year, month1to12 - 1, day));
}

async function main() {
  const now = new Date();
  const useAugDemo = process.env.DEMO_AOUT_14 === '1';
  const demoYear = Number(process.env.DEMO_YEAR) || now.getFullYear();

  let periodYear;
  let periodMonth;
  let dueDate;
  let rentDueDay;

  if (useAugDemo) {
    periodYear = demoYear;
    periodMonth = 8;
    rentDueDay = 15;
    dueDate = rentDueDateUtc(periodYear, periodMonth, rentDueDay);
    console.log('Mode DEMO_AOUT_14 : échéance fixée au 15 août ' + periodYear + ' (utile si la date machine est ~14 août).');
  } else {
    const todayUtc = startOfTodayUtc(now);
    dueDate = addDaysUtc(todayUtc, 1);
    periodYear = dueDate.getUTCFullYear();
    periodMonth = dueDate.getUTCMonth() + 1;
    rentDueDay = dueDate.getUTCDate();
    console.log('Mode défaut : échéance = demain (UTC) → le rappel TDB s’affiche dès aujourd’hui.');
  }

  const organizationId = await resolveOrganizationId();

  let orgRow = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  if (!orgRow) {
    if (organizationId === DEFAULT_ORG_ID) {
      await prisma.organization.upsert({
        where: { id: DEFAULT_ORG_ID },
        create: { id: DEFAULT_ORG_ID, name: 'Par défaut' },
        update: {},
      });
      orgRow = { name: 'Par défaut' };
    } else {
      throw new Error(
        `Organisation introuvable (${organizationId}). Utilisez SEED_USER_EMAIL=votre@email ou un SEED_ORG_ID valide.`,
      );
    }
  }
  console.log('Organisation cible :', organizationId, '(' + (orgRow.name ?? '—') + ')');

  const existingB = await prisma.building.findFirst({
    where: { organizationId, name: DEMO_BUILDING_NAME },
    select: { id: true },
  });
  if (existingB) {
    await prisma.building.delete({ where: { id: existingB.id } });
  }
  await prisma.tenant.deleteMany({
    where: { organizationId, phone: DEMO_TENANT_PHONE },
  });

  const building = await prisma.building.create({
    data: {
      organizationId,
      name: DEMO_BUILDING_NAME,
      city: 'Abidjan',
      commune: 'Cocody',
      country: "Côte d'Ivoire",
      structureKind: BuildingStructureKind.MONO_LOT,
    },
  });

  const unit = await prisma.unit.create({
    data: {
      buildingId: building.id,
      label: 'Logement démo',
      kind: UnitKind.APARTMENT,
      surfaceM2: 75,
      rooms: 3,
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      organizationId,
      firstName: 'Démo',
      lastName: 'Rappel encaissement',
      phone: DEMO_TENANT_PHONE,
      email: 'demo.rappel.tdb@immopilot.local',
    },
  });

  const startDate = new Date(Date.UTC(periodYear - 1, 0, 1));
  const endDate = new Date(Date.UTC(periodYear + 1, 11, 31));

  const lease = await prisma.lease.create({
    data: {
      unitId: unit.id,
      tenantId: tenant.id,
      startDate,
      endDate,
      monthlyRent: 185000,
      rentDueDay,
      active: true,
    },
  });

  await prisma.payment.create({
    data: {
      leaseId: lease.id,
      periodYear,
      periodMonth,
      amountDue: 185000,
      dueDate,
      status: PaymentStatus.PENDING,
    },
  });

  console.log('');
  console.log('OK — un seul bail de test créé pour le tableau de bord.');
  console.log('  Bien       :', building.name);
  console.log('  Locataire  :', tenant.firstName, tenant.lastName, '(' + tenant.phone + ')');
  console.log('  Loyer      : 185 000 FCFA / mois — jour d’échéance (carnet) :', rentDueDay);
  console.log('  Période    :', `${periodYear}-` + String(periodMonth).padStart(2, '0'));
  console.log('  Date échéance (UTC) :', dueDate.toISOString().slice(0, 10));
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
