import { NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BuildingsService } from '../../src/buildings/buildings.service';
import { LeasesService } from '../../src/leases/leases.service';
import { PaymentsService } from '../../src/payments/payments.service';
import { TenantsService } from '../../src/tenants/tenants.service';
import { createTestPrisma, hasLocalTestDb } from '../helpers/test-prisma';
import { destroyOrgFixture, seedOrgFixture } from '../helpers/seed-fixture';

const describeDb = hasLocalTestDb() ? describe : describe.skip;

/**
 * Isolation multi-tenant : un utilisateur org B ne lit pas les entités d’org A.
 * Couverture services métier principaux (pas encore chaque route HTTP — Phase B).
 */
describeDb('Isolation organisation (caractérisation)', () => {
  let prisma: PrismaClient;
  let payments: PaymentsService;
  let leases: LeasesService;
  let buildings: BuildingsService;
  let tenants: TenantsService;
  let orgA: Awaited<ReturnType<typeof seedOrgFixture>>;
  let orgB: Awaited<ReturnType<typeof seedOrgFixture>>;

  beforeAll(async () => {
    prisma = createTestPrisma()!;
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const mail = { sendMail: jest.fn() };
    const auth = {};
    const config = { get: jest.fn() };
    payments = new PaymentsService(
      prisma as never,
      mail as never,
      audit as never,
      auth as never,
      config as never,
      { getSettings: jest.fn().mockResolvedValue({ autoReceiptEnabled: false }) } as never,
      { send: jest.fn() } as never,
    );
    const storage = {
      put: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      getSignedDownloadUrl: jest.fn(),
      driver: 'local',
    };
    leases = new LeasesService(
      prisma as never,
      payments,
      audit as never,
      storage as never,
      { getSettings: jest.fn().mockResolvedValue({ autoGenerateSchedules: false }) } as never,
    );
    buildings = new BuildingsService(prisma as never, {
      assertCanCreateUnit: async () => undefined,
      getEntitlements: async () => ({
        unitLimit: null,
        unitsUsed: 0,
        status: 'ACTIVE',
      }),
    } as never);
    tenants = new TenantsService(prisma as never, audit as never, storage as never);

    orgA = await seedOrgFixture(prisma, { label: 'orgA', year: 2037, months: [1] });
    orgB = await seedOrgFixture(prisma, { label: 'orgB', year: 2037, months: [1] });
  });

  afterAll(async () => {
    await destroyOrgFixture(prisma, orgA.organizationId);
    await destroyOrgFixture(prisma, orgB.organizationId);
    await prisma.$disconnect();
  });

  it('payment A inaccessible via org B', async () => {
    await expect(payments.get(orgA.paymentIds[0], orgB.organizationId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lease A inaccessible via org B', async () => {
    await expect(leases.get(orgA.leaseId, orgB.organizationId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('building A inaccessible via org B', async () => {
    await expect(buildings.get(orgA.buildingId, orgB.organizationId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('tenant A inaccessible via org B', async () => {
    await expect(tenants.get(orgA.tenantId, orgB.organizationId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('list payments org B ne contient pas les ids org A', async () => {
    const rows = await payments.list(orgB.organizationId);
    const ids = new Set(rows.map((r: { id: string }) => r.id));
    expect(ids.has(orgA.paymentIds[0])).toBe(false);
    expect(ids.has(orgB.paymentIds[0])).toBe(true);
  });
});
