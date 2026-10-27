import { api } from '@/lib/api';
import { immeubleGridLayout } from './buildingUtils';
import type { Building } from './types';
import type { AddUnitForm } from './useAddUnitForm';
import type { BuildingLayout } from './useBuildingLayout';

type Options = {
  id: string | undefined;
  b: Building | null;
  form: AddUnitForm;
  layout: BuildingLayout;
  load: (opts?: { silent?: boolean }) => Promise<void>;
};

/** Envoi du formulaire « Nouvelle unité » : une unité (`addUnit`) ou le tableau d'ajout multiple (`addUnitsBatch`). */
export function useAddUnitSubmit({ id, b, form, layout, load }: Options) {
  const {
    immeubleFloorPickerActive,
    immeubleSlotPickerActive,
    terrainPlanActive,
    usedApartmentSlots,
    usedApartmentSlotsByFloor,
    usedLocauxSlots,
  } = layout;

  async function addUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    const {
      kind,
      label,
      floor,
      surfaceM2,
      rooms,
      description,
      immeubleEtage,
      immeubleAppNo,
      immeubleLocauxNo,
      terrainLotNo,
    } = form;
    form.setErr(null);
    if (immeubleFloorPickerActive && kind === 'APARTMENT') {
      if (immeubleEtage === '0' && (b?.rezApartmentCount ?? 0) <= 0) {
        form.setErr('Au rez-de-chaussée, choisissez entrepôt ou commerce, ou indiquez des unités d’habitation au RDC dans « Organisation du bien ».');
        return;
      }
      if (immeubleEtage === '' || immeubleAppNo === '') {
        form.setErr('Choisissez l’étage et le numéro de logement.');
        return;
      }
      const appN = Number(immeubleAppNo);
      if (immeubleSlotPickerActive && b && immeubleGridLayout(b)) {
        const f = Number(immeubleEtage);
        if ((usedApartmentSlotsByFloor.get(f) ?? new Set()).has(appN)) {
          form.setErr(`Ce numéro de logement est déjà utilisé à cet étage.`);
          return;
        }
      } else if (!immeubleSlotPickerActive) {
        if (!Number.isInteger(appN) || appN < 1) {
          form.setErr('Le numéro de logement doit être un entier ≥ 1.');
          return;
        }
        if (usedApartmentSlots.has(appN)) {
          form.setErr(`Le numéro de logement ${appN} est déjà utilisé sur ce bien.`);
          return;
        }
      }
    }
    if (immeubleFloorPickerActive && (kind === 'WAREHOUSE' || kind === 'COMMERCIAL')) {
      if (immeubleEtage === '' || immeubleLocauxNo === '') {
        form.setErr('Choisissez l’étage et le numéro du local (entrepôt / commerce).');
        return;
      }
      const ln = Number(immeubleLocauxNo);
      if (!Number.isInteger(ln) || ln < 1) {
        form.setErr('Le numéro du local doit être un entier ≥ 1.');
        return;
      }
      if (usedLocauxSlots.has(ln)) {
        form.setErr(`Ce numéro (${ln}) est déjà utilisé pour un entrepôt ou un commerce sur ce bien.`);
        return;
      }
    }
    if (terrainPlanActive) {
      if (terrainLotNo === '') {
        form.setErr('Choisissez le numéro d’unité / de lot sur le terrain (1, 2, 3…).');
        return;
      }
    }
    try {
      const useImmeubleAptPicks = immeubleFloorPickerActive && kind === 'APARTMENT';
      const useImmeubleLocauxPicks =
        immeubleFloorPickerActive && (kind === 'WAREHOUSE' || kind === 'COMMERCIAL');
      const useTerrainLotPick = terrainPlanActive;
      const jsonBody: Record<string, unknown> = {
        label,
        floor:
          useImmeubleAptPicks || useImmeubleLocauxPicks
            ? Number(immeubleEtage)
            : useTerrainLotPick
              ? undefined
              : floor
                ? Number(floor)
                : undefined,
        surfaceM2: surfaceM2 ? Number(surfaceM2) : undefined,
        rooms: rooms ? Number(rooms) : undefined,
        kind,
        description: description.trim() || undefined,
      };
      if (useTerrainLotPick) {
        jsonBody.apartmentSlot = Number(terrainLotNo);
      } else if (useImmeubleAptPicks) {
        jsonBody.apartmentSlot = Number(immeubleAppNo);
      } else if (useImmeubleLocauxPicks) {
        jsonBody.locauxSlot = Number(immeubleLocauxNo);
      }
      await api(`/buildings/${id}/units`, {
        method: 'POST',
        json: jsonBody,
      });
      form.setLabel('');
      form.setFloor('');
      form.setImmeubleEtage('');
      form.setImmeubleAppNo('');
      form.setImmeubleLocauxNo('');
      form.setTerrainLotNo('');
      form.setSurfaceM2('');
      form.setRooms('');
      form.setKind('APARTMENT');
      form.setDescription('');
      form.setAddUnitFormOpen(false);
      await load({ silent: true });
    } catch (e2) {
      form.setErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  async function addUnitsBatch() {
    if (!id || !b) return;
    const { bulkRows, bulkLabelPrefix, surfaceM2, rooms, description, floor } = form;
    form.setErr(null);
    const rows = bulkRows.filter((r) => r.slot.trim() !== '');
    if (rows.length === 0) {
      form.setErr('Ajoutez au moins une ligne avec un numéro.');
      return;
    }
    if (rows.some((r) => !Number.isInteger(Number(r.slot)) || Number(r.slot) < 1)) {
      form.setErr('Chaque numéro doit être un entier >= 1.');
      return;
    }
    if (immeubleFloorPickerActive && rows.some((r) => (r.kind === 'APARTMENT' || r.kind === 'WAREHOUSE' || r.kind === 'COMMERCIAL') && !r.floor)) {
      form.setErr('Chaque ligne doit avoir un étage sélectionné.');
      return;
    }
    const keySet = new Set<string>();
    for (const r of rows) {
      const key = `${r.kind}|${r.floor}|${r.slot}`;
      if (keySet.has(key)) {
        form.setErr('Le tableau contient des doublons.');
        return;
      }
      keySet.add(key);
    }
    form.setAddBusy(true);
    try {
      for (const r of rows) {
        const slot = Number(r.slot);
        const jsonBody: Record<string, unknown> = {
          label: `${bulkLabelPrefix.trim() || 'Unité'} ${slot}`,
          surfaceM2: surfaceM2 ? Number(surfaceM2) : undefined,
          rooms: rooms ? Number(rooms) : undefined,
          kind: r.kind,
          description: description.trim() || undefined,
        };
        if (terrainPlanActive) {
          jsonBody.apartmentSlot = slot;
        } else if (immeubleFloorPickerActive) {
          const fl = Number(r.floor);
          if (!Number.isFinite(fl)) {
            throw new Error('Chaque ligne doit avoir un étage.');
          }
          jsonBody.floor = fl;
          if (r.kind === 'APARTMENT') jsonBody.apartmentSlot = slot;
          if (r.kind === 'WAREHOUSE' || r.kind === 'COMMERCIAL') jsonBody.locauxSlot = slot;
        } else if (floor) {
          jsonBody.floor = Number(floor);
        }
        await api(`/buildings/${id}/units`, {
          method: 'POST',
          json: jsonBody,
        });
      }
      form.setBulkRows([{ kind: terrainPlanActive ? 'LAND' : 'APARTMENT', floor: '', slot: '' }]);
      form.setBulkLabelPrefix('');
      form.setDescription('');
      form.setSurfaceM2('');
      form.setRooms('');
      await load({ silent: true });
    } catch (e2) {
      form.setErr(e2 instanceof Error ? e2.message : 'Erreur');
    } finally {
      form.setAddBusy(false);
    }
  }

  return { addUnit, addUnitsBatch };
}
