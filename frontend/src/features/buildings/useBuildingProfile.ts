import { useState } from 'react';
import { api } from '@/lib/api';
import { parseOptionalInt } from './buildingUtils';
import type { Building } from './types';
import type { BuildingProfileDrafts } from './useBuildingProfileDrafts';

type Options = {
  id: string | undefined;
  b: Building | null;
  immeubleLocked: boolean;
  drafts: BuildingProfileDrafts;
  load: (opts?: { silent?: boolean }) => Promise<void>;
};

/** Onglet « Organisation » : validation, enregistrement (`PATCH /buildings/:id`), état « modifié » et annulation. */
export function useBuildingProfile({ id, b, immeubleLocked, drafts, load }: Options) {
  const {
    structureKindDraft,
    floorCountDraft,
    hasRezDeChausseeDraft,
    apartmentCountDraft,
    apartmentsPerFloorDraft,
    rezApartmentCountDraft,
    terrainLotCountDraft,
  } = drafts;
  const [structureErr, setStructureErr] = useState<string | null>(null);
  const [structureSaving, setStructureSaving] = useState(false);

  async function saveBuildingProfile(e?: React.FormEvent) {
    e?.preventDefault();
    if (!id) return;
    setStructureErr(null);
    const fc = parseOptionalInt(floorCountDraft);
    const ac = parseOptionalInt(apartmentCountDraft);
    const pf = parseOptionalInt(apartmentsPerFloorDraft);
    const rac = parseOptionalInt(rezApartmentCountDraft);
    const tlc = parseOptionalInt(terrainLotCountDraft);
    const immeubleOrgShape = immeubleLocked
      ? b!.structureKind === 'IMMEUBLE'
      : structureKindDraft === 'IMMEUBLE';
    const terrainLotsShape = immeubleLocked
      ? b!.structureKind === 'TERRAIN_LOTS'
      : structureKindDraft === 'TERRAIN_LOTS';
    if (immeubleOrgShape && (!fc.ok || !pf.ok || !rac.ok)) {
      setStructureErr(
        'Nombre d’étages et totaux (logements par étage, RDC) doivent être des entiers positifs ou vides.',
      );
      return;
    }
    const usePerFloorGrid = immeubleOrgShape && pf.ok && pf.value != null && pf.value > 0;
    if (immeubleOrgShape && usePerFloorGrid) {
      if (!fc.ok || fc.value == null || fc.value < 1) {
        setStructureErr(
          'Avec des logements par étage, indiquez au moins un étage au-dessus du rez-de-chaussée.',
        );
        return;
      }
    }
    if (immeubleOrgShape && !usePerFloorGrid && (!fc.ok || !ac.ok || !rac.ok)) {
      setStructureErr(
        'Nombre d’étages et totaux (logements, RDC) doivent être des entiers positifs ou vides.',
      );
      return;
    }
    if (
      immeubleOrgShape &&
      !usePerFloorGrid &&
      hasRezDeChausseeDraft &&
      rac.ok &&
      rac.value != null &&
      ac.ok &&
      ac.value != null &&
      rac.value > ac.value
    ) {
      setStructureErr('Le nombre d’unités au rez-de-chaussée ne peut pas dépasser le total des logements déclaré pour ce bien.');
      return;
    }
    if (terrainLotsShape && !tlc.ok) {
      setStructureErr('Le nombre de lots doit être un entier positif ou vide.');
      return;
    }
    setStructureSaving(true);
    try {
      const json: Record<string, unknown> = {
        structureKind: immeubleLocked ? b!.structureKind : structureKindDraft,
      };
      if (immeubleOrgShape) {
        json.floorCount = fc.ok ? fc.value : null;
        json.hasRezDeChaussee = hasRezDeChausseeDraft;
        json.locauxSlotCount = null;
        json.terrainLotCount = null;
        if (usePerFloorGrid && fc.ok && fc.value != null && pf.ok && pf.value != null) {
          const rz = hasRezDeChausseeDraft && rac.ok && rac.value != null ? rac.value : 0;
          json.apartmentsPerFloor = pf.value;
          json.apartmentCount = fc.value * pf.value + rz;
          json.rezApartmentCount = hasRezDeChausseeDraft && rac.ok ? rac.value : null;
        } else {
          json.apartmentsPerFloor = null;
          json.apartmentCount = ac.ok ? ac.value : null;
          json.rezApartmentCount = hasRezDeChausseeDraft && rac.ok ? rac.value : null;
        }
      } else if (terrainLotsShape) {
        json.floorCount = null;
        json.apartmentCount = null;
        json.apartmentsPerFloor = null;
        json.locauxSlotCount = null;
        json.hasRezDeChaussee = null;
        json.rezApartmentCount = null;
        json.terrainLotCount = tlc.ok ? tlc.value : null;
      } else {
        json.floorCount = null;
        json.apartmentCount = null;
        json.apartmentsPerFloor = null;
        json.locauxSlotCount = null;
        json.hasRezDeChaussee = null;
        json.rezApartmentCount = null;
        json.terrainLotCount = null;
      }
      await api(`/buildings/${id}`, { method: 'PATCH', json });
      await load({ silent: true });
    } catch (e2) {
      setStructureErr(e2 instanceof Error ? e2.message : 'Enregistrement impossible.');
    } finally {
      setStructureSaving(false);
    }
  }

  const dirtyFloors =
    !!b &&
    (floorCountDraft.trim() !== (b.floorCount != null ? String(b.floorCount) : '') ||
      apartmentCountDraft.trim() !== (b.apartmentCount != null ? String(b.apartmentCount) : '') ||
      apartmentsPerFloorDraft.trim() !==
        (b.apartmentsPerFloor != null ? String(b.apartmentsPerFloor) : '') ||
      rezApartmentCountDraft.trim() !== (b.rezApartmentCount != null ? String(b.rezApartmentCount) : '') ||
      hasRezDeChausseeDraft !== (b.hasRezDeChaussee !== false));
  const dirtyTerrainLots =
    !!b && terrainLotCountDraft.trim() !== (b.terrainLotCount != null ? String(b.terrainLotCount) : '');

  const buildingProfileDirty =
    !!b &&
    (immeubleLocked
      ? b.structureKind === 'IMMEUBLE'
        ? dirtyFloors
        : b.structureKind === 'TERRAIN_LOTS'
          ? dirtyTerrainLots
          : false
      : structureKindDraft !== b.structureKind || dirtyFloors || dirtyTerrainLots);

  function resetBuildingProfileFromLoaded() {
    if (!b) return;
    drafts.applyLoaded(b);
    setStructureErr(null);
  }

  return {
    structureErr,
    structureSaving,
    buildingProfileDirty,
    saveBuildingProfile,
    resetBuildingProfileFromLoaded,
  };
}

export type BuildingProfile = ReturnType<typeof useBuildingProfile>;
