import { PrismaClient } from '@prisma/client';
import { LeasesService } from '../../src/leases/leases.service';
import { PaymentsService } from '../../src/payments/payments.service';
import { createTestPrisma, hasLocalTestDb } from '../helpers/test-prisma';
import { destroyOrgFixture, seedOrgFixture } from '../helpers/seed-fixture';

const describeDb = hasLocalTestDb() ? describe : describe.skip;

describeDb('LeasesService — generatePayments / prepay (DB locale)', () => {
  let prisma: PrismaClient;
  let leases: LeasesService;
  let payments: PaymentsService;
  const orgIds: string[] = [];

  beforeAll(() => {
    prisma = createTestPrisma()!;
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const mail = { sendMail: jest.fn() };
    const auth = {};
    const config = { get: jest.fn() };
    payments = new PaymentsService(prisma as never, mail as never, audit as never, auth as never, config as never);
    leases = new LeasesService(prisma as never, payments, audit as never);
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

  it('generatePayments crée 12 mois idempotents (unique lease+year+month)', async () => {
    const f = await seedOrgFixture(prisma, {
      label: 'gen',
      year: 2034,
      months: [], // aucun paiement initial
      monthlyRent: 120_000,
    });
    orgIds.push(f.organizationId);

    const first = await leases.generatePayments(f.leaseId, f.organizationId, 2034);
    expect(first.createdCount).toBe(12);

    const second = await leases.generatePayments(f.leaseId, f.organizationId, 2034);
    expect(second.createdCount).toBe(0);

    const count = await prisma.payment.count({ where: { leaseId: f.leaseId, periodYear: 2034 } });
    expect(count).toBe(12);

    const sample = await prisma.payment.findFirst({
      where: { leaseId: f.leaseId, periodYear: 2034, periodMonth: 1 },
    });
    expect(Number(sample?.amountDue)).toBe(120_000);
  });

  it('prepayNextMonths marque N échéances PAID avec amountPaid = amountDue', async () => {
    const f = await seedOrgFixture(prisma, {
      label: 'prepay',
      year: 2035,
      months: [1, 2, 3, 4],
      monthlyRent: 90_000,
      rentDueDay: 10,
    });
    orgIds.push(f.organizationId);

    const res = await leases.prepayNextMonths(f.leaseId, f.organizationId, 2);
    expect(res.monthsPaid).toBe(2);
    expect(res.totalFcfa).toBe(180_000);

    const paid = await prisma.payment.findMany({
      where: { id: { in: res.paymentIds } },
    });
    expect(paid).toHaveLength(2);
    for (const p of paid) {
      expect(p.status).toBe('PAID');
      expect(Number(p.amountPaid)).toBe(90_000);
    }
  });

  it('prepayNextMonths refuse si pas assez d’échéances impayées', async () => {
    const f = await seedOrgFixture(prisma, {
      label: 'prepay-short',
      year: 2036,
      months: [1],
      monthlyRent: 70_000,
    });
    orgIds.push(f.organizationId);
    await expect(leases.prepayNextMonths(f.leaseId, f.organizationId, 3)).rejects.toThrow(/échéance/);
  });
});
