import { LateStatusJob, LATE_STATUS_LOCK_KEY } from './late-status.job';

describe('LateStatusJob', () => {
  it('n’exécute pas sync si le lock advisory est refusé', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValueOnce([{ locked: false }]),
    };
    const payments = { syncLateStatuses: jest.fn() };
    const job = new LateStatusJob(prisma as never, payments as never);

    const res = await job.runWithAdvisoryLock();
    expect(res).toEqual({ ran: false });
    expect(payments.syncLateStatuses).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('exécute sync puis unlock si le lock est acquis', async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ locked: true }])
        .mockResolvedValueOnce([{ unlocked: true }]),
    };
    const payments = { syncLateStatuses: jest.fn().mockResolvedValue({ updated: 3 }) };
    const job = new LateStatusJob(prisma as never, payments as never);

    const res = await job.runWithAdvisoryLock();
    expect(res).toEqual({ ran: true, updated: 3 });
    expect(payments.syncLateStatuses).toHaveBeenCalledWith();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(LATE_STATUS_LOCK_KEY).toBe(1_901_030_600);
  });
});
