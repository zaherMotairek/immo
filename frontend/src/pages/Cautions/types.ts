export type DepositRow = {
  leaseId: string;
  active: boolean;
  monthlyRent: number;
  depositAmount: number;
  depositPaidAt: string;
  tenantFullName: string;
  buildingName: string;
  unitLabel: string;
  localizationLine: string;
};

export type CautionSortKey = 'date' | 'tenant' | 'local' | 'moisEquiv' | 'amount' | 'lease';
