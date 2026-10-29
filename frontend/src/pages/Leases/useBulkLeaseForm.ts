import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { isMultiLotStructure } from '@/lib/buildingStructure';
import { api } from '@/lib/api';
import { isContactPickerSupported, pickDeviceContacts } from '@/lib/contactPicker';
import { splitFullName } from './leaseUtils';
import type { BuildingOpt, BulkLeaseRow, TenantOpt } from './types';

type Options = {
  buildings: BuildingOpt[];
  activeLeaseUnitIds: Set<string>;
  buildingsAvailableForNewLease: BuildingOpt[];
  tenants: TenantOpt[];
  setTenants: Dispatch<SetStateAction<TenantOpt[]>>;
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
  tenants,
  setTenants,
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
  const [contactsBusy, setContactsBusy] = useState(false);
  /** Ligne qui recevra le locataire créé via « Nouveau locataire rapide ». */
  const [pendingTenantUnitId, setPendingTenantUnitId] = useState<string | null>(null);
  const contactsSupported = isContactPickerSupported();

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
    setContactsBusy(false);
    setPendingTenantUnitId(null);
  }

  /**
   * Ouvre le carnet du téléphone (multi), crée les locataires (nom + n°)
   * et les affecte aux lots cochés encore sans locataire.
   */
  async function importFromPhoneContacts() {
    setErr(null);
    if (!contactsSupported) {
      setErr('La sélection de contacts n’est pas disponible ici (essayez Chrome sur Android).');
      return;
    }
    const targets = rows.filter((r) => r.selected && !r.tenantId);
    if (targets.length === 0) {
      setErr('Cochez des lots encore sans locataire, puis réessayez.');
      return;
    }
    setContactsBusy(true);
    try {
      const contacts = await pickDeviceContacts({ multiple: true });
      if (!contacts?.length) return;

      const toUse = contacts.slice(0, targets.length);
      const assignments: Array<{ unitId: string; tenantId: string }> = [];
      const created: TenantOpt[] = [];

      for (let i = 0; i < toUse.length; i += 1) {
        const c = toUse[i];
        const { firstName, lastName } = splitFullName(c.name);
        if (!firstName.trim()) continue;
        const tenant = await api<TenantOpt>('/tenants', {
          method: 'POST',
          json: {
            firstName,
            lastName: lastName.trim() || '-',
            phone: c.tel,
            ...(c.email && c.email.includes('@') ? { email: c.email } : {}),
          },
        });
        created.push(tenant);
        assignments.push({ unitId: targets[i].unitId, tenantId: tenant.id });
      }

      if (created.length === 0) {
        setErr('Aucun contact utilisable (nom manquant).');
        return;
      }

      setTenants(
        [...tenants, ...created].sort((a, b) =>
          `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr', {
            sensitivity: 'base',
          }),
        ),
      );
      setRows((prev) =>
        prev.map((r) => {
          const a = assignments.find((x) => x.unitId === r.unitId);
          return a ? { ...r, tenantId: a.tenantId } : r;
        }),
      );

      const leftover = contacts.length - created.length;
      if (leftover > 0) {
        setErr(
          `${created.length} locataire(s) importé(s). ${leftover} contact(s) non placé(s) : pas assez de lots cochés libres.`,
        );
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Import contacts impossible.');
    } finally {
      setContactsBusy(false);
    }
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
    contactsBusy,
    contactsSupported,
    pendingTenantUnitId,
    selectedBuilding,
    resetBulk,
    updateRow,
    applyDefaultsToSelected,
    selectAll,
    assignTenantToPendingOrIgnore,
    clearPendingTenant,
    openQuickTenantForRow,
    importFromPhoneContacts,
    createBulk,
  };
}

export type BulkLeaseFormState = ReturnType<typeof useBulkLeaseForm>;
