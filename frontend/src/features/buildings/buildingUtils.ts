import type { TableSortDir } from '@/lib/tableSort';
import { unitKindLabel } from '@/lib/unitKind';
import type { Building, Unit, UnitTableSortKey } from './types';

export const ORG_SECTION_HINT =
  'Immeuble ou terrain multi locataires : plusieurs unités et plusieurs baux sur ce même bien. Un seul lot : une seule unité (villa, parcelle unique, hangar en bloc, etc.).';

export const UNIT_SECTION_HINT =
  'Pour chaque lot ou local : choisissez d’abord la nature (appartement, maison, bureau, entrepôt, commerce, terrain…), puis l’emplacement (étage, n° de lot). Un même immeuble peut mélanger plusieurs types.';

export const IMMEUBLE_LOGEMENT_BADGE_HINT =
  'Ce nombre compte uniquement les logements d’habitation (numéros 1…N). Les entrepôts et commerces au RDC sont des unités à part : chacun a son numéro de local et ne diminue pas ce total.';

export function unitIsOccupied(u: Unit) {
  return (u.leases?.length ?? 0) > 0;
}

function surfaceSortValue(u: Unit): number | null {
  const n = Number(u.surfaceM2);
  return Number.isFinite(n) ? n : null;
}

function rentSortValue(u: Unit): number | null {
  const raw = u.leases?.[0]?.monthlyRent;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function compareUnitTableRows(a: Unit, b: Unit, key: UnitTableSortKey, dir: TableSortDir): number {
  const sign = dir === 'asc' ? 1 : -1;
  let c = 0;
  switch (key) {
    case 'label':
      c = a.label.localeCompare(b.label, 'fr', { numeric: true, sensitivity: 'base' });
      break;
    case 'kind':
      c = unitKindLabel(a.kind ?? 'APARTMENT').localeCompare(unitKindLabel(b.kind ?? 'APARTMENT'), 'fr', {
        sensitivity: 'base',
      });
      break;
    case 'floor': {
      const fa = a.floor ?? 10_000;
      const fb = b.floor ?? 10_000;
      c = fa - fb;
      if (c === 0) {
        const sa = (a.apartmentSlot ?? a.locauxSlot) ?? 10_000;
        const sb = (b.apartmentSlot ?? b.locauxSlot) ?? 10_000;
        c = sa - sb;
      }
      if (c === 0) c = a.label.localeCompare(b.label, 'fr', { numeric: true, sensitivity: 'base' });
      break;
    }
    case 'surface': {
      const na = surfaceSortValue(a);
      const nb = surfaceSortValue(b);
      if (na == null && nb == null) c = 0;
      else if (na == null) c = 1;
      else if (nb == null) c = -1;
      else c = na - nb;
      break;
    }
    case 'rooms': {
      const ra = a.rooms;
      const rb = b.rooms;
      if (ra == null && rb == null) c = 0;
      else if (ra == null) c = 1;
      else if (rb == null) c = -1;
      else c = ra - rb;
      break;
    }
    case 'tenant': {
      const ta = a.leases?.[0]?.tenant;
      const tb = b.leases?.[0]?.tenant;
      const sa = ta ? `${ta.lastName} ${ta.firstName}`.trim() : '';
      const sb = tb ? `${tb.lastName} ${tb.firstName}`.trim() : '';
      c = sa.localeCompare(sb, 'fr', { sensitivity: 'base' });
      break;
    }
    case 'rent': {
      const na = rentSortValue(a);
      const nb = rentSortValue(b);
      if (na == null && nb == null) c = 0;
      else if (na == null) c = 1;
      else if (nb == null) c = -1;
      else c = na - nb;
      break;
    }
    case 'status': {
      c = (unitIsOccupied(a) ? 1 : 0) - (unitIsOccupied(b) ? 1 : 0);
      break;
    }
    default:
      c = 0;
  }
  if (c === 0) c = a.id.localeCompare(b.id);
  return c * sign;
}

/** Petit libellé au-dessus du nom : « Appart. n° 3 », « Entrepôt n° 1 », « Unité »… */
export function unitSlotCaption(u: Unit): string {
  return u.locauxSlot != null
    ? `${u.kind === 'WAREHOUSE' ? 'Entrepôt' : 'Commerce'} n° ${u.locauxSlot}`
    : u.apartmentSlot != null
      ? `Appart. n° ${u.apartmentSlot}`
      : 'Unité';
}

export function floorLabel(floor: number | null) {
  if (floor == null) return null;
  return floor === 0 ? 'RDC' : `Étage ${floor}`;
}

export function immeubleOnePerFloorMatch(b: Building): boolean {
  if (
    b.structureKind !== 'IMMEUBLE' ||
    b.floorCount == null ||
    b.apartmentCount == null ||
    b.floorCount <= 0 ||
    (b.apartmentsPerFloor != null && b.apartmentsPerFloor > 0)
  ) {
    return false;
  }
  const fc = b.floorCount;
  const ac = b.apartmentCount;
  if (b.hasRezDeChaussee === false) return ac === fc;
  if (b.hasRezDeChaussee === true) return ac === fc + 1;
  return ac === fc;
}

export function immeubleGridLayout(b: Building): boolean {
  return (
    b.structureKind === 'IMMEUBLE' &&
    b.apartmentsPerFloor != null &&
    b.apartmentsPerFloor > 0 &&
    b.floorCount != null &&
    b.floorCount > 0
  );
}

export function apartmentCapacityOnFloor(b: Building, floor: number): number {
  if (floor === 0) return b.rezApartmentCount ?? 0;
  if (immeubleGridLayout(b)) return b.apartmentsPerFloor ?? 0;
  return Number.POSITIVE_INFINITY;
}

export function parseOptionalInt(raw: string): { ok: true; value: number | null } | { ok: false } {
  const t = raw.trim();
  if (t === '') return { ok: true, value: null };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return { ok: false };
  return { ok: true, value: Math.floor(n) };
}

