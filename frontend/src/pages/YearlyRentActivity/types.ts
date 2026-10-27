import type { PaymentRow } from '@/lib/paymentRow';

export type BuildingOpt = { id: string; name: string };
export type TenantOpt = { id: string; firstName: string; lastName: string };

export type LeaseRowModel = {
  key: string;
  label: string;
  sub: string;
  byMonth: Map<number, PaymentRow>;
};

export type YearlyLeaseSortKey = 'label' | 'sub';

export type CellBlock = {
  statusText: string;
  className: string;
  title: string;
  /** Ligne(s) montant sous le badge (vide si pas d’échéance). */
  amountLines: string[];
};
