import { useMemo } from 'react';
import { computeBuildingStats } from './buildingStats';
import {
  apartmentCapacityOnFloor,
  immeubleGridLayout,
  immeubleOnePerFloorMatch,
} from './buildingUtils';
import type { Building } from './types';

/**
 * Dérivés purs du bien chargé : numéros / étages déjà pris, capacité déclarée, étages disponibles.
 * (Aucun état : tout se recalcule à partir de `b`.)
 */
export function useBuildingLayout(b: Building | null) {
  const immeubleLocked = b?.structureKind === 'IMMEUBLE' || b?.structureKind === 'TERRAIN_LOTS';

  const immeubleFloorPickerActive =
    !!b && b.structureKind === 'IMMEUBLE' && b.floorCount != null && b.floorCount > 0;

  const immeubleSlotPickerActive = immeubleFloorPickerActive && (b?.apartmentCount ?? 0) > 0;

  const terrainPlanActive =
    !!b && b.structureKind === 'TERRAIN_LOTS' && b.terrainLotCount != null && b.terrainLotCount > 0;

  const terrainLotsFull =
    terrainPlanActive && b!.terrainLotCount != null && b!.units.length >= b!.terrainLotCount;

  const terrainLotRecap = useMemo(() => {
    if (!b || b.structureKind !== 'TERRAIN_LOTS' || b.terrainLotCount == null || b.terrainLotCount <= 0) {
      return null;
    }
    const n = b.terrainLotCount;
    const created = b.units.length;
    const free = Math.max(0, n - created);
    return { n, created, free };
  }, [b]);

  const usedApartmentSlots = useMemo(() => {
    if (!b?.units?.length) return new Set<number>();
    const s = new Set<number>();
    for (const u of b.units) {
      if (u.kind === 'APARTMENT' && u.apartmentSlot != null) s.add(u.apartmentSlot);
    }
    return s;
  }, [b?.units]);

  /** Immeuble grille : numéros de logement pris par étage (étage → ensemble de n°). */
  const usedApartmentSlotsByFloor = useMemo(() => {
    const m = new Map<number, Set<number>>();
    if (!b?.units?.length) return m;
    for (const u of b.units) {
      if (u.kind !== 'APARTMENT' || u.apartmentSlot == null || u.floor == null) continue;
      let set = m.get(u.floor);
      if (!set) {
        set = new Set<number>();
        m.set(u.floor, set);
      }
      set.add(u.apartmentSlot);
    }
    return m;
  }, [b?.units]);

  const usedLocauxSlots = useMemo(() => {
    if (!b?.units?.length) return new Set<number>();
    const s = new Set<number>();
    for (const u of b.units) {
      if ((u.kind === 'WAREHOUSE' || u.kind === 'COMMERCIAL') && u.locauxSlot != null) {
        s.add(u.locauxSlot);
      }
    }
    return s;
  }, [b?.units]);

  /** Plage du menu numéro local (entrepôt / commerce) : sans plafond en base, on propose toujours de la marge. */
  const locauxSlotOptionsCount = useMemo(() => {
    const maxUsed = usedLocauxSlots.size === 0 ? 0 : Math.max(...Array.from(usedLocauxSlots));
    return Math.max(maxUsed + 5, 5);
  }, [usedLocauxSlots]);

  const rdcHabitationUnitsCreated = useMemo(() => {
    if (!b?.units?.length) return 0;
    return b.units.filter((u) => u.kind === 'APARTMENT' && u.floor === 0).length;
  }, [b?.units]);

  const rdcLocauxUnitsCreated = useMemo(() => {
    if (!b?.units?.length) return 0;
    return b.units.filter(
      (u) => (u.kind === 'WAREHOUSE' || u.kind === 'COMMERCIAL') && u.floor === 0,
    ).length;
  }, [b?.units]);

  const immeubleOnePerFloorLayout = useMemo(
    () => !!b && b.structureKind === 'IMMEUBLE' && immeubleOnePerFloorMatch(b),
    [b],
  );

  const immeubleGridLayoutMemo = useMemo(() => !!b && immeubleGridLayout(b), [b]);

  const availableImmeubleFloors = useMemo(() => {
    if (!b?.floorCount) return [];
    const fc = b.floorCount;
    const all = [0, ...Array.from({ length: fc }, (_, i) => i + 1)];
    const base = b.hasRezDeChaussee === false ? all.filter((f) => f !== 0) : all;
    if (immeubleGridLayoutMemo) {
      return base.filter((f) => {
        const cap = apartmentCapacityOnFloor(b, f);
        if (!Number.isFinite(cap) || cap <= 0) return false;
        const n = (b.units ?? []).filter((u) => u.kind === 'APARTMENT' && u.floor === f).length;
        return n < cap;
      });
    }
    if (!immeubleOnePerFloorLayout) return base;
    const taken = new Set<number>();
    for (const u of b.units ?? []) {
      if (u.kind === 'APARTMENT' && u.floor != null) taken.add(u.floor);
    }
    return base.filter((f) => !taken.has(f));
  }, [b, immeubleOnePerFloorLayout, immeubleGridLayoutMemo]);

  /** Appartements : pas de RDC dans la liste tant qu’aucun créneau appartement au RDC n’est déclaré. */
  const availableApartmentFloors = useMemo(() => {
    const floors = availableImmeubleFloors;
    const rez = b?.rezApartmentCount ?? 0;
    if (rez <= 0) return floors.filter((f) => f !== 0);
    return floors;
  }, [availableImmeubleFloors, b?.rezApartmentCount]);

  const immeubleFloorsWhComm = useMemo(() => {
    if (!b?.floorCount) return [];
    const fc = b.floorCount;
    const all = [0, ...Array.from({ length: fc }, (_, i) => i + 1)];
    return b.hasRezDeChaussee === false ? all.filter((f) => f !== 0) : all;
  }, [b]);

  /** Entrepôt / commerce : uniquement le rez-de-chaussée (étage 0). */
  const immeubleFloorsEntrepotCommerce = useMemo(() => {
    if (!b?.floorCount) return [];
    if (b.hasRezDeChaussee === false) return [];
    return [0];
  }, [b]);

  const buildingStats = useMemo(() => computeBuildingStats(b), [b]);

  return {
    buildingStats,
    immeubleLocked,
    immeubleFloorPickerActive,
    immeubleSlotPickerActive,
    terrainPlanActive,
    terrainLotsFull,
    terrainLotRecap,
    usedApartmentSlots,
    usedApartmentSlotsByFloor,
    usedLocauxSlots,
    locauxSlotOptionsCount,
    rdcHabitationUnitsCreated,
    rdcLocauxUnitsCreated,
    immeubleOnePerFloorLayout,
    availableImmeubleFloors,
    availableApartmentFloors,
    immeubleFloorsWhComm,
    immeubleFloorsEntrepotCommerce,
  };
}

export type BuildingLayout = ReturnType<typeof useBuildingLayout>;
