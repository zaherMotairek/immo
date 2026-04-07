/** Jour d'échéance dans un mois donné (ex. 31 → dernier jour si besoin). */
export function rentDueDate(year: number, month1to12: number, rentDueDay: number): Date {
  const lastDay = new Date(year, month1to12, 0).getDate();
  const day = Math.min(Math.max(1, rentDueDay), lastDay);
  return new Date(Date.UTC(year, month1to12 - 1, day));
}

export function startOfTodayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}
