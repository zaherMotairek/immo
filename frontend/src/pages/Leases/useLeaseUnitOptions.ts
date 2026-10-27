import { useEffect, useMemo } from 'react';
import { isMultiLotStructure } from '@/lib/buildingStructure';
import { buildIndicatifHint } from './leaseUtils';
import type { BuildingOpt } from './types';

type Options = {
  buildings: BuildingOpt[];
  buildingIdForLease: string;
  unitId: string;
  activeLeaseUnitIds: Set<string>;
  buildingsAvailableForNewLease: BuildingOpt[];
  setBuildingIdForLease: (id: string) => void;
  setUnitId: (id: string) => void;
};

/** Bien / unités sélectionnables pour un nouveau bail : lots libres, cas bloquants et synchronisation des choix. */
export function useLeaseUnitOptions({
  buildings,
  buildingIdForLease,
  unitId,
  activeLeaseUnitIds,
  buildingsAvailableForNewLease,
  setBuildingIdForLease,
  setUnitId,
}: Options) {
  const selectedBuilding = buildings.find((x) => x.id === buildingIdForLease);
  const isMultiLotSelected = isMultiLotStructure(selectedBuilding?.structureKind);

  const unitsInSelectedBuilding = useMemo(() => {
    const b = selectedBuilding;
    if (!b?.units.length) return [];
    const rank = (k: string) => (k === 'APARTMENT' ? 0 : 1);
    return [...b.units].sort((a, c) => {
      const rk = rank(a.kind) - rank(c.kind);
      if (rk !== 0) return rk;
      const sa = a.apartmentSlot ?? 99999;
      const sc = c.apartmentSlot ?? 99999;
      if (sa !== sc) return sa - sc;
      return a.label.localeCompare(c.label, 'fr', { numeric: true });
    });
  }, [selectedBuilding]);

  const nUnitsInBuilding = unitsInSelectedBuilding.length;

  /** Lots encore disponibles pour un nouveau bail (sans bail actif sur l’unité). */
  const vacantUnitsInSelectedBuilding = useMemo(() => {
    return unitsInSelectedBuilding.filter((u) => !activeLeaseUnitIds.has(u.id));
  }, [unitsInSelectedBuilding, activeLeaseUnitIds]);

  const nVacantUnits = vacantUnitsInSelectedBuilding.length;

  /** Immeuble / terrain : besoin d’unités sur la fiche bien. Mono-lot : choix si plusieurs unités (cas rare) ou une seule auto. */
  const showLeaseUnitSelect = !!selectedBuilding && nVacantUnits > 0 && (isMultiLotSelected || nVacantUnits > 1);

  /** Multi locataires déclaré mais aucune unité encore créée sur la fiche Biens. */
  const needsUnitsOnBuildingFirst = !!selectedBuilding && isMultiLotSelected && nUnitsInBuilding === 0;

  const monoLotBlocksLease = !!selectedBuilding && !isMultiLotSelected && nUnitsInBuilding === 0;

  /** Tous les lots du bien ont déjà un bail actif. */
  const allUnitsLeased = !!selectedBuilding && nUnitsInBuilding > 0 && nVacantUnits === 0;

  const resolvedUnitIdForLease = useMemo(() => {
    if (!selectedBuilding) return '';
    if (showLeaseUnitSelect) return unitId;
    if (vacantUnitsInSelectedBuilding.length === 1) return vacantUnitsInSelectedBuilding[0].id;
    return '';
  }, [selectedBuilding, showLeaseUnitSelect, vacantUnitsInSelectedBuilding, unitId]);

  /** Multi locataires + une seule unité libre : pré-sélection pour éviter un select à une seule entrée sans défaut. */
  useEffect(() => {
    if (!showLeaseUnitSelect || nVacantUnits !== 1) return;
    const only = vacantUnitsInSelectedBuilding[0];
    if (!only) return;
    if (unitId === only.id) return;
    setUnitId(only.id);
  }, [showLeaseUnitSelect, nVacantUnits, vacantUnitsInSelectedBuilding, unitId, buildingIdForLease, setUnitId]);

  /** Si le lot choisi vient d’être loué (autre onglet / rechargement), on réinitialise. */
  useEffect(() => {
    if (!unitId) return;
    if (activeLeaseUnitIds.has(unitId)) setUnitId('');
  }, [unitId, activeLeaseUnitIds, setUnitId]);

  /** Bien plus éligible (tout loué) : on vide le choix. */
  useEffect(() => {
    if (!buildingIdForLease) return;
    const ok = buildingsAvailableForNewLease.some((b) => b.id === buildingIdForLease);
    if (!ok) {
      setBuildingIdForLease('');
      setUnitId('');
    }
  }, [buildingIdForLease, buildingsAvailableForNewLease, setBuildingIdForLease, setUnitId]);

  return {
    selectedBuilding,
    isMultiLotSelected,
    unitsInSelectedBuilding,
    nUnitsInBuilding,
    vacantUnitsInSelectedBuilding,
    nVacantUnits,
    showLeaseUnitSelect,
    needsUnitsOnBuildingFirst,
    monoLotBlocksLease,
    allUnitsLeased,
    resolvedUnitIdForLease,
    immeubleIndicatifHint: buildIndicatifHint(selectedBuilding),
  };
}

export type LeaseUnitOptions = ReturnType<typeof useLeaseUnitOptions>;
