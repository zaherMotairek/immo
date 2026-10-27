import { immeubleOnePerFloorMatch } from './buildingUtils';
import type { Building } from './types';

/** Indicateurs de la fiche bien (unités, loués / libres, surface, loyers, capacité déclarée). */
export function computeBuildingStats(b: Building | null) {
  if (!b?.units) return null;
  const total = b.units.length;
  const occupied = b.units.filter((u) => (u.leases?.length ?? 0) > 0).length;
  const vacant = Math.max(0, total - occupied);
  let surfaceSum = 0;
  let surfaceCount = 0;
  for (const u of b.units) {
    if (u.surfaceM2 == null) continue;
    const n = Number(u.surfaceM2);
    if (Number.isFinite(n) && n > 0) {
      surfaceSum += n;
      surfaceCount += 1;
    }
  }
  const surfaceLabel =
    surfaceCount > 0 ? `${Math.round(surfaceSum * 100) / 100} m²`.replace('.', ',') : '—';
  let monthlyRentTotal = 0;
  for (const u of b.units) {
    const lease = u.leases?.[0];
    if (lease == null || lease.monthlyRent == null) continue;
    const raw = lease.monthlyRent;
    const n = typeof raw === 'string' ? Number(raw) : Number(raw);
    if (Number.isFinite(n) && n >= 0) monthlyRentTotal += n;
  }

  const aptUnits = b.units.filter((u) => u.kind === 'APARTMENT').length;
  const locauxUnits = b.units.filter((u) => u.kind === 'WAREHOUSE' || u.kind === 'COMMERCIAL').length;

  let declaredCapacity: number | null = null;
  if (b.structureKind === 'IMMEUBLE' && b.apartmentCount != null && b.apartmentCount > 0) {
    declaredCapacity = b.apartmentCount;
  } else if (b.structureKind === 'TERRAIN_LOTS' && b.terrainLotCount != null && b.terrainLotCount > 0) {
    declaredCapacity = b.terrainLotCount;
  }
  const missingFromDeclared =
    declaredCapacity != null
      ? b.structureKind === 'IMMEUBLE'
        ? Math.max(0, declaredCapacity - aptUnits)
        : Math.max(0, declaredCapacity - total)
      : null;
  const overDeclared =
    declaredCapacity != null
      ? b.structureKind === 'IMMEUBLE'
        ? Math.max(0, aptUnits - declaredCapacity)
        : Math.max(0, total - declaredCapacity)
      : null;

  let unitsSub: string | undefined;
  if (declaredCapacity != null) {
    if (missingFromDeclared != null && missingFromDeclared > 0) {
      unitsSub =
        b.structureKind === 'TERRAIN_LOTS'
          ? `Lots déclarés : ${declaredCapacity}`
          : `Logements prévus : ${declaredCapacity} place${declaredCapacity !== 1 ? 's' : ''}`;
    } else if (overDeclared != null && overDeclared > 0) {
      unitsSub =
        b.structureKind === 'IMMEUBLE'
          ? `${overDeclared} appartement${overDeclared !== 1 ? 's' : ''} au-delà du nombre déclaré (${declaredCapacity} prévu${declaredCapacity !== 1 ? 's' : ''})`
          : `${overDeclared} unité${overDeclared !== 1 ? 's' : ''} au-delà du nombre déclaré (${declaredCapacity} prévu${declaredCapacity !== 1 ? 's' : ''})`;
    } else {
      const onePerEtage =
        b.structureKind === 'IMMEUBLE' && immeubleOnePerFloorMatch(b) ? ' · 1 app./étage' : '';
      unitsSub =
        b.structureKind === 'TERRAIN_LOTS'
          ? `Tous les lots déclarés sont créés (${declaredCapacity})`
          : `Tous les logements prévus sont créés (${declaredCapacity})${onePerEtage}`;
    }
  }
  if (b.structureKind === 'IMMEUBLE' && total > 0) {
    const br = `${aptUnits} logement${aptUnits !== 1 ? 's' : ''} · ${locauxUnits} entrepôt / commerce`;
    unitsSub = unitsSub != null ? `${br} — ${unitsSub}` : br;
  }

  return {
    total,
    occupied,
    vacant,
    surfaceLabel,
    surfaceCount,
    monthlyRentTotal,
    unitsSub,
    declaredCapacity,
    missingFromDeclared: declaredCapacity != null ? missingFromDeclared : null,
    structureKind: b.structureKind,
  };
}

export type BuildingStats = NonNullable<ReturnType<typeof computeBuildingStats>>;
