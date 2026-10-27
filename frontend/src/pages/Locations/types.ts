import type { TableSortDir } from '@/lib/tableSort';

export type OverviewRow = {
  leaseId: string;
  active: boolean;
  tenantId: string;
  buildingId: string;
  unitId: string;
  localizationLine: string;
  buildingName: string;
  unitLabel: string;
  unitKind: string;
  tenantFullName: string;
  monthlyRent: number;
  rentDueDay: number;
  currentMonthStatusFr: string;
};

export type LocationSortKey = 'place' | 'buildingUnit' | 'tenant' | 'rent' | 'dueDay' | 'status' | 'active';

export type LocationSortState = {
  key: LocationSortKey;
  dir: TableSortDir;
  onSort: (key: LocationSortKey) => void;
};

export type Fiche = {
  leaseId: string;
  active: boolean;
  startDate: string;
  endDate: string | null;
  localization: {
    city: string;
    commune: string;
    address: string | null;
    postalCode: string | null;
    country: string;
    shortLabel: string;
  };
  property: {
    buildingName: string;
    buildingId: string;
    unitId: string;
    unitLabel: string;
    kind: string;
    floor: number | null;
    rooms: number | null;
    surfaceM2: number | null;
    description: string | null;
    notes: string | null;
  };
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string | null;
    email: string | null;
  };
  financial: {
    monthlyRent: number;
    rentDueDay: number;
    depositAmount: number | null;
    depositPaidAt: string | null;
    currentPeriodYear: number;
    currentPeriodMonth: number;
    currentPaymentStatus?: string | null;
    currentPaymentStatusFr: string;
    currentPaymentDueDate: string | null;
  };
  /** Dernières échéances du bail (ordre chronologique). */
  paymentSchedule?: Array<{
    id: string;
    periodYear: number;
    periodMonth: number;
    dueDate: string;
    amountDue: number;
    amountPaid: number | null;
    status: string;
    statusFr: string;
    waiveReason: string | null;
    waivedAt: string | null;
  }>;
  contract: {
    fileName: string | null;
    mimeType: string | null;
    size: number | null;
    uploadedAt: string | null;
  } | null;
};

export type PaymentScheduleRow = NonNullable<Fiche['paymentSchedule']>[number];

export type ScheduleSortKey = 'period' | 'amount' | 'status';
