import { PrismaClient } from '@prisma/client';
import { PaymentsService } from '../../src/payments/payments.service';
import { DashboardService } from '../../src/dashboard/dashboard.service';
import { FinanceSummaryService } from '../../src/finance/finance-summary.service';
import { createTestPrisma, hasLocalTestDb } from '../helpers/test-prisma';
import { destroyOrgFixture, seedOrgFixture } from '../helpers/seed-fixture';

const describeDb = hasLocalTestDb() ? describe : describe.skip;

describeDb('FinanceSummaryService — alignement dashboard (C7)', () => {
  let prisma: PrismaClient;
  let finance: FinanceSummaryService;
  let dashboard: DashboardService;
  const orgIds: string[] = [];

  beforeAll(() => {
    prisma = createTestPrisma()!;
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const mail = { sendMail: jest.fn(), sendTextEmail: jest.fn() };
    const payments = new PaymentsService(
      prisma as never,
      mail as never,
      audit as never,
      {} as never,
      { get: jest.fn() } as never,
      { getSettings: jest.fn().mockResolvedValue({ autoReceiptEnabled: false }) } as never,
      { send: jest.fn() } as never,
    );
    finance = new FinanceSummaryService(prisma as never, payments);
    dashboard = new DashboardService(prisma as never, payments, finance);
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

  it('GET summary KPIs = overview.kpis (mêmes totaux)', async () => {
    const f = await seedOrgFixture(prisma, {
      label: 'fin-c7',
      year: 2020,
      months: [1],
      rentDueDay: 1,
      monthlyRent: 100_000,
    });
    orgIds.push(f.organizationId);

    const snap = await finance.getMonthSnapshot(f.organizationId);
    const overview = await dashboard.overview(f.organizationId);

    expect(overview.kpis.expectedMonthlyRent).toBe(snap.expectedMonthlyRent);
    expect(overview.kpis.collectedThisMonth).toBe(snap.collectedThisMonth);
    expect(overview.kpis.overdueCount).toBe(snap.overdueCount);
    expect(overview.kpis.overdueAmount).toBe(snap.overdueAmount);
    expect(overview.kpis.depositsCollectedThisMonth).toBe(snap.depositsCollectedThisMonth);
    expect(overview.kpis.remainingVsExpected).toBe(snap.remainingVsExpected);
    expect(overview.kpis.buildings).toBe(snap.buildings);
  });

  it('today agenda expose des compteurs', async () => {
    const f = await seedOrgFixture(prisma, {
      label: 'today-c5',
      year: 2020,
      months: [1],
      rentDueDay: 1,
    });
    orgIds.push(f.organizationId);
    const agenda = await finance.getTodayAgenda(f.organizationId, { lateDaysThreshold: 7 });
    expect(agenda.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof agenda.counts.remind).toBe('number');
    expect(Array.isArray(agenda.items)).toBe(true);
  });
});
