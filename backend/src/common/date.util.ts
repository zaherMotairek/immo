/** Jour d'échéance dans un mois donné (ex. 31 → dernier jour si besoin). */
export function rentDueDate(year: number, month1to12: number, rentDueDay: number): Date {
  const lastDay = new Date(year, month1to12, 0).getDate();
  const day = Math.min(Math.max(1, rentDueDay), lastDay);
  return new Date(Date.UTC(year, month1to12 - 1, day));
}

/**
 * Loyer du mois M (période facturée) : exigible le jour `rentDueDay` du **même** mois M.
 */
export function rentDueDateForBilledPeriod(
  periodYear: number,
  periodMonth1to12: number,
  rentDueDay: number,
): Date {
  return rentDueDate(periodYear, periodMonth1to12, rentDueDay);
}

export function startOfTodayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

/**
 * Fin de bail par défaut : même jour un an plus tard (29 fév. → 28 fév. si l’année cible n’a pas le 29).
 */
export function addOneYearSameDay(d: Date): Date {
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  const nextY = y + 1;
  const lastDayOfMonth = new Date(nextY, m + 1, 0).getDate();
  const dayClamped = Math.min(day, lastDayOfMonth);
  return new Date(nextY, m, dayClamped);
}
