import { AdminService } from './admin.service';
import { STATUS_LABEL_FR } from './admin-status.util';

describe('admin status labels (D3)', () => {
  it('expose les libellés FR attendus', () => {
    expect(STATUS_LABEL_FR.ACTIVE).toBe('Actif');
    expect(STATUS_LABEL_FR.EXPIRING_SOON).toBe('Bientôt expiré');
    expect(STATUS_LABEL_FR.EXPIRED).toBe('Expiré');
    expect(STATUS_LABEL_FR.TRIAL).toBe('Essai');
    expect(STATUS_LABEL_FR.SUSPENDED).toBe('Suspendu');
    expect(STATUS_LABEL_FR.FREE).toBe('Gratuit');
  });
});

describe('AdminService.dashboard', () => {
  it('agrège CA mensuel et compteurs', async () => {
    const prisma = {
      subscriptionPayment: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amountFcfa: 50_000 }, _count: 2 }),
      },
      organization: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(3),
      },
    };
    const entitlements = {} as never;
    const mail = {} as never;
    const config = {} as never;
    const jwt = {} as never;
    const audit = {} as never;
    const svc = new AdminService(
      prisma as never,
      entitlements,
      mail,
      config,
      jwt,
      audit,
    );
    const d = await svc.dashboard();
    expect(d.monthlyRevenueFcfa).toBe(50_000);
    expect(d.monthlyPaymentCount).toBe(2);
    expect(d.clientCount).toBe(3);
  });
});
