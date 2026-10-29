import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { buildReturnToBuildingUrl } from '@/lib/navigation';
import { computeLeaseEndPreviewFr } from './leaseUtils';
import type {
  BuildingOpt,
  DepositMonthsPreset,
  LeaseCreateMode,
  LeaseRow,
  ReturnToBuildingState,
} from './types';
import { useLeaseUnitOptions } from './useLeaseUnitOptions';

type Options = {
  buildings: BuildingOpt[];
  leases: LeaseRow[];
  activeLeaseUnitIds: Set<string>;
  buildingsAvailableForNewLease: BuildingOpt[];
  load: () => void;
};

/** Formulaire « nouveau bail » : état, préremplissage via l'URL, validation et création. */
export function useNewLeaseForm({ buildings, leases, activeLeaseUnitIds, buildingsAvailableForNewLease, load }: Options) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [unitId, setUnitId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [rentDueDay, setRentDueDay] = useState('1');
  const [buildingIdForLease, setBuildingIdForLease] = useState('');
  const [depositMonthsPreset, setDepositMonthsPreset] = useState<DepositMonthsPreset>('0');
  const [err, setErr] = useState<string | null>(null);
  const [addLeaseOpen, setAddLeaseOpen] = useState(false);
  const [createMode, setCreateMode] = useState<LeaseCreateMode>('single');
  const addLeaseFormRef = useRef<HTMLDivElement | null>(null);
  /** Évite de réappliquer le préremplissage tant que l’URL n’a pas changé. */
  const newLeasePrefillAppliedRef = useRef<string | null>(null);
  /** Lien depuis la fiche bien : après création du bail, retour sur ce bien (état par défaut de la page). */
  const returnToBuildingAfterLeaseRef = useRef<ReturnToBuildingState | null>(null);

  const unitOptions = useLeaseUnitOptions({
    buildings,
    buildingIdForLease,
    unitId,
    activeLeaseUnitIds,
    buildingsAvailableForNewLease,
    setBuildingIdForLease,
    setUnitId,
  });
  const { needsUnitsOnBuildingFirst, resolvedUnitIdForLease, monoLotBlocksLease, allUnitsLeased } = unitOptions;

  function scrollToForm() {
    window.requestAnimationFrame(() => {
      addLeaseFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function openAddLeaseForm() {
    setAddLeaseOpen(true);
    scrollToForm();
  }

  function resetNewLeaseForm() {
    setBuildingIdForLease('');
    setUnitId('');
    setTenantId('');
    setStartDate('');
    setMonthlyRent('');
    setRentDueDay('1');
    setDepositMonthsPreset('0');
    setErr(null);
  }

  function cancelNewLease() {
    resetNewLeaseForm();
    setCreateMode('single');
    setAddLeaseOpen(false);
    returnToBuildingAfterLeaseRef.current = null;
  }

  useEffect(() => {
    if (window.location.hash === '#nouveau-bail') {
      setAddLeaseOpen(true);
    }
  }, []);

  /** Lien depuis la fiche bien (liste des unités) : ?buildingId=&unitId= → ouvre le formulaire avec bien + lot déjà choisis. */
  useEffect(() => {
    const bid = params.get('buildingId')?.trim() ?? '';
    const uid = params.get('unitId')?.trim() ?? '';
    const hintUnitLabel = params.get('hintUnitLabel')?.trim() ?? '';
    const returnLocationFromQuery = params.get('returnLocation')?.trim() ?? '';
    if (!bid) {
      newLeasePrefillAppliedRef.current = null;
      return;
    }
    if (buildings.length === 0) return;
    const bg = buildings.find((x) => x.id === bid);
    if (!bg) return;
    const clearPrefillParams = () =>
      setParams(
        (prev) => {
          const q = new URLSearchParams(prev);
          q.delete('buildingId');
          q.delete('unitId');
          q.delete('hintUnitLabel');
          q.delete('returnLocation');
          return q;
        },
        { replace: true },
      );
    if (uid) {
      const unitOk = bg.units.some((x) => x.id === uid);
      if (!unitOk) return;
      if (leases.some((l) => l.active && l.unit.id === uid)) {
        const keyOcc = `${bid}|${uid}|occ`;
        if (newLeasePrefillAppliedRef.current === keyOcc) return;
        newLeasePrefillAppliedRef.current = keyOcc;
        returnToBuildingAfterLeaseRef.current = null;
        setBuildingIdForLease(bid);
        setUnitId('');
        setAddLeaseOpen(true);
        setErr('Ce lot a déjà un bail actif. Choisissez un autre lot libre sur ce bien.');
        clearPrefillParams();
        scrollToForm();
        return;
      }
    }
    const key = `${bid}|${uid}`;
    if (newLeasePrefillAppliedRef.current === key) return;
    newLeasePrefillAppliedRef.current = key;

    setBuildingIdForLease(bid);
    if (uid) setUnitId(uid);
    setAddLeaseOpen(true);
    setErr(null);
    returnToBuildingAfterLeaseRef.current = {
      buildingId: bid,
      unitId: uid || undefined,
      hintUnitLabel: hintUnitLabel || undefined,
      returnLocation: returnLocationFromQuery || '/baux',
    };
    clearPrefillParams();
    scrollToForm();
  }, [buildings, leases, params, setParams]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!buildingIdForLease) {
      setErr('Choisissez le bien concerné.');
      return;
    }
    if (needsUnitsOnBuildingFirst) {
      setErr(
        'Ce bien multi locataires n’a pas encore d’unité : créez chaque lot sur la fiche « Biens », puis revenez ici pour lier le bail.',
      );
      return;
    }
    if (!tenantId) {
      setErr('Choisissez le locataire.');
      return;
    }
    if (!startDate?.trim()) {
      setErr('Indiquez la date de début du bail.');
      return;
    }
    const rent = monthlyRent.replace(/\D/g, '');
    if (!rent) {
      setErr('Indiquez le loyer mensuel.');
      return;
    }
    const uid = resolvedUnitIdForLease;
    if (!uid) {
      setErr(
        monoLotBlocksLease
          ? 'Ce bien n’a pas encore de lot : créez-le sur la fiche du bien avant d’ajouter un bail.'
          : allUnitsLeased
            ? 'Tous les lots de ce bien ont déjà un bail actif. Terminez ou désactivez un bail existant pour en créer un nouveau sur un lot libéré.'
            : 'Choisissez l’unité louée.',
      );
      return;
    }
    const bidBeforeSave = buildingIdForLease;
    const uidBeforeSave = uid;
    const returnBuilding = returnToBuildingAfterLeaseRef.current;
    const returnUrl =
      returnBuilding && bidBeforeSave === returnBuilding.buildingId && uidBeforeSave
        ? buildReturnToBuildingUrl({
            buildingId: returnBuilding.buildingId,
            unitId: returnBuilding.unitId ?? uidBeforeSave,
            hintUnitLabel: returnBuilding.hintUnitLabel,
            returnLocation: returnBuilding.returnLocation ?? '/baux',
          })
        : null;
    try {
      await api('/leases', {
        method: 'POST',
        json: {
          unitId: uid,
          tenantId,
          startDate,
          monthlyRent: Number(rent),
          rentDueDay: Number(rentDueDay) || 1,
          ...(depositMonthsPreset !== '0' ? { depositMonths: Number(depositMonthsPreset) } : {}),
        },
      });
      resetNewLeaseForm();
      setAddLeaseOpen(false);
      if (returnUrl) {
        returnToBuildingAfterLeaseRef.current = null;
        navigate(returnUrl, { replace: true });
        return;
      }
      returnToBuildingAfterLeaseRef.current = null;
      load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  const leaseEndPreviewFr = useMemo(() => computeLeaseEndPreviewFr(startDate), [startDate]);

  return {
    ...unitOptions,
    unitId,
    setUnitId,
    tenantId,
    setTenantId,
    startDate,
    setStartDate,
    monthlyRent,
    setMonthlyRent,
    rentDueDay,
    setRentDueDay,
    buildingIdForLease,
    setBuildingIdForLease,
    depositMonthsPreset,
    setDepositMonthsPreset,
    err,
    setErr,
    addLeaseOpen,
    setAddLeaseOpen,
    createMode,
    setCreateMode,
    addLeaseFormRef,
    leaseEndPreviewFr,
    openAddLeaseForm,
    cancelNewLease,
    create,
  };
}

export type NewLeaseForm = ReturnType<typeof useNewLeaseForm>;
