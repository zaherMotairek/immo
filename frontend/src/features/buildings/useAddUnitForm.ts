import { useEffect, useRef, useState } from 'react';
import { isImmeubleSlotFlowKind } from '@/lib/unitKind';
import { apartmentCapacityOnFloor, immeubleGridLayout } from './buildingUtils';
import type { Building, BulkUnitRow } from './types';
import type { BuildingLayout } from './useBuildingLayout';

type Options = {
  b: Building | null;
  layout: BuildingLayout;
  setBuildingTab: (id: string) => void;
};

/**
 * Onglet « Nouvelle unité » : champs, auto-remplissage du libellé, règles étage / nature,
 * options des menus (étages, numéros) du tableau d'ajout multiple.
 */
export function useAddUnitForm({ b, layout, setBuildingTab }: Options) {
  const {
    immeubleFloorPickerActive,
    terrainPlanActive,
    availableImmeubleFloors,
    availableApartmentFloors,
    immeubleFloorsWhComm,
    immeubleFloorsEntrepotCommerce,
    immeubleOnePerFloorLayout,
    usedApartmentSlots,
    usedApartmentSlotsByFloor,
    usedLocauxSlots,
    locauxSlotOptionsCount,
  } = layout;

  const [label, setLabel] = useState('');
  /** Si true, on ne réécrit plus le libellé automatique (l’utilisateur a choisi un surnom). */
  const [labelManual, setLabelManual] = useState(false);
  const [floor, setFloor] = useState('');
  const [surfaceM2, setSurfaceM2] = useState('');
  const [rooms, setRooms] = useState('');
  const [kind, setKind] = useState('APARTMENT');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [bulkLabelPrefix, setBulkLabelPrefix] = useState('');
  const [bulkRows, setBulkRows] = useState<BulkUnitRow[]>([{ kind: 'APARTMENT', floor: '', slot: '' }]);
  const [immeubleEtage, setImmeubleEtage] = useState('');
  const [immeubleAppNo, setImmeubleAppNo] = useState('');
  const [immeubleLocauxNo, setImmeubleLocauxNo] = useState('');
  const [terrainLotNo, setTerrainLotNo] = useState('');
  const [addUnitFormOpen, setAddUnitFormOpen] = useState(false);
  const addUnitFormRef = useRef<HTMLDivElement | null>(null);

  const immeubleSlotFlowActive = immeubleFloorPickerActive && isImmeubleSlotFlowKind(kind);
  const tableOnlyEligible = terrainPlanActive || immeubleSlotFlowActive;

  const floorsForImmeubleKind =
    kind === 'APARTMENT'
      ? availableApartmentFloors
      : kind === 'WAREHOUSE' || kind === 'COMMERCIAL'
        ? immeubleFloorsEntrepotCommerce
        : immeubleFloorsWhComm;

  function openAddUnitForm() {
    setBuildingTab('nouvelle-unite');
    setAddUnitFormOpen(true);
    window.requestAnimationFrame(() => {
      addUnitFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function floorsForBulkKind(rowKind: string): number[] {
    if (rowKind === 'APARTMENT') return availableApartmentFloors;
    if (rowKind === 'WAREHOUSE' || rowKind === 'COMMERCIAL') return immeubleFloorsEntrepotCommerce;
    return immeubleFloorsWhComm;
  }

  function floorOptionsForBulkRow(row: BulkUnitRow, rowIndex: number): number[] {
    const base = floorsForBulkKind(row.kind);
    if (!immeubleOnePerFloorLayout || row.kind !== 'APARTMENT') return base;
    const takenByRows = new Set<number>();
    bulkRows.forEach((r, idx) => {
      if (idx === rowIndex || r.kind !== 'APARTMENT') return;
      const f = Number(r.floor);
      if (Number.isFinite(f)) takenByRows.add(f);
    });
    return base.filter((f) => !takenByRows.has(f));
  }

  function slotOptionsForBulkRow(row: BulkUnitRow, rowIndex: number): number[] {
    if (!b) return [];
    const selectedInOtherRows = new Set<number>();
    bulkRows.forEach((r, idx) => {
      if (idx === rowIndex) return;
      const n = Number(r.slot);
      if (!Number.isInteger(n) || n < 1) return;
      if (terrainPlanActive) {
        selectedInOtherRows.add(n);
        return;
      }
      if (row.kind === 'APARTMENT') {
        if (r.kind !== 'APARTMENT') return;
        if (immeubleGridLayout(b)) {
          const rf = Number(r.floor);
          const rowF = Number(row.floor);
          if (!Number.isFinite(rf) || !Number.isFinite(rowF) || rf !== rowF) return;
        }
        selectedInOtherRows.add(n);
        return;
      }
      if ((row.kind === 'WAREHOUSE' || row.kind === 'COMMERCIAL') && (r.kind === 'WAREHOUSE' || r.kind === 'COMMERCIAL')) {
        selectedInOtherRows.add(n);
      }
    });

    if (terrainPlanActive) {
      const max = b.terrainLotCount ?? 0;
      return Array.from({ length: max }, (_, i) => i + 1).filter((n) => !usedApartmentSlots.has(n) && !selectedInOtherRows.has(n));
    }

    if (row.kind === 'APARTMENT') {
      if (immeubleGridLayout(b)) {
        const floorNum = Number(row.floor);
        if (!Number.isFinite(floorNum)) return [];
        const cap = apartmentCapacityOnFloor(b, floorNum);
        const used = usedApartmentSlotsByFloor.get(floorNum) ?? new Set<number>();
        return Array.from({ length: cap }, (_, i) => i + 1).filter((n) => !used.has(n) && !selectedInOtherRows.has(n));
      }
      return Array.from({ length: b.apartmentCount ?? 0 }, (_, i) => i + 1).filter((n) => !usedApartmentSlots.has(n) && !selectedInOtherRows.has(n));
    }

    if (row.kind === 'WAREHOUSE' || row.kind === 'COMMERCIAL') {
      return Array.from({ length: locauxSlotOptionsCount }, (_, i) => i + 1).filter((n) => !usedLocauxSlots.has(n) && !selectedInOtherRows.has(n));
    }
    return [];
  }

  function resetAddUnitForm() {
    setLabel('');
    setLabelManual(false);
    setFloor('');
    setImmeubleEtage('');
    setImmeubleAppNo('');
    setImmeubleLocauxNo('');
    setTerrainLotNo('');
    setSurfaceM2('');
    setRooms('');
    setKind('APARTMENT');
    setDescription('');
    setBulkLabelPrefix('');
    setBulkRows([{ kind: terrainPlanActive ? 'LAND' : 'APARTMENT', floor: '', slot: '' }]);
    setErr(null);
  }

  function setLabelFromUser(value: string) {
    setLabelManual(true);
    setLabel(value);
  }

  useEffect(() => {
    if (labelManual) return;
    if (!immeubleFloorPickerActive || !isImmeubleSlotFlowKind(kind)) return;
    if (immeubleEtage === '') return;
    const eta = Number(immeubleEtage);
    if (kind === 'APARTMENT') {
      if (immeubleAppNo === '') return;
      const slot = immeubleAppNo;
      setLabel(eta === 0 ? `Appartement RDC-${slot}` : `Appartement ${eta}-${slot}`);
    } else {
      if (immeubleLocauxNo === '') return;
      const slot = immeubleLocauxNo;
      if (kind === 'WAREHOUSE') {
        setLabel(eta === 0 ? `Entrepôt RDC-${slot}` : `Entrepôt ${eta}-${slot}`);
      } else {
        setLabel(eta === 0 ? `Commerce RDC-${slot}` : `Commerce ${eta}-${slot}`);
      }
    }
  }, [labelManual, immeubleFloorPickerActive, kind, immeubleEtage, immeubleAppNo, immeubleLocauxNo]);

  useEffect(() => {
    if (immeubleEtage === '') return;
    const fNum = Number(immeubleEtage);
    if (!Number.isFinite(fNum)) return;
    const allowed = kind === 'APARTMENT' ? availableImmeubleFloors : immeubleFloorsWhComm;
    if (!allowed.includes(fNum)) {
      setImmeubleEtage('');
    }
  }, [immeubleEtage, availableImmeubleFloors, immeubleFloorsWhComm, kind]);

  useEffect(() => {
    if (labelManual) return;
    if (!terrainPlanActive || terrainLotNo === '') return;
    setLabel(`Unité ${terrainLotNo}`);
  }, [labelManual, terrainPlanActive, terrainLotNo]);

  useEffect(() => {
    if (addUnitFormOpen && terrainPlanActive) {
      setKind('LAND');
      setBulkRows((rows) => rows.map((r) => ({ ...r, kind: 'LAND' })));
    }
  }, [addUnitFormOpen, terrainPlanActive]);

  useEffect(() => {
    if (!b || b.structureKind !== 'IMMEUBLE') return;
    if (immeubleEtage === '0') {
      if (kind === 'APARTMENT' && (b.rezApartmentCount ?? 0) <= 0) setKind('COMMERCIAL');
    } else if (immeubleEtage !== '') {
      const allowed =
        b.hasRezDeChaussee === false
          ? new Set(['APARTMENT'])
          : new Set(['APARTMENT', 'WAREHOUSE', 'COMMERCIAL']);
      if (!allowed.has(kind)) setKind('APARTMENT');
    }
  }, [b, kind, immeubleEtage]);

  useEffect(() => {
    if (!b || b.structureKind !== 'IMMEUBLE') return;
    if ((kind === 'WAREHOUSE' || kind === 'COMMERCIAL') && b.hasRezDeChaussee !== false) {
      setImmeubleEtage('0');
    }
  }, [kind, b]);

  return {
    label,
    setLabel,
    setLabelFromUser,
    labelManual,
    floor,
    setFloor,
    surfaceM2,
    setSurfaceM2,
    rooms,
    setRooms,
    kind,
    setKind,
    description,
    setDescription,
    err,
    setErr,
    addBusy,
    setAddBusy,
    bulkLabelPrefix,
    setBulkLabelPrefix,
    bulkRows,
    setBulkRows,
    immeubleEtage,
    setImmeubleEtage,
    immeubleAppNo,
    setImmeubleAppNo,
    immeubleLocauxNo,
    setImmeubleLocauxNo,
    terrainLotNo,
    setTerrainLotNo,
    addUnitFormOpen,
    setAddUnitFormOpen,
    addUnitFormRef,
    immeubleSlotFlowActive,
    tableOnlyEligible,
    floorsForImmeubleKind,
    openAddUnitForm,
    floorOptionsForBulkRow,
    slotOptionsForBulkRow,
    resetAddUnitForm,
  };
}

export type AddUnitForm = ReturnType<typeof useAddUnitForm>;
