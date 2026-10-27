import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BuildingStructureValue } from '@/lib/buildingStructure';
import { parseOptionalInt } from './buildingUtils';
import type { Building } from './types';

/**
 * Brouillons de l'onglet « Organisation » (type, étages, logements, lots) + total d'immeuble calculé.
 * `applyLoaded` recopie un bien chargé dans les brouillons (appelé par `useBuildingData` hors rechargement silencieux).
 */
export function useBuildingProfileDrafts() {
  const [structureKindDraft, setStructureKindDraft] = useState<BuildingStructureValue>('MONO_LOT');
  const [floorCountDraft, setFloorCountDraft] = useState('');
  const [hasRezDeChausseeDraft, setHasRezDeChausseeDraft] = useState(true);
  const [apartmentCountDraft, setApartmentCountDraft] = useState('');
  const [apartmentsPerFloorDraft, setApartmentsPerFloorDraft] = useState('');
  const [rezApartmentCountDraft, setRezApartmentCountDraft] = useState('');
  const [terrainLotCountDraft, setTerrainLotCountDraft] = useState('');

  const applyLoaded = useCallback((data: Building) => {
    setStructureKindDraft(data.structureKind ?? 'MONO_LOT');
    setFloorCountDraft(data.floorCount != null ? String(data.floorCount) : '');
    setHasRezDeChausseeDraft(data.hasRezDeChaussee !== false);
    setApartmentCountDraft(data.apartmentCount != null ? String(data.apartmentCount) : '');
    setApartmentsPerFloorDraft(data.apartmentsPerFloor != null ? String(data.apartmentsPerFloor) : '');
    setRezApartmentCountDraft(data.rezApartmentCount != null ? String(data.rezApartmentCount) : '');
    setTerrainLotCountDraft(data.terrainLotCount != null ? String(data.terrainLotCount) : '');
  }, []);

  const computedImmeubleOrgTotal = useMemo(() => {
    const fc = parseOptionalInt(floorCountDraft);
    const pf = parseOptionalInt(apartmentsPerFloorDraft);
    const rac = parseOptionalInt(rezApartmentCountDraft);
    if (!fc.ok || fc.value == null || fc.value < 1) return null;
    if (!pf.ok || pf.value == null || pf.value < 1) return null;
    const rz = hasRezDeChausseeDraft && rac.ok && rac.value != null ? rac.value : 0;
    return fc.value * pf.value + rz;
  }, [floorCountDraft, apartmentsPerFloorDraft, rezApartmentCountDraft, hasRezDeChausseeDraft]);

  useEffect(() => {
    if (computedImmeubleOrgTotal == null) return;
    setApartmentCountDraft(String(computedImmeubleOrgTotal));
  }, [computedImmeubleOrgTotal]);

  return {
    structureKindDraft,
    setStructureKindDraft,
    floorCountDraft,
    setFloorCountDraft,
    hasRezDeChausseeDraft,
    setHasRezDeChausseeDraft,
    apartmentCountDraft,
    setApartmentCountDraft,
    apartmentsPerFloorDraft,
    setApartmentsPerFloorDraft,
    rezApartmentCountDraft,
    setRezApartmentCountDraft,
    terrainLotCountDraft,
    setTerrainLotCountDraft,
    applyLoaded,
    computedImmeubleOrgTotal,
  };
}

export type BuildingProfileDrafts = ReturnType<typeof useBuildingProfileDrafts>;
