import type { BuildingStructureValue } from '@/lib/buildingStructure';

export type Unit = {
  id: string;
  label: string;
  kind?: string;
  floor: number | null;
  apartmentSlot?: number | null;
  locauxSlot?: number | null;
  surfaceM2: unknown;
  rooms: number | null;
  description?: string | null;
  leases?: Array<{
    id: string;
    monthlyRent?: unknown;
    tenant: { firstName: string; lastName: string };
  }>;
};

export type Building = {
  id: string;
  name: string;
  city: string;
  commune: string | null;
  address: string | null;
  postalCode: string | null;
  country: string;
  structureKind: BuildingStructureValue;
  floorCount?: number | null;
  hasRezDeChaussee?: boolean | null;
  apartmentCount?: number | null;
  /** Même nombre de logements d’habitation sur chaque étage ≥ 1 (null = numérotation globale). */
  apartmentsPerFloor?: number | null;
  rezApartmentCount?: number | null;
  locauxSlotCount?: number | null;
  terrainLotCount?: number | null;
  units: Unit[];
};

export type BulkUnitRow = {
  kind: string;
  floor: string;
  slot: string;
};

export type UnitTableSortKey = 'label' | 'kind' | 'floor' | 'surface' | 'rooms' | 'tenant' | 'rent' | 'status';

export type UnitListFilter = 'all' | 'vacant' | 'occupied';

export type UnitDraft = { surfaceM2: string; rooms: string };
