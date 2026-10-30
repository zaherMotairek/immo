import { ForbiddenException } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';

function mockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    organization: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    plan: { findUnique: jest.fn() },
    unit: { count: jest.fn().mockResolvedValue(0) },
    user: { count: jest.fn().mockResolvedValue(0) },
    planChangeLog: { create: jest.fn() },
    $transaction: jest.fn(async (ops: unknown[]) => ops),
    ...overrides,
  };
}

describe('EntitlementsService', () => {
  it('bloque create unit si limite atteinte (FREE)', async () => {
    const prisma = mockPrisma();
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      planCode: 'FREE',
      trialEndsAt: null,
      subscriptionEndsAt: null,
      platformAccessSuspended: false,
      platformAccessPaidUntil: null,
    });
    (prisma.plan.findUnique as jest.Mock).mockResolvedValue({
      code: 'FREE',
      name: 'Gratuit',
      unitLimit: 5,
      userLimit: 1,
      features: { reminders: false, collectors: false, exports: true },
      monthlyPriceFcfa: 0,
    });
    (prisma.unit.count as jest.Mock).mockResolvedValue(5);
    const svc = new EntitlementsService(prisma as never);
    await expect(svc.assertCanCreateUnit('org-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloque feature reminders si absente du plan', async () => {
    const prisma = mockPrisma();
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      planCode: 'FREE',
      trialEndsAt: null,
      subscriptionEndsAt: null,
      platformAccessSuspended: false,
      platformAccessPaidUntil: null,
    });
    (prisma.plan.findUnique as jest.Mock).mockResolvedValue({
      code: 'FREE',
      name: 'Gratuit',
      unitLimit: 5,
      userLimit: 1,
      features: { reminders: false, collectors: false, exports: true },
      monthlyPriceFcfa: 0,
    });
    const svc = new EntitlementsService(prisma as never);
    await expect(svc.assertFeature('org-1', 'reminders')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deriveStatus : PRO sans date de fin = ACTIVE', () => {
    const svc = new EntitlementsService(mockPrisma() as never);
    expect(
      svc.deriveStatus({
        planCode: 'PRO',
        trialEndsAt: null,
        subscriptionEndsAt: null,
        platformAccessSuspended: false,
      }),
    ).toBe('ACTIVE');
  });

  it('expireTrialsToFree est idempotent (0 si rien)', async () => {
    const prisma = mockPrisma();
    const svc = new EntitlementsService(prisma as never);
    await expect(svc.expireTrialsToFree()).resolves.toBe(0);
  });

  it('expireTrialsToFree bascule TRIAL → FREE et conserve les données (pas de delete)', async () => {
    const prisma = mockPrisma();
    (prisma.organization.findMany as jest.Mock).mockResolvedValue([{ id: 'o1', planCode: 'TRIAL' }]);
    (prisma.organization.update as jest.Mock).mockResolvedValue({});
    (prisma.planChangeLog.create as jest.Mock).mockResolvedValue({});
    const svc = new EntitlementsService(prisma as never);
    await expect(svc.expireTrialsToFree()).resolves.toBe(1);
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { planCode: 'FREE' },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
