import { BadRequestException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { LeasesService } from './leases.service';

describe('LeasesService.reviseRent (C6-A)', () => {
  function setup() {
    const lease = {
      id: 'lease-1',
      active: true,
      monthlyRent: { toNumber: () => 100_000 },
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      rentDueDay: 5,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const scheduleRows = [
      { id: 'p1', periodYear: 2026, periodMonth: 1, status: PaymentStatus.PAID },
      { id: 'p2', periodYear: 2026, periodMonth: 6, status: PaymentStatus.PENDING },
      { id: 'p3', periodYear: 2026, periodMonth: 7, status: PaymentStatus.LATE },
    ];
    const prisma = {
      lease: {
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(lease),
        update: jest.fn().mockResolvedValue({
          ...lease,
          monthlyRent: { toNumber: () => 110_000 },
          tenant: {},
          unit: { building: {} },
        }),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue(scheduleRows.filter((p) => p.status !== PaymentStatus.PAID)),
        update: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      leaseRentRevision: { create: jest.fn().mockResolvedValue({}) },
    };
    const audit = { log: jest.fn() };
    const paymentsSvc = {} as never;
    const storage = {} as never;
    const automation = { getSettings: jest.fn() } as never;
    const svc = new LeasesService(prisma as never, paymentsSvc, audit as never, storage, automation);
    return { svc, prisma, audit };
  }

  it('met à jour PENDING/LATE à partir de effectiveFrom, pas les PAID', async () => {
    const { svc, prisma } = setup();
    await svc.reviseRent(
      'lease-1',
      'org-1',
      { newMonthlyRent: 110_000, effectiveFrom: '2026-06-01' },
      { id: 'u1' } as never,
    );
    expect(prisma.payment.update).toHaveBeenCalledTimes(2);
    expect(prisma.leaseRentRevision.create).toHaveBeenCalled();
    expect(prisma.lease.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ monthlyRent: 110_000 }),
      }),
    );
  });

  it('refuse si ni montant ni percent', async () => {
    const { svc } = setup();
    await expect(
      svc.reviseRent('lease-1', 'org-1', { effectiveFrom: '2026-06-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
