import { addDaysUtc, addOneYearSameDay, rentDueDate, rentDueDateForBilledPeriod, startOfTodayUtc } from './date.util';

describe('date.util (caractérisation)', () => {
  it('rentDueDate clamp au dernier jour du mois (31 → 28/29 fév)', () => {
    const d = rentDueDate(2025, 2, 31);
    expect(d.toISOString()).toBe('2025-02-28T00:00:00.000Z');
  });

  it('rentDueDateForBilledPeriod = même mois que la période facturée', () => {
    const d = rentDueDateForBilledPeriod(2026, 5, 1);
    expect(d.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('startOfTodayUtc est à minuit UTC', () => {
    const t = startOfTodayUtc();
    expect(t.getUTCHours()).toBe(0);
    expect(t.getUTCMinutes()).toBe(0);
    expect(t.getUTCSeconds()).toBe(0);
    expect(t.getUTCMilliseconds()).toBe(0);
  });

  it('addDaysUtc ajoute des jours calendaires UTC', () => {
    const a = new Date(Date.UTC(2026, 0, 31));
    expect(addDaysUtc(a, 1).toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });

  it('addOneYearSameDay (comportement local Date — documenté)', () => {
    const d = new Date(2024, 1, 29); // 29 fév 2024 local
    const next = addOneYearSameDay(d);
    expect(next.getFullYear()).toBe(2025);
    expect(next.getMonth()).toBe(1);
    // Année non bissextile → clamp 28
    expect(next.getDate()).toBe(28);
  });
});
