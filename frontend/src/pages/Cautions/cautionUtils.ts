import type { TableSortDir } from '@/lib/tableSort';
import type { CautionSortKey, DepositRow } from './types';

export function cautionMoisLabel(monthlyRent: number, depositAmount: number): string {
  if (monthlyRent <= 0 || depositAmount <= 0) return '—';
  const m = depositAmount / monthlyRent;
  const entier = Math.round(m);
  if (Math.abs(m - entier) < 0.051) {
    return `${entier} mois`;
  }
  return `${Number(m.toFixed(1)).toLocaleString('fr-FR')} mois`;
}

export function cautionMoisRatio(monthlyRent: number, depositAmount: number): number {
  if (monthlyRent <= 0 || depositAmount <= 0) return -1;
  return depositAmount / monthlyRent;
}

export function cautionRowFlash(active: boolean): string {
  return active
    ? 'ring-2 ring-inset ring-brand-500/90 bg-brand-50/90 shadow-[0_0_0_1px_rgba(59,130,246,0.35)] dark:bg-brand-950/45 dark:ring-brand-400/80'
    : '';
}

export function compareCautionRows(a: DepositRow, b: DepositRow, key: CautionSortKey, dir: TableSortDir): number {
  const sign = dir === 'asc' ? 1 : -1;
  let c = 0;
  switch (key) {
    case 'date':
      c = a.depositPaidAt.localeCompare(b.depositPaidAt);
      break;
    case 'tenant':
      c = a.tenantFullName.localeCompare(b.tenantFullName, 'fr', { sensitivity: 'base' });
      break;
    case 'local':
      c = `${a.localizationLine} ${a.buildingName} ${a.unitLabel}`
        .trim()
        .localeCompare(`${b.localizationLine} ${b.buildingName} ${b.unitLabel}`.trim(), 'fr', { sensitivity: 'base' });
      break;
    case 'moisEquiv':
      c = cautionMoisRatio(a.monthlyRent, a.depositAmount) - cautionMoisRatio(b.monthlyRent, b.depositAmount);
      break;
    case 'amount':
      c = a.depositAmount - b.depositAmount;
      break;
    case 'lease':
      c = a.leaseId.localeCompare(b.leaseId);
      break;
    default:
      c = 0;
  }
  if (c === 0) c = a.leaseId.localeCompare(b.leaseId);
  return c * sign;
}
