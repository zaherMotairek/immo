import { useEffect, useMemo, useState } from 'react';
import { isMultiLotStructure } from '@/lib/buildingStructure';
import { api } from '@/lib/api';
import type { BuildingOpt, BulkLeaseRow } from './types';

type Options = {
  buildings: BuildingOpt[];
  activeLeaseUnitIds: Set<string>;
  buildingsAvailableForNewLease: BuildingOpt[];
  load: () => void;
  /** Ferme le zoom parent après succès. */
  onSuccessClose: () => void;
};

function vacantUnitsForBuilding(b: BuildingOpt | undefined, activeLeaseUnitIds: Set<string>) {
  if (!b?.units.length) return [];
  const rank = (k: string) => (k === 'APARTMENT' ? 0 : 1);
  return [...b.units]
    .filter((u) => !activeLeaseUnitIds.has(u.id))
    .sort((a, c) => {
      const rk = rank(a.kind) - rank(c.kind);
      if (rk !== 0) return rk;
      const sa = a.apartmentSlot ?? 99999;
      const sc = c.apartmentSlot ?? 99999;
      if (sa !== sc) return sa - sc;
      return a.label.localeCompare(c.label, 'fr', { numeric: true });
    });
}

function emptyRow(
  u: BuildingOpt['units'][number],
  defaults: { monthlyRent: string; startDate: string },
): BulkLeaseRow {
  return {
    unitId: u.id,
    label: u.label,
    kind: u.kind,
    apartmentSlot: u.apartmentSlot,
    selected: true,
    tenantId: '',
    monthlyRent: defaults.monthlyRent,
    startDate: defaults.startDate,
  };
}

/**
 * Ajout groupé de baux légers sur un bien multi-lots (terrain / immeuble) :
 * lots libres cochés + locataire + loyer + date ; le reste se complète plus tard sur la fiche.
 */
export function useBulkLeaseForm({
  buildings,
  activeLeaseUnitIds,
  buildingsAvailableForNewLease,
  load,
  onSuccessClose,
}: Options) {
  const [buildingId, setBuildingId] = useState('');
  const [defaultStartDate, setDefaultStartDate] = useState('');
  const [defaultMonthlyRent, setDefaultMonthlyRent] = useState('');
  const [rentDueDay, setRentDueDay] = useState('1');
  const [rows, setRows] = useState<BulkLeaseRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Ligne qui recevra le locataire créé via « Nouveau locataire rapide ». */
  const [pendingTenantUnitId, setPendingTenantUnitId] = useState<string | null>(null);

  const multiLotBuildings = useMemo(
    () =>
      buildingsAvailableForNewLease.filter(
        (b) => isMultiLotStructure(b.structureKind) && vacantUnitsForBuilding(b, activeLeaseUnitIds).length > 0,
      ),
    [buildingsAvailableForNewLease, activeLeaseUnitIds],
  );

  const selectedBuilding = buildings.find((b) => b.id === buildingId);

  useEffect(() => {
    if (!buildingId) {
      setRows([]);
      return;
    }
    const ok = multiLotBuildings.some((b) => b.id === buildingId);
    if (!ok) {
      setBuildingId('');
      setRows([]);
      return;
    }
    const vacant = vacantUnitsForBuilding(selectedBuilding, activeLeaseUnitIds);
    setRows((prev) => {
      const prevById = new Map(prev.map((r) => [r.unitId, r]));
      return vacant.map((u) => {
        const old = prevById.get(u.id);
        if (old) {
          return {
            ...old,
            label: u.label,
            kind: u.kind,
            apartmentSlot: u.apartmentSlot,
          };
        }
        return emptyRow(u, { monthlyRent: defaultMonthlyRent, startDate: defaultStartDate });
      });
    });
    // defaults lus une fois pour les nouvelles lignes ; « Appliquer » met à jour les lignes cochées.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne pas réécrire la grille à chaque frappe loyer/date
  }, [buildingId, selectedBuilding, activeLeaseUnitIds, multiLotBuildings]);

  function resetBulk() {
    setBuildingId('');
    setDefaultStartDate('');
    setDefaultMonthlyRent('');
    setRentDueDay('1');
    setRows([]);
    setErr(null);
    setBusy(false);
    setPendingTenantUnitId(null);
  }

  function updateRow(unitId: string, patch: Partial<BulkLeaseRow>) {
    setRows((prev) => prev.map((r) => (r.unitId === unitId ? { ...r, ...patch } : r)));
  }

  function applyDefaultsToSelected() {
    setRows((prev) =>
      prev.map((r) =>
        r.selected
          ? {
              ...r,
              ...(defaultMonthlyRent.trim() ? { monthlyRent: defaultMonthlyRent } : {}),
              ...(defaultStartDate.trim() ? { startDate: defaultStartDate } : {}),
            }
          : r,
      ),
    );
  }

  function selectAll(selected: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, selected })));
  }

  function assignTenantToPendingOrIgnore(tenantId: string) {
    if (!pendingTenantUnitId) return false;
    updateRow(pendingTenantUnitId, { tenantId });
    setPendingTenantUnitId(null);
    return true;
  }

  function clearPendingTenant() {
    setPendingTenantUnitId(null);
  }

  function openQuickTenantForRow(unitId: string, openQuickTenant: () => void) {
    setPendingTenantUnitId(unitId);
    openQuickTenant();
  }

  async function createBulk() {
    setErr(null);
    if (!buildingId) {
      setErr('Choisissez le bien.');
      return;
    }
    const due = Number(rentDueDay) || 1;
    if (due < 1 || due > 31) {
      setErr('Jour d’échéance invalide (1–31).');
      return;
    }
    const picked = rows.filter((r) => r.selected);
    if (picked.length === 0) {
      setErr('Cochez au moins un lot.');
      return;
    }
    for (const r of picked) {
      if (!r.tenantId) {
        setErr(`Choisissez le locataire pour « ${r.label} ».`);
        return;
      }
      if (!r.startDate.trim()) {
        setErr(`Indiquez la date de début pour « ${r.label} ».`);
        return;
      }
      const rent = r.monthlyRent.replace(/\D/g, '');
      if (!rent) {
        setErr(`Indiquez le loyer pour « ${r.label} ».`);
        return;
      }
    }

    setBusy(true);
    let created = 0;
    try {
      for (const r of picked) {
        const rent = Number(r.monthlyRent.replace(/\D/g, ''));
        await api('/leases', {
          method: 'POST',
          json: {
            unitId: r.unitId,
            tenantId: r.tenantId,
            startDate: r.startDate,
            monthlyRent: rent,
            rentDueDay: due,
          },
        });
        created += 1;
      }
      resetBulk();
      onSuccessClose();
      load();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : 'Erreur';
      setErr(
        created > 0
          ? `${created} bail(s) créé(s), puis erreur : ${msg}. Rechargez la liste et complétez le reste.`
          : msg,
      );
      if (created > 0) load();
    } finally {
      setBusy(false);
    }
  }

  return {
    multiLotBuildings,
    buildingId,
    setBuildingId,
    defaultStartDate,
    setDefaultStartDate,
    defaultMonthlyRent,
    setDefaultMonthlyRent,
    rentDueDay,
    setRentDueDay,
    rows,
    err,
    busy,
    pendingTenantUnitId,
    selectedBuilding,
    resetBulk,
    updateRow,
    applyDefaultsToSelected,
    selectAll,
    assignTenantToPendingOrIgnore,
    clearPendingTenant,
    openQuickTenantForRow,
    createBulk,
  };
}

export type BulkLeaseFormState = ReturnType<typeof useBulkLeaseForm>;
