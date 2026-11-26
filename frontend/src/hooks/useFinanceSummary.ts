import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type FinanceMonthSnapshot = {
  year: number;
  month: number;
  expectedMonthlyRent: number;
  collectedThisMonth: number;
  remainingVsExpected: number;
  overdueCount: number;
  overdueAmount: number;
  depositsCollectedThisMonth: number;
  buildings: number;
  units: number;
  tenants: number;
};

export type TodayAgendaItem = {
  kind: 'remind' | 'late' | 'lease_ending' | 'collector_validate' | 'deposit_pending';
  id: string;
  title: string;
  subtitle: string;
  amount: number | null;
  href: string;
};

export type TodayAgenda = {
  asOf: string;
  lateDaysThreshold: number;
  leaseEndingDays: number;
  items: TodayAgendaItem[];
  counts: {
    remind: number;
    late: number;
    leaseEnding: number;
    collectorValidate: number;
    depositPending: number;
  };
};

/** Hook C7 : snapshot mensuel unique (même source que le dashboard). */
export function useFinanceSummary(year?: number, month?: number) {
  const [data, setData] = useState<FinanceMonthSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const q = new URLSearchParams();
    if (year != null) q.set('year', String(year));
    if (month != null) q.set('month', String(month));
    const qs = q.toString();
    api<FinanceMonthSnapshot>(`/finance/summary${qs ? `?${qs}` : ''}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load };
}

export function useTodayAgenda() {
  const [data, setData] = useState<TodayAgenda | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<TodayAgenda>('/finance/today')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load };
}
