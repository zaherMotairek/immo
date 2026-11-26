import { NotFoundException } from '@nestjs/common';
import { PaymentStatus, PrismaClient } from '@prisma/client';
import { PaymentsService } from '../../src/payments/payments.service';
import { startOfTodayUtc, addDaysUtc } from '../../src/common/date.util';
import { createTestPrisma, hasLocalTestDb } from '../helpers/test-prisma';
import { destroyOrgFixture, seedOrgFixture } from '../helpers/seed-fixture';

const describeDb = hasLocalTestDb() ? describe : describe.skip;

function mockDeps() {
  return {
    mail: { sendMail: jest.fn() },
    audit: { log: jest.fn().mockResolvedValue(undefined) },
    auth: {},
    config: { get: jest.fn() },
  };
}

describeDb('PaymentsService — caractérisation argent (DB locale)', () => {
  let prisma: PrismaClient;
  let payments: PaymentsService;
  const orgIds: string[] = [];

  beforeAll(() => {
    prisma = createTestPrisma()!;
    const deps = mockDeps();
    payments = new PaymentsService(
      prisma as never,
      deps.mail as never,
      deps.audit as never,
      deps.auth as never,
      deps.config as never,
      { getSettings: jest.fn().mockResolvedValue({ autoReceiptEnabled: false }) } as never,
      { send: jest.fn() } as never,
    );
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

  it('syncLateStatuses : PENDING avec dueDate < aujourd’hui → LATE (scopé org)', async () => {
    const f = await seedOrgFixture(prisma, {
      label: 'late',
      year: 2020,
      months: [1],
      rentDueDay: 1,
    });
    const other = await seedOrgFixture(prisma, {
      label: 'late-other',
      year: 2020,
      months: [1],
      rentDueDay: 1,
    });
    orgIds.push(f.organizationId, other.organizationId);
    const before = await prisma.payment.findUniqueOrThrow({ where: { id: f.paymentIds[0] } });
    expect(before.status).toBe(PaymentStatus.PENDING);

    const res = await payments.syncLateStatuses(f.organizationId);
    expect(res.updated).toBeGreaterThanOrEqual(1);

    const after = await prisma.payment.findUniqueOrThrow({ where: { id: f.paymentIds[0] } });
    expect(after.status).toBe(PaymentStatus.LATE);
    const otherStill = await prisma.payment.findUniqueOrThrow({ where: { id: other.paymentIds[0] } });
    expect(otherStill.status).toBe(PaymentStatus.PENDING);
  });

  it('update addAmountPaid partiel puis complet', async () => {
    const f = await seedOrgFixture(prisma, {
      label: 'partial',
      monthlyRent: 100_000,
      year: 2030,
      months: [6],
      rentDueDay: 28,
    });
    orgIds.push(f.organizationId);
    // dueDate future → reste PENDING après partiel
    await prisma.payment.update({
      where: { id: f.paymentIds[0] },
      data: { dueDate: addDaysUtc(startOfTodayUtc(), 10) },
    });

    const mid = await payments.update(f.paymentIds[0], f.organizationId, { addAmountPaid: 40_000 });
    expect(mid.status).toBe(PaymentStatus.PENDING);
    expect(Number(mid.amountPaid)).toBe(40_000);

    const full = await payments.update(f.paymentIds[0], f.organizationId, { addAmountPaid: 60_000 });
    expect(full.status).toBe(PaymentStatus.PAID);
    expect(Number(full.amountPaid)).toBe(100_000);
  });

  it('waiveRent : WAIVED, amountPaid null, amountDue inchangé', async () => {
    const f = await seedOrgFixture(prisma, {
      label: 'waive',
      monthlyRent: 80_000,
      year: 2031,
      months: [3],
    });
    orgIds.push(f.organizationId);
    const dueBefore = (await prisma.payment.findUniqueOrThrow({ where: { id: f.paymentIds[0] } })).amountDue;

    const waived = await payments.waiveRent(f.paymentIds[0], f.organizationId, 'Geste commercial test');
    expect(waived.status).toBe(PaymentStatus.WAIVED);
    expect(waived.amountPaid).toBeNull();
    expect(waived.amountDue.toString()).toBe(dueBefore.toString());
  });

  it('refuse addAmountPaid au-delà du reste', async () => {
    const f = await seedOrgFixture(prisma, {
      label: 'overpay',
      monthlyRent: 50_000,
      year: 2032,
      months: [1],
    });
    orgIds.push(f.organizationId);
    await expect(
      payments.update(f.paymentIds[0], f.organizationId, { addAmountPaid: 50_001 }),
    ).rejects.toThrow(/Versement trop élevé|reste/);
  });

  it('isolation : get paiement org A avec org B → NotFound', async () => {
    const a = await seedOrgFixture(prisma, { label: 'isoA', year: 2033, months: [1] });
    const b = await seedOrgFixture(prisma, { label: 'isoB', year: 2033, months: [1] });
    orgIds.push(a.organizationId, b.organizationId);
    await expect(payments.get(a.paymentIds[0], b.organizationId)).rejects.toBeInstanceOf(NotFoundException);
  });
});
