export type AdminOrgUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  deactivated?: boolean;
  createdAt?: string;
};

export type AdminOrgRow = {
  id: string;
  name: string | null;
  createdAt: string;
  planCode: string;
  planName: string;
  status: string;
  statusLabel: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  platformAccessPaidUntil: string | null;
  platformAccessSuspended: boolean;
  lastLoginAt: string | null;
  unitsUsed: number;
  unitLimit: number | null;
  userCount: number;
  buildingCount: number;
  tenantCount: number;
  users: AdminOrgUser[];
};

export function orgAccessStatus(o: AdminOrgRow): 'suspended' | 'expired' | 'active' {
  if (o.platformAccessSuspended) return 'suspended';
  if (o.status === 'EXPIRED' || o.status === 'SUSPENDED') return 'expired';
  if (o.platformAccessPaidUntil && new Date().toISOString().slice(0, 10) > o.platformAccessPaidUntil) {
    return 'expired';
  }
  return 'active';
}

export type AdminDashboard = {
  monthlyRevenueFcfa: number;
  monthlyPaymentCount: number;
  clientCount: number;
  newSignupsThisMonth: number;
  expiringIn7Days: Array<{ id: string; name: string | null; endsAt: string | null }>;
  trialsEndingIn3Days: Array<{ id: string; name: string | null; trialEndsAt: string | null }>;
  inactive14Days: Array<{ id: string; name: string | null; lastLoginAt: string | null }>;
};

export type AdminOrgDetail = AdminOrgRow & {
  monthlyPriceFcfa: number;
  internalNotes: string | null;
  userLimit: number | null;
  activity: {
    buildingCount: number;
    unitCount: number;
    tenantCount: number;
    leaseCount: number;
    paymentCount: number;
    remindersSent: number;
    lastLoginAt: string | null;
  };
  payments: Array<{
    id: string;
    amountFcfa: number;
    method: string;
    reference: string | null;
    paidAt: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    note: string | null;
    createdAt: string;
  }>;
  planChanges: Array<{
    id: string;
    fromPlanCode: string | null;
    toPlanCode: string;
    note: string | null;
    createdAt: string;
  }>;
};

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-[var(--status-paid-bg)] text-[var(--status-paid)]';
    case 'EXPIRING_SOON':
    case 'TRIAL':
      return 'bg-[var(--status-pending-bg,theme(colors.amber.100))] text-amber-800';
    case 'EXPIRED':
    case 'SUSPENDED':
      return 'bg-[var(--status-late-bg)] text-[var(--status-late)]';
    default:
      return 'bg-[var(--odoo-table-head-bg)] text-[var(--color-muted)]';
  }
}
