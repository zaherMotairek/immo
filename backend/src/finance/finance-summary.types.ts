/** Snapshot mensuel — source unique (C7). Mois = UTC (Africa/Abidjan). */
export type FinanceMonthSnapshot = {
  year: number;
  month: number;
  expectedMonthlyRent: number;
  collectedThisMonth: number;
  /** max(0, expected − collected) */
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
  meta?: Record<string, string | number | null>;
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
