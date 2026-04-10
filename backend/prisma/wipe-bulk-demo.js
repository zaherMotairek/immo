/* eslint-disable @typescript-eslint/no-require-imports */
/** Supprime uniquement les données créées par seed-bulk (préfixe + emails démo). */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BULK_BUILDING_PREFIX = 'Bulk démo —';
const TENANT_EMAIL_SUFFIX = '@bulk-demo.immopilot.local';

async function main() {
  const bulkBuildings = await prisma.building.findMany({
    where: { name: { startsWith: BULK_BUILDING_PREFIX } },
    select: { id: true },
  });
  const ids = bulkBuildings.map((b) => b.id);
  if (ids.length === 0) {
    console.log('Aucune donnée « Bulk démo » trouvée.');
    return;
  }
  const payments = await prisma.payment.deleteMany({
    where: { lease: { unit: { buildingId: { in: ids } } } },
  });
  const leases = await prisma.lease.deleteMany({
    where: { unit: { buildingId: { in: ids } } },
  });
  const units = await prisma.unit.deleteMany({ where: { buildingId: { in: ids } } });
  const buildings = await prisma.building.deleteMany({ where: { id: { in: ids } } });
  const tenants = await prisma.tenant.deleteMany({
    where: { email: { endsWith: TENANT_EMAIL_SUFFIX } },
  });
  console.log('Bulk démo supprimé :', {
    payments: payments.count,
    leases: leases.count,
    units: units.count,
    buildings: buildings.count,
    tenants: tenants.count,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
