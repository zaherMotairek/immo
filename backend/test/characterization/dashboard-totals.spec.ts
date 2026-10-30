import { PaymentStatus, PrismaClient } from '@prisma/client';
import { DashboardService } from '../../src/dashboard/dashboard.service';
import { PaymentsService } from '../../src/payments/payments.service';
import { createTestPrisma, hasLocalTestDb } from '../helpers/test-prisma';
import { destroyOrgFixture, seedOrgFixture } from '../helpers/seed-fixture';

const describeDb = hasLocalTestDb() ? describe : describe.skip;

describeDb('DashboardService.overview — totaux (caractérisation)', () => {
  let prisma: PrismaClient;
  let dashboard: DashboardService;
  const orgIds: string[] = [];

  beforeAll(() => {
    prisma = createTestPrisma()!;
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const mail = { sendMail: jest.fn() };
    const payments = new PaymentsService(
      prisma as never,
      mail as never,
      audit as never,
      {} as never,
      { get: jest.fn() } as never,
    );
    dashboard = new DashboardService(prisma as never, payments);
  });

  afterAll(async () => {
    for (const id of orgIds) {
      try {
        await destroyOrgFixture(prisma, id);
      } catch {
        /* ignore */
      }
    }
    await prisma.$disconnect();
  });

  it('expectedRent = somme monthlyRent des baux actifs de l’org', async () => {
    const f = await seedOrgFixture(prisma, {
      label: 'dash',
      monthlyRent: 200_000,
      year: 2038,
      months: [1],
    });
    orgIds.push(f.organizationId);

    const ov = await dashboard.overview(f.organizationId);
    expect(Number(ov.kpis.expectedMonthlyRent)).toBe(200_000);
    expect(ov.kpis.buildings).toBeGreaterThanOrEqual(1);
    expect(ov.kpis.units).toBeGreaterThanOrEqual(1);
    expect(ov.kpis.tenants).toBeGreaterThanOrEqual(1);
  });

  it('collectedThisMonth compte amountPaid du mois civil courant', async () => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + 1;
    const f = await seedOrgFixture(prisma, {
      label: 'dash-paid',
      monthlyRent: 110_000,
      year: y,
      months: [m],
    });
    orgIds.push(f.organizationId);
    await prisma.payment.update({
      where: { id: f.paymentIds[0] },
      data: {
        status: PaymentStatus.PAID,
        amountPaid: 110_000,
        paidAt: new Date(),
      },
    });

    const ov = await dashboard.overview(f.organizationId);
    expect(Number(ov.kpis.collectedThisMonth)).toBeGreaterThanOrEqual(110_000);
  });
});
