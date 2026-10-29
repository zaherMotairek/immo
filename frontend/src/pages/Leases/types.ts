import type { UnitKindCode } from '@/lib/unitKind';

/** Bien proposé dans le formulaire « nouveau bail » (avec ses unités). */
export type BuildingOpt = {
  id: string;
  name: string;
  structureKind?: string;
  floorCount?: number | null;
  apartmentCount?: number | null;
  terrainLotCount?: number | null;
  units: { id: string; label: string; kind: string; apartmentSlot?: number | null }[];
};

/** Ligne de la liste des baux (`GET /leases`). */
export type LeaseRow = {
  id: string;
  active: boolean;
  startDate: string;
  endDate: string | null;
  monthlyRent: unknown;
  rentDueDay: number;
  depositAmount?: unknown;
  depositPaidAt?: string | null;
  tenant: { id: string; firstName: string; lastName: string };
  unit: {
    id: string;
    label: string;
    kind: string;
    building: {
      id: string;
      name: string;
      commune: string;
      city: string;
      structureKind?: string;
    };
  };
  contractFileOriginalName?: string | null;
  contractFileMime?: string | null;
  contractFileSize?: number | null;
  contractFileKey?: string | null;
  contractUploadedAt?: string | null;
};

export type TenantOpt = { id: string; firstName: string; lastName: string };

export type StatusTab = 'active' | 'inactive' | 'all';

export type WellViewFilter = 'all' | UnitKindCode;

export type LeaseSortKey = 'building' | 'unit' | 'tenant' | 'rent' | 'start' | 'status';

export type DepositMonthsPreset = '0' | '1' | '2' | '3';

/** Résumé locataire / lieu affiché dans le bandeau « vue guidée » (lien `?leaseId=`). */
export type LeaseFocusSummary = { tenant: string; place: string };

/** Retour automatique vers la fiche bien après création du bail (lien depuis la fiche bien). */
export type ReturnToBuildingState = {
  buildingId: string;
  unitId?: string;
  hintUnitLabel?: string;
  returnLocation?: string;
};

/** Props communes aux deux vues de la liste (tableau desktop / cartes mobile). */
export type LeasesViewProps = {
  leases: LeaseRow[];
  genYear: string;
  flashLeaseRowId: string | null;
  /** Ouvre la fiche location (feuille par-dessus la liste). */
  onOpen: (leaseId: string) => void;
  onChanged: () => void;
  onGeneratePayments: (leaseId: string) => void;
  onToggleActive: (lease: LeaseRow) => void;
};

/** Clé de la valeur « option » du select locataire qui ouvre la création rapide. */
export const NEW_TENANT_OPTION_ID = '__create_new_tenant__';

/** Mode du formulaire d’ajout de bail. */
export type LeaseCreateMode = 'single' | 'bulk';

/** Ligne de la grille « plusieurs lots d’un coup ». */
export type BulkLeaseRow = {
  unitId: string;
  label: string;
  kind: string;
  apartmentSlot?: number | null;
  selected: boolean;
  tenantId: string;
  monthlyRent: string;
  startDate: string;
};
