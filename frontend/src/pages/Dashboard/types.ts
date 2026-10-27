import type { CollectionTaskSummary } from '@/lib/paymentRow';
import type { TableSortDir } from '@/lib/tableSort';

export type DashboardPaymentAlert = {
  paymentId: string;
  leaseId: string;
  tenantId: string;
  tenantFirstName: string;
  tenantEmail: string | null;
  tenantPhone: string | null;
  dueDate: string;
  amountDue: number;
  amountPaid?: number;
  amountRemaining?: number;
  status: string;
  period: string;
  tenant: string;
  unit?: string;
  unitKind?: string;
  building?: string;
  commune?: string;
  city?: string;
  collectionTask?: CollectionTaskSummary | null;
};

export type Overview = {
  kpis: {
    buildings: number;
    units: number;
    tenants: number;
    expectedMonthlyRent: number;
    collectedThisMonth: number;
    depositsCollectedThisMonth: number;
    overdueCount: number;
    overdueAmount: number;
  };
  alerts: DashboardPaymentAlert[];
  upcomingCollections?: {
    count: number;
    totalRemaining: number;
    windowStart: string;
    windowEnd: string;
    /** Détail des échéances PENDING dans la fenêtre aujourd’hui…+2 jours (reste &gt; 0). */
    items?: DashboardPaymentAlert[];
  };
};

export type UpcomingSortKey = 'tenant' | 'place' | 'remaining' | 'due' | 'status';

/** Lien interne stylé comme un bouton secondaire du kit (cible tactile ≥ 40 px). */
export const dashboardLinkButtonClass =
  'odoo-btn-secondary inline-flex min-h-10 items-center justify-center rounded-[var(--radius-input)] px-4 py-2 text-sm font-medium no-underline transition-colors duration-[var(--duration-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600';

export function formatEncaissementWindowFr(startIso: string, endIso: string) {
  const s = new Date(`${startIso}T12:00:00`);
  const e = new Date(`${endIso}T12:00:00`);
  const d1 = s.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const d2 = e.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `${d1} → ${d2}`;
}

/** Texte du type « Aujourd'hui », « Demain », « Dans 2 jours » selon l’échéance (fuseau local). */
export function relativeDueDayFr(dueIso: string): string {
  const d = dueIso.slice(0, 10);
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${day}`;
  const t0 = new Date(`${todayStr}T12:00:00`).getTime();
  const t1 = new Date(`${d}T12:00:00`).getTime();
  const diffDays = Math.round((t1 - t0) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';
  if (diffDays === 2) return 'Dans 2 jours';
  return new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Liste de locataires pour la phrase d’intro (« …loyers de X et Y »). */
export function formatUpcomingLoyersPhrase(items: DashboardPaymentAlert[]): string {
  const names = items.map((i) => i.tenant?.trim() || 'Locataire');
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} et ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} et ${names[2]}`;
  const n = names.length - 3;
  return `${names[0]}, ${names[1]}, ${names[2]} et ${n} autre${n > 1 ? 's' : ''}`;
}

export function alertRemaining(a: DashboardPaymentAlert) {
  return a.amountRemaining ?? a.amountDue;
}

export function dashboardAlertOverdue(a: DashboardPaymentAlert) {
  if (a.status === 'LATE') return true;
  if (a.status !== 'PENDING') return false;
  const d = typeof a.dueDate === 'string' ? a.dueDate.slice(0, 10) : '';
  const today = new Date().toISOString().slice(0, 10);
  return d < today;
}

export function compareUpcomingRows(
  a: DashboardPaymentAlert,
  b: DashboardPaymentAlert,
  key: UpcomingSortKey,
  dir: TableSortDir,
): number {
  const sign = dir === 'asc' ? 1 : -1;
  let c = 0;
  switch (key) {
    case 'tenant':
      c = (a.tenant || '').localeCompare(b.tenant || '', 'fr', { sensitivity: 'base' });
      break;
    case 'place':
      c = `${a.building ?? ''} ${a.unit ?? ''} ${a.commune ?? ''} ${a.city ?? ''}`
        .trim()
        .localeCompare(`${b.building ?? ''} ${b.unit ?? ''} ${b.commune ?? ''} ${b.city ?? ''}`.trim(), 'fr', {
          sensitivity: 'base',
        });
      break;
    case 'remaining':
      c = alertRemaining(a) - alertRemaining(b);
      break;
    case 'due':
      c = a.dueDate.localeCompare(b.dueDate);
      if (c === 0) c = a.period.localeCompare(b.period);
      break;
    case 'status':
      c = a.status.localeCompare(b.status);
      break;
    default:
      c = 0;
  }
  if (c === 0) c = a.paymentId.localeCompare(b.paymentId);
  return c * sign;
}
