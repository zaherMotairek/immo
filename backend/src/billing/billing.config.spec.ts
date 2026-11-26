import {
  addMonthsUtc,
  billingAnnualBonusMonths,
  billingGraceDays,
  creditedMonthsForPrepaid,
} from './billing.config';
import { isOrganizationPlatformAccessBlocked } from '../auth/organization-platform-access';

describe('billing D6', () => {
  const prevGrace = process.env.BILLING_GRACE_DAYS;
  const prevBonus = process.env.BILLING_ANNUAL_BONUS_MONTHS;

  afterEach(() => {
    if (prevGrace === undefined) delete process.env.BILLING_GRACE_DAYS;
    else process.env.BILLING_GRACE_DAYS = prevGrace;
    if (prevBonus === undefined) delete process.env.BILLING_ANNUAL_BONUS_MONTHS;
    else process.env.BILLING_ANNUAL_BONUS_MONTHS = prevBonus;
  });

  it('crédite 13 mois pour un forfait annuel (bonus 1)', () => {
    process.env.BILLING_ANNUAL_BONUS_MONTHS = '1';
    expect(creditedMonthsForPrepaid(12)).toBe(13);
    expect(creditedMonthsForPrepaid(1)).toBe(1);
    expect(creditedMonthsForPrepaid(3)).toBe(3);
    expect(billingAnnualBonusMonths()).toBe(1);
  });

  it('applique une grâce de 3 jours après paidUntil', () => {
    process.env.BILLING_GRACE_DAYS = '3';
    expect(billingGraceDays()).toBe(3);
    const today = new Date();
    const paid = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    paid.setUTCDate(paid.getUTCDate() - 2);
    expect(
      isOrganizationPlatformAccessBlocked({
        platformAccessSuspended: false,
        platformAccessPaidUntil: paid,
      }),
    ).toBe(false);
    paid.setUTCDate(paid.getUTCDate() - 5);
    expect(
      isOrganizationPlatformAccessBlocked({
        platformAccessSuspended: false,
        platformAccessPaidUntil: paid,
      }),
    ).toBe(true);
  });

  it('addMonthsUtc avance le calendrier', () => {
    const d = new Date(Date.UTC(2026, 0, 15));
    expect(addMonthsUtc(d, 1).toISOString().slice(0, 10)).toBe('2026-02-15');
  });
});
