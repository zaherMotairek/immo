import type { PaymentRow } from '@/lib/paymentRow';
import type { TableSortDir } from '@/lib/tableSort';

export type PaymentSortKey = 'tenant' | 'place' | 'amount' | 'schedule' | 'status' | 'lease';

export type BuildingOpt = {
  id: string;
  name: string;
  units: { id: string; label: string; kind: string }[];
};

export type TenantOpt = { id: string; firstName: string; lastName: string };

/** Groupe d'échéances : [clé `AAAA-MM`, lignes triées]. */
export type MonthGroup = [string, PaymentRow[]];

export type PaymentStats = {
  total: number;
  aEncaisser: number;
  encaisse: number;
  retards: number;
  payees: number;
  partialLines: number;
};

export type CollectionTotal = { key: string; label: string; total: number };

export type LeaseFocusSummary = { tenant: string; place: string };

/** Met à jour l'URL (filtres) : `mutate` reçoit une copie des paramètres courants. */
export type UpdateParams = (mutate: (q: URLSearchParams) => void, replace?: boolean) => void;

export type PaymentSortState = {
  key: PaymentSortKey;
  dir: TableSortDir;
  onSort: (key: PaymentSortKey) => void;
};

export const MOIS_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tous les mois' },
  ...Array.from({ length: 12 }, (_, i) => {
    const label = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2000, i, 1));
    return { value: String(i + 1), label: label.charAt(0).toUpperCase() + label.slice(1) };
  }),
];

function paymentPlaceSortKey(p: PaymentRow) {
  const u = p.lease.unit;
  const b = u.building;
  return `${b.name} ${u.label} ${b.commune ?? ''} ${b.city ?? ''}`.trim();
}

export function comparePaymentRows(a: PaymentRow, b: PaymentRow, key: PaymentSortKey, dir: TableSortDir): number {
  const sign = dir === 'asc' ? 1 : -1;
  let c = 0;
  switch (key) {
    case 'tenant':
      c = `${a.lease.tenant.lastName} ${a.lease.tenant.firstName}`.localeCompare(
        `${b.lease.tenant.lastName} ${b.lease.tenant.firstName}`,
        'fr',
        { sensitivity: 'base' },
      );
      break;
    case 'place':
      c = paymentPlaceSortKey(a).localeCompare(paymentPlaceSortKey(b), 'fr', { sensitivity: 'base' });
      break;
    case 'amount':
      c = Number(a.amountDue) - Number(b.amountDue);
      break;
    case 'schedule':
      c = a.periodYear !== b.periodYear ? a.periodYear - b.periodYear : a.periodMonth - b.periodMonth;
      if (c === 0) c = a.dueDate.localeCompare(b.dueDate);
      break;
    case 'status':
      c = a.status.localeCompare(b.status);
      break;
    case 'lease':
      c = (a.leaseId ?? '').localeCompare(b.leaseId ?? '');
      break;
    default:
      c = 0;
  }
  if (c === 0) {
    c = a.dueDate.localeCompare(b.dueDate);
    if (c === 0) c = a.id.localeCompare(b.id);
  }
  return c * sign;
}

/** Surbrillance temporaire d'une ligne (retour depuis une fiche, lien `?focus=`). */
export function paymentRowFlash(active: boolean) {
  return active
    ? 'ring-2 ring-inset ring-brand-500/90 bg-brand-50/90 shadow-[0_0_0_1px_rgba(59,130,246,0.35)] dark:bg-brand-950/45 dark:ring-brand-400/80'
    : '';
}

/** Ligne actuellement ouverte dans le panneau de détail. */
export const paymentRowZoomedClass =
  'bg-brand-50/95 ring-1 ring-inset ring-brand-500/25 dark:bg-brand-950/40 dark:ring-brand-500/30';

export const paymentCheckboxClass =
  'size-4 cursor-pointer accent-[var(--color-brand-600)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600';

/** Props communes aux vues d'un mois (tableau desktop / liste de cartes mobile). */
export type PaymentsListProps = {
  items: PaymentRow[];
  monthLabel: string;
  selectedIds: string[];
  onToggle: (paymentId: string) => void;
  onToggleAll: (items: PaymentRow[], checked: boolean) => void;
  zoomPaymentId: string | null;
  flashPaymentRowId: string | null;
  onOpen: (paymentId: string) => void;
};
