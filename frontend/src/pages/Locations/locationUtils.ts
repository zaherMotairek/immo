import type { TableSortDir } from '@/lib/tableSort';
import type { LocationSortKey, OverviewRow, PaymentScheduleRow, ScheduleSortKey } from './types';

export function hrefBiensUnit(
  buildingId: string,
  unitId: string,
  unitLabel: string,
  returnLocation: string,
) {
  const q = new URLSearchParams({
    unitId,
    hintUnitLabel: unitLabel,
    returnLocation,
  });
  return `/biens/${buildingId}?${q.toString()}`;
}

/** Mappe le libellé FR API vers une clé StatusBadge (sinon texte brut). */
export function statusKeyFromFr(fr: string): string {
  switch (fr.trim()) {
    case 'Payé':
      return 'PAID';
    case 'En retard':
      return 'LATE';
    case 'Annulé':
      return 'CANCELLED';
    case 'Loyer offert':
    case 'Abandonné':
      return 'WAIVED';
    case 'Impayé':
    case 'En attente':
    case 'À venir':
      return 'PENDING';
    default:
      return fr;
  }
}

export function compareLocationRows(
  a: OverviewRow,
  b: OverviewRow,
  key: LocationSortKey,
  dir: TableSortDir,
): number {
  const sign = dir === 'asc' ? 1 : -1;
  let c = 0;
  switch (key) {
    case 'place':
      c = a.localizationLine.localeCompare(b.localizationLine, 'fr', { sensitivity: 'base' });
      break;
    case 'buildingUnit':
      c = a.buildingName.localeCompare(b.buildingName, 'fr', { sensitivity: 'base' });
      if (c === 0) c = a.unitLabel.localeCompare(b.unitLabel, 'fr', { numeric: true });
      break;
    case 'tenant':
      c = a.tenantFullName.localeCompare(b.tenantFullName, 'fr', { sensitivity: 'base' });
      break;
    case 'rent':
      c = a.monthlyRent - b.monthlyRent;
      break;
    case 'dueDay':
      c = a.rentDueDay - b.rentDueDay;
      break;
    case 'status':
      c = a.currentMonthStatusFr.localeCompare(b.currentMonthStatusFr, 'fr', { sensitivity: 'base' });
      break;
    case 'active': {
      const av = a.active ? 1 : 0;
      const bv = b.active ? 1 : 0;
      c = av - bv;
      if (c === 0) c = a.tenantFullName.localeCompare(b.tenantFullName, 'fr', { sensitivity: 'base' });
      break;
    }
    default:
      c = 0;
  }
  return c * sign;
}

export const locationSortThBase =
  'min-w-0 whitespace-normal px-2 py-2.5 leading-tight sm:whitespace-nowrap sm:px-4 sm:py-2.5 lg:px-5';

export function rowFlashClass(active: boolean) {
  return active
    ? 'ring-2 ring-inset ring-brand-500/90 bg-brand-50/90 shadow-[0_0_0_1px_rgba(59,130,246,0.35)] dark:bg-brand-950/45 dark:ring-brand-400/80'
    : '';
}

export function isoDateFromUnknown(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return iso[0];
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!fr) return null;
  const dd = Number(fr[1]);
  const mm = Number(fr[2]);
  const yyyy = Number(fr[3]);
  if (!Number.isInteger(dd) || !Number.isInteger(mm) || !Number.isInteger(yyyy)) return null;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) return null;
  const candidate = `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const d = new Date(`${candidate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const normalized = d.toISOString().slice(0, 10);
  return normalized === candidate ? candidate : null;
}

export function compareScheduleRows(
  a: PaymentScheduleRow,
  b: PaymentScheduleRow,
  key: ScheduleSortKey,
  dir: TableSortDir,
): number {
  const sign = dir === 'asc' ? 1 : -1;
  let c = 0;
  switch (key) {
    case 'period':
      c = a.periodYear !== b.periodYear ? a.periodYear - b.periodYear : a.periodMonth - b.periodMonth;
      break;
    case 'amount':
      c = a.amountDue - b.amountDue;
      break;
    case 'status':
      c = a.status.localeCompare(b.status);
      break;
    default:
      c = 0;
  }
  if (c === 0) c = a.dueDate.localeCompare(b.dueDate);
  if (c === 0) c = a.id.localeCompare(b.id);
  return c * sign;
}
