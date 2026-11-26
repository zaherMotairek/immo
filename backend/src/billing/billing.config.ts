/** Config facturation manuelle (D6) — branchable provider sans changer l’UI. */
export function billingGraceDays(): number {
  const n = Number(process.env.BILLING_GRACE_DAYS ?? '3');
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 3;
}

/** Mois offerts sur un forfait annuel (12 → 12 + bonus). */
export function billingAnnualBonusMonths(): number {
  const n = Number(process.env.BILLING_ANNUAL_BONUS_MONTHS ?? '1');
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 1;
}

/** Mois calendaires réellement crédités pour un forfait prépayé. */
export function creditedMonthsForPrepaid(prepaidMonths: 1 | 3 | 12): number {
  if (prepaidMonths === 12) return 12 + billingAnnualBonusMonths();
  return prepaidMonths;
}

export function addMonthsUtc(from: Date, months: number): Date {
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}
