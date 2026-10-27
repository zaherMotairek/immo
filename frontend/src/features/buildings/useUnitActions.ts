import { useState } from 'react';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { apartmentCapacityOnFloor, immeubleGridLayout } from './buildingUtils';
import type { Building, Unit, UnitDraft } from './types';
import type { BuildingLayout } from './useBuildingLayout';

type Options = {
  id: string | undefined;
  b: Building | null;
  setB: React.Dispatch<React.SetStateAction<Building | null>>;
  layout: BuildingLayout;
  unitDrafts: Record<string, UnitDraft>;
  /** Erreur du formulaire « Nouvelle unité » (la génération auto y écrit comme avant). */
  setErr: (msg: string | null) => void;
  load: (opts?: { silent?: boolean }) => Promise<void>;
};

/** Actions sur les unités : génération auto, suppression, changement de nature, surface / pièces. */
export function useUnitActions({ id, b, setB, layout, unitDrafts, setErr, load }: Options) {
  const [autoGenBusy, setAutoGenBusy] = useState(false);

  const canAutoGenerateUnits =
    b != null &&
    ((b.structureKind === 'IMMEUBLE' && immeubleGridLayout(b)) ||
      (b.structureKind === 'TERRAIN_LOTS' && (b.terrainLotCount ?? 0) > 0));

  async function autoGenerateUnitsFromStructure() {
    if (!id || !b) return;
    if (!canAutoGenerateUnits) {
      toast('Génération auto disponible pour immeuble en grille ou terrain multi-lots.', { variant: 'warning' });
      return;
    }
    const payloads: Array<Record<string, unknown>> = [];

    if (b.structureKind === 'IMMEUBLE' && immeubleGridLayout(b)) {
      const floors = b.hasRezDeChaussee === false ? Array.from({ length: b.floorCount ?? 0 }, (_, i) => i + 1) : [0, ...Array.from({ length: b.floorCount ?? 0 }, (_, i) => i + 1)];
      for (const f of floors) {
        const cap = apartmentCapacityOnFloor(b, f);
        if (!Number.isFinite(cap) || cap <= 0) continue;
        const used = layout.usedApartmentSlotsByFloor.get(f) ?? new Set<number>();
        for (let slot = 1; slot <= cap; slot += 1) {
          if (used.has(slot)) continue;
          payloads.push({
            label: f === 0 ? `Appartement RDC-${slot}` : `Appartement ${f}-${slot}`,
            floor: f,
            kind: 'APARTMENT',
            apartmentSlot: slot,
          });
        }
      }
    } else if (b.structureKind === 'TERRAIN_LOTS' && (b.terrainLotCount ?? 0) > 0) {
      const usedTerrainSlots = new Set<number>();
      for (const u of b.units ?? []) {
        if (u.apartmentSlot != null) usedTerrainSlots.add(u.apartmentSlot);
      }
      for (let slot = 1; slot <= (b.terrainLotCount ?? 0); slot += 1) {
        if (usedTerrainSlots.has(slot)) continue;
        payloads.push({
          label: `Unité ${slot}`,
          kind: 'LAND',
          apartmentSlot: slot,
        });
      }
    }

    if (payloads.length === 0) {
      toast('Aucune unité manquante à générer.', { variant: 'info' });
      return;
    }
    const ok = await confirmDialog({
      title: 'Générer les unités',
      message: `Créer automatiquement ${payloads.length} unité(s) manquante(s) ?`,
      confirmLabel: 'Créer',
    });
    if (!ok) return;

    setAutoGenBusy(true);
    setErr(null);
    try {
      for (const json of payloads) {
        await api(`/buildings/${id}/units`, { method: 'POST', json });
      }
      await load({ silent: true });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Génération automatique impossible.');
    } finally {
      setAutoGenBusy(false);
    }
  }

  async function removeUnit(unitId: string) {
    const okDelete = await confirmDialog({
      title: 'Supprimer l’unité',
      message: 'Supprimer cette unité ? Les baux et loyers liés seront aussi supprimés.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!okDelete) return;
    try {
      await api(`/units/${unitId}`, { method: 'DELETE' });
      await load({ silent: true });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Suppression impossible.', { variant: 'error' });
    }
  }

  async function updateUnitKind(unitId: string, newKind: string) {
    const snapshot = b;
    setB((cur) =>
      cur
        ? { ...cur, units: cur.units.map((u) => (u.id === unitId ? { ...u, kind: newKind } : u)) }
        : cur,
    );
    try {
      await api(`/units/${unitId}`, { method: 'PATCH', json: { kind: newKind } });
      await load({ silent: true });
    } catch (e) {
      setB(snapshot);
      toast(e instanceof Error ? e.message : 'Modification impossible.', { variant: 'error' });
    }
  }

  async function updateUnitMetrics(unit: Unit) {
    const draft = unitDrafts[unit.id] ?? { surfaceM2: '', rooms: '' };
    const curSurface = unit.surfaceM2 != null ? String(unit.surfaceM2) : '';
    const curRooms = unit.rooms != null ? String(unit.rooms) : '';
    if (draft.surfaceM2.trim() === curSurface.trim() && draft.rooms.trim() === curRooms.trim()) return;
    const surfaceVal = draft.surfaceM2.trim();
    const roomsVal = draft.rooms.trim();
    if (surfaceVal && (!Number.isFinite(Number(surfaceVal)) || Number(surfaceVal) < 0)) {
      toast('Surface invalide.', { variant: 'error' });
      return;
    }
    if (roomsVal && (!Number.isInteger(Number(roomsVal)) || Number(roomsVal) < 0)) {
      toast('Nombre de pièces invalide.', { variant: 'error' });
      return;
    }
    try {
      await api(`/units/${unit.id}`, {
        method: 'PATCH',
        json: {
          surfaceM2: surfaceVal ? Number(surfaceVal) : null,
          rooms: roomsVal ? Number(roomsVal) : null,
        },
      });
      await load({ silent: true });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Modification impossible.', { variant: 'error' });
    }
  }

  return {
    autoGenBusy,
    canAutoGenerateUnits,
    autoGenerateUnitsFromStructure,
    removeUnit,
    updateUnitKind,
    updateUnitMetrics,
  };
}

export type UnitActions = ReturnType<typeof useUnitActions>;
