import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SmartLink } from '@/components/SmartLink';
import { api } from '@/lib/api';
import { fcfa, INPUT_AMOUNT_FCFA_LABEL } from '@/lib/format';
import { AppPageTitle } from '@/components/AppPageTitle';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { BuildingScopeBadge, UnitScopeBadge } from '@/components/BuildingUnitBadges';
import { FicheLocationLink } from '@/components/FicheLocationLink';
import { LeaseContractSection } from '@/components/LeaseContractSection';
import { AmountFcfaInput, Button, Card, HelpHint, Input, Label, Select } from '@/components/ui';
import { isMultiLotStructure } from '@/lib/buildingStructure';
import { listTableCellClass, listTableDataRowClass, listTableFirstCellClass } from '@/lib/listTableStyles';
import { useEscapeCancel } from '@/lib/useEscapeCancel';
import { buildReturnToBuildingUrl, navigateAfterCreate } from '@/lib/navigation';
import { UNIT_KIND_OPTIONS, unitKindLabel, type UnitKindCode } from '@/lib/unitKind';

type BuildingOpt = {
  id: string;
  name: string;
  structureKind?: string;
  floorCount?: number | null;
  apartmentCount?: number | null;
  terrainLotCount?: number | null;
  units: { id: string; label: string; kind: string; apartmentSlot?: number | null }[];
};

type LeaseRow = {
  id: string;
  active: boolean;
  startDate: string;
  endDate: string | null;
  monthlyRent: unknown;
  rentDueDay: number;
  depositAmount?: unknown;
  depositPaidAt?: string | null;
  tenant: { id: string; firstName: string; lastName: string };
  unit: {
    id: string;
    label: string;
    kind: string;
    building: {
      id: string;
      name: string;
      commune: string;
      city: string;
      structureKind?: string;
    };
  };
  contractFileOriginalName?: string | null;
  contractFileMime?: string | null;
  contractFileSize?: number | null;
  contractFileKey?: string | null;
  contractUploadedAt?: string | null;
};

type StatusTab = 'active' | 'inactive' | 'all';

type WellViewFilter = 'all' | UnitKindCode;

type LeaseSortKey = 'building' | 'unit' | 'tenant' | 'rent' | 'start' | 'status';

function compareLeaseRows(a: LeaseRow, b: LeaseRow, key: LeaseSortKey, dir: 'asc' | 'desc'): number {
  const sign = dir === 'asc' ? 1 : -1;
  let c = 0;
  switch (key) {
    case 'building':
      c = a.unit.building.name.localeCompare(b.unit.building.name, 'fr', { sensitivity: 'base' });
      if (c === 0) {
        c = `${a.unit.building.commune ?? ''} ${a.unit.building.city}`.localeCompare(
          `${b.unit.building.commune ?? ''} ${b.unit.building.city}`,
          'fr',
          { sensitivity: 'base' },
        );
      }
      break;
    case 'unit':
      c = a.unit.label.localeCompare(b.unit.label, 'fr', { numeric: true });
      if (c === 0) c = a.unit.kind.localeCompare(b.unit.kind);
      break;
    case 'tenant':
      c = `${a.tenant.lastName} ${a.tenant.firstName}`.localeCompare(
        `${b.tenant.lastName} ${b.tenant.firstName}`,
        'fr',
        { sensitivity: 'base' },
      );
      break;
    case 'rent':
      c = Number(a.monthlyRent) - Number(b.monthlyRent);
      break;
    case 'start':
      c = a.startDate.localeCompare(b.startDate);
      if (c === 0 && a.endDate && b.endDate) c = a.endDate.localeCompare(b.endDate);
      break;
    case 'status': {
      const av = a.active ? 1 : 0;
      const bv = b.active ? 1 : 0;
      c = av - bv;
      if (c === 0) c = a.startDate.localeCompare(b.startDate);
      break;
    }
    default:
      c = 0;
  }
  return c * sign;
}

function LeaseSortTh({
  label,
  columnKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  columnKey: LeaseSortKey;
  activeKey: LeaseSortKey;
  dir: 'asc' | 'desc';
  onSort: (k: LeaseSortKey) => void;
}) {
  const active = activeKey === columnKey;
  return (
    <th scope="col" className="whitespace-nowrap px-4 py-2.5 sm:px-5">
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-md text-left text-[11px] font-semibold uppercase tracking-[0.06em] transition hover:text-brand-700 dark:hover:text-brand-300 ${
          active ? 'text-brand-700 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'
        }`}
        aria-label={`Trier par ${label}${active ? ` (${dir === 'asc' ? 'croissant' : 'décroissant'})` : ''}`}
      >
        <span>{label}</span>
        <span className="select-none font-normal tabular-nums opacity-75" aria-hidden>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  );
}

/** Libellé dans la liste « Bien » : nom + type + nombre d’unités (aperçu avant choix du lot). */
function formatBuildingChoiceLabel(b: BuildingOpt) {
  const n = b.units?.length ?? 0;
  const unitsFr = n === 0 ? 'aucune unité' : `${n} unité${n !== 1 ? 's' : ''}`;
  const tag =
    b.structureKind === 'IMMEUBLE'
      ? 'Immeuble'
      : b.structureKind === 'TERRAIN_LOTS'
        ? 'Terrain parcelé'
        : b.structureKind === 'MONO_LOT'
          ? 'Mono-lot'
          : null;
  return tag ? `${b.name} — ${tag} · ${unitsFr}` : `${b.name} — ${unitsFr}`;
}

const filterPillBase =
  'shrink-0 rounded-md border px-2 py-1 text-left text-[11px] font-medium leading-tight whitespace-nowrap transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
const filterPillOn =
  'border-brand-600/90 bg-brand-50 text-brand-950 shadow-sm dark:border-brand-500/70 dark:bg-brand-950/35 dark:text-brand-100';
const filterPillOff =
  'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900/75 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800';

export function LeasesPage() {
  useRegisterRootSectionFallback();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const leaseIdFocus = params.get('leaseId')?.trim() ?? '';
  const hintTenant = params.get('hintTenant')?.trim() ?? '';
  const hintPlace = params.get('hintPlace')?.trim() ?? '';

  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [buildings, setBuildings] = useState<BuildingOpt[]>([]);
  const [unitId, setUnitId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [tenants, setTenants] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [startDate, setStartDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [rentDueDay, setRentDueDay] = useState('1');
  const [genYear, setGenYear] = useState(String(new Date().getFullYear()));
  const [statusTab, setStatusTab] = useState<StatusTab>('active');
  const [wellViewFilter, setWellViewFilter] = useState<WellViewFilter>('all');
  const [buildingIdForLease, setBuildingIdForLease] = useState('');
  const [depositMonthsPreset, setDepositMonthsPreset] = useState<'0' | '1' | '2' | '3'>('0');
  const [err, setErr] = useState<string | null>(null);
  const [addLeaseOpen, setAddLeaseOpen] = useState(false);
  const [leasesFiltersOpen, setLeasesFiltersOpen] = useState(false);
  const [leaseSortKey, setLeaseSortKey] = useState<LeaseSortKey>('tenant');
  const [leaseSortDir, setLeaseSortDir] = useState<'asc' | 'desc'>('asc');
  const [leaseListSearch, setLeaseListSearch] = useState('');
  const addLeaseFormRef = useRef<HTMLDivElement | null>(null);
  /** Évite de réappliquer le préremplissage tant que l’URL n’a pas changé. */
  const newLeasePrefillAppliedRef = useRef<string | null>(null);
  /** Lien depuis la fiche bien : après création du bail, retour sur ce bien (état par défaut de la page). */
  const returnToBuildingAfterLeaseRef = useRef<{ buildingId: string } | null>(null);

  function toggleLeaseSort(key: LeaseSortKey) {
    if (leaseSortKey === key) {
      setLeaseSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setLeaseSortKey(key);
      setLeaseSortDir('asc');
    }
  }

  function openAddLeaseForm() {
    setAddLeaseOpen(true);
    window.requestAnimationFrame(() => {
      addLeaseFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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
    setAddLeaseOpen(false);
    returnToBuildingAfterLeaseRef.current = null;
  }

  useEscapeCancel(addLeaseOpen, cancelNewLease);

  const load = useCallback(() => {
    api<LeaseRow[]>('/leases').then(setLeases).catch(() => setLeases([]));
    api<BuildingOpt[]>('/buildings').then(setBuildings).catch(() => setBuildings([]));
    api<{ id: string; firstName: string; lastName: string }[]>('/tenants').then(setTenants).catch(() => setTenants([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (window.location.hash === '#nouveau-bail') {
      setAddLeaseOpen(true);
    }
  }, []);

  /** Lien depuis la fiche bien (liste des unités) : ?buildingId=&unitId= → ouvre le formulaire avec bien + lot déjà choisis. */
  useEffect(() => {
    const bid = params.get('buildingId')?.trim() ?? '';
    const uid = params.get('unitId')?.trim() ?? '';
    if (!bid) {
      newLeasePrefillAppliedRef.current = null;
      return;
    }
    if (buildings.length === 0) return;
    const bg = buildings.find((x) => x.id === bid);
    if (!bg) return;
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
        setParams(
          (prev) => {
            const q = new URLSearchParams(prev);
            q.delete('buildingId');
            q.delete('unitId');
            return q;
          },
          { replace: true },
        );
        window.requestAnimationFrame(() => {
          addLeaseFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
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
    returnToBuildingAfterLeaseRef.current = { buildingId: bid };
    setParams(
      (prev) => {
        const q = new URLSearchParams(prev);
        q.delete('buildingId');
        q.delete('unitId');
        return q;
      },
      { replace: true },
    );
    window.requestAnimationFrame(() => {
      addLeaseFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [buildings, leases, params, setParams]);

  const leaseStats = useMemo(() => {
    const active = leases.filter((l) => l.active).length;
    return { active, inactive: leases.length - active, total: leases.length };
  }, [leases]);

  /** Unités avec un bail actif : à exclure des sélecteurs « nouveau bail ». */
  const activeLeaseUnitIds = useMemo(() => {
    const s = new Set<string>();
    for (const l of leases) {
      if (l.active) s.add(l.unit.id);
    }
    return s;
  }, [leases]);

  /** Biens où il reste au moins un lot libre (ou aucune unité encore créée → fiche Biens). */
  const buildingsAvailableForNewLease = useMemo(() => {
    return buildings.filter((b) => {
      const n = b.units?.length ?? 0;
      if (n === 0) return true;
      return b.units.some((u) => !activeLeaseUnitIds.has(u.id));
    });
  }, [buildings, activeLeaseUnitIds]);

  const leasesByStatus = useMemo(() => {
    if (statusTab === 'active') return leases.filter((l) => l.active);
    if (statusTab === 'inactive') return leases.filter((l) => !l.active);
    return leases;
  }, [leases, statusTab]);

  const wellViewCounts = useMemo(() => {
    const counts: Record<string, number> = { all: leasesByStatus.length };
    for (const { value } of UNIT_KIND_OPTIONS) {
      counts[value] = leasesByStatus.filter((l) => l.unit.kind === value).length;
    }
    return counts;
  }, [leasesByStatus]);

  const filteredLeases = useMemo(() => {
    if (wellViewFilter === 'all') return leasesByStatus;
    return leasesByStatus.filter((l) => l.unit.kind === wellViewFilter);
  }, [leasesByStatus, wellViewFilter]);

  /** Filtre textuel (locataire, bien, ville, unité). */
  const leasesForTable = useMemo(() => {
    const q = leaseListSearch.trim().toLowerCase();
    if (!q) return filteredLeases;
    return filteredLeases.filter((l) => {
      const tenant = `${l.tenant.firstName} ${l.tenant.lastName}`.toLowerCase();
      const b = l.unit.building;
      const place = `${b.name} ${b.commune ?? ''} ${b.city}`.toLowerCase();
      const unit = `${l.unit.label} ${unitKindLabel(l.unit.kind)}`.toLowerCase();
      return `${tenant} ${place} ${unit}`.includes(q);
    });
  }, [filteredLeases, leaseListSearch]);

  const filterSummaryShort = useMemo(() => {
    const statusFr =
      statusTab === 'active' ? 'Actifs' : statusTab === 'inactive' ? 'Inactifs' : 'Tous';
    const wellFr = wellViewFilter === 'all' ? 'Tous types' : unitKindLabel(wellViewFilter);
    return `${statusFr} · ${wellFr} · échéances ${genYear}`;
  }, [statusTab, wellViewFilter, genYear]);

  const leaseFocusSummary = useMemo(() => {
    if (!leaseIdFocus) return null;
    const lease = leases.find((l) => l.id === leaseIdFocus);
    if (lease) {
      return {
        tenant: `${lease.tenant.firstName} ${lease.tenant.lastName}`.trim(),
        place: `${lease.unit.building.name} — ${lease.unit.label}`,
      };
    }
    if (hintTenant || hintPlace) {
      return { tenant: hintTenant || '—', place: hintPlace || '—' };
    }
    return { tenant: '', place: '' };
  }, [leaseIdFocus, leases, hintTenant, hintPlace]);

  /** Baux visibles, triés selon la colonne choisie. */
  const tableLeases = useMemo(() => {
    return [...leasesForTable].sort((a, b) => compareLeaseRows(a, b, leaseSortKey, leaseSortDir));
  }, [leasesForTable, leaseSortKey, leaseSortDir]);

  const appliedLeaseLinkRef = useRef<string | null>(null);

  function clearLeaseDeepLink() {
    setParams(
      (prev) => {
        const q = new URLSearchParams(prev);
        q.delete('leaseId');
        q.delete('hintTenant');
        q.delete('hintPlace');
        return q;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    if (!leaseIdFocus) {
      appliedLeaseLinkRef.current = null;
      return;
    }
    const lease = leases.find((l) => l.id === leaseIdFocus);
    if (!lease) return;
    if (appliedLeaseLinkRef.current === leaseIdFocus) return;
    appliedLeaseLinkRef.current = leaseIdFocus;
    setStatusTab('all');
    setWellViewFilter('all');
  }, [leaseIdFocus, leases]);

  useLayoutEffect(() => {
    if (!leaseIdFocus || tableLeases.length === 0) return;
    if (!tableLeases.some((r) => r.id === leaseIdFocus)) return;
    const t = window.setTimeout(() => {
      const row = document.getElementById(`lease-row-${leaseIdFocus}`);
      if (!row) return;
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      row.classList.add('ring-2', 'ring-brand-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
      window.setTimeout(
        () =>
          row.classList.remove('ring-2', 'ring-brand-500', 'ring-offset-2', 'dark:ring-offset-slate-900'),
        2400,
      );
    }, 150);
    return () => clearTimeout(t);
  }, [leaseIdFocus, tableLeases]);

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
  const showLeaseUnitSelect =
    !!selectedBuilding &&
    nVacantUnits > 0 &&
    (isMultiLotSelected || nVacantUnits > 1);

  /** Multi-lots déclaré mais aucune unité encore créée sur la fiche Biens. */
  const needsUnitsOnBuildingFirst =
    !!selectedBuilding && isMultiLotSelected && nUnitsInBuilding === 0;

  const monoLotBlocksLease =
    !!selectedBuilding && !isMultiLotSelected && nUnitsInBuilding === 0;

  /** Tous les lots du bien ont déjà un bail actif. */
  const allUnitsLeased =
    !!selectedBuilding && nUnitsInBuilding > 0 && nVacantUnits === 0;

  const resolvedUnitIdForLease = useMemo(() => {
    if (!selectedBuilding) return '';
    if (showLeaseUnitSelect) return unitId;
    if (vacantUnitsInSelectedBuilding.length === 1) return vacantUnitsInSelectedBuilding[0].id;
    return '';
  }, [selectedBuilding, showLeaseUnitSelect, vacantUnitsInSelectedBuilding, unitId]);

  /** Multi-lots + une seule unité libre : pré-sélection pour éviter un select à une seule entrée sans défaut. */
  useEffect(() => {
    if (!showLeaseUnitSelect || nVacantUnits !== 1) return;
    const only = vacantUnitsInSelectedBuilding[0];
    if (!only) return;
    if (unitId === only.id) return;
    setUnitId(only.id);
  }, [showLeaseUnitSelect, nVacantUnits, vacantUnitsInSelectedBuilding, unitId, buildingIdForLease]);

  /** Si le lot choisi vient d’être loué (autre onglet / rechargement), on réinitialise. */
  useEffect(() => {
    if (!unitId) return;
    if (activeLeaseUnitIds.has(unitId)) setUnitId('');
  }, [unitId, activeLeaseUnitIds]);

  /** Bien plus éligible (tout loué) : on vide le choix. */
  useEffect(() => {
    if (!buildingIdForLease) return;
    const ok = buildingsAvailableForNewLease.some((b) => b.id === buildingIdForLease);
    if (!ok) {
      setBuildingIdForLease('');
      setUnitId('');
    }
  }, [buildingIdForLease, buildingsAvailableForNewLease]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!buildingIdForLease) {
      setErr('Choisissez le bien concerné.');
      return;
    }
    if (needsUnitsOnBuildingFirst) {
      setErr(
        'Ce bien multi-lots n’a pas encore d’unité : créez chaque lot sur la fiche « Biens », puis revenez ici pour lier le bail.',
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
      returnToBuildingAfterLeaseRef.current = null;
      load();
      if (returnBuilding && bidBeforeSave === returnBuilding.buildingId && uidBeforeSave) {
        navigateAfterCreate(
          navigate,
          buildReturnToBuildingUrl({
            buildingId: returnBuilding.buildingId,
            unitId: uidBeforeSave,
            returnLocation: '/baux',
          }),
        );
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  async function generatePayments(leaseId: string) {
    const year = Number(genYear);
    if (!Number.isFinite(year)) return;
    try {
      const res = await api<{ createdCount: number }>(`/leases/${leaseId}/generate-payments`, {
        method: 'POST',
        json: { year },
      });
      alert(`${res.createdCount} échéance(s) créée(s) ou déjà existantes pour ${year}.`);
      load();
    } catch (e2) {
      alert(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  async function toggleActive(lease: LeaseRow) {
    await api(`/leases/${lease.id}`, { method: 'PATCH', json: { active: !lease.active } });
    load();
  }

  /** Aligné sur le backend : fin de bail = même jour, un an après le début. */
  const leaseEndPreviewFr = useMemo(() => {
    if (!startDate?.trim()) return null;
    const parts = startDate.split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
    const [yy, mm, dd] = parts;
    const nextY = yy + 1;
    const lastDay = new Date(nextY, mm, 0).getDate();
    const dayClamped = Math.min(dd, lastDay);
    const d = new Date(nextY, mm - 1, dayClamped);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [startDate]);

  const immeubleIndicatifHint =
    selectedBuilding?.structureKind === 'IMMEUBLE' &&
    selectedBuilding &&
    (selectedBuilding.floorCount != null || selectedBuilding.apartmentCount != null)
      ? `Indicatif immeuble : ${
          selectedBuilding.floorCount != null
            ? `${selectedBuilding.floorCount} étage${selectedBuilding.floorCount !== 1 ? 's' : ''}`
            : 'étages non renseignés'
        } · ${
          selectedBuilding.apartmentCount != null
            ? `${selectedBuilding.apartmentCount} appartement${selectedBuilding.apartmentCount !== 1 ? 's' : ''} déclarés`
            : 'appartements non renseignés'
        } · ${selectedBuilding.units.length} unité${selectedBuilding.units.length !== 1 ? 's' : ''} enregistrée${
          selectedBuilding.units.length !== 1 ? 's' : ''
        }.`
      : selectedBuilding?.structureKind === 'TERRAIN_LOTS' && selectedBuilding
        ? `Indicatif terrain : ${
            selectedBuilding.terrainLotCount != null
              ? `${selectedBuilding.terrainLotCount} lot${selectedBuilding.terrainLotCount !== 1 ? 's' : ''} déclaré${selectedBuilding.terrainLotCount !== 1 ? 's' : ''}`
              : 'lots non renseignés'
          } · ${selectedBuilding.units.length} unité${selectedBuilding.units.length !== 1 ? 's' : ''} enregistrée${
            selectedBuilding.units.length !== 1 ? 's' : ''
          }.`
        : '';

  return (
    <div className="space-y-6 pb-10">
      <header className="border-b border-slate-200/90 pb-4 dark:border-slate-700/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <AppPageTitle
              iconTo="/baux"
              title="Baux & locations"
              hintTitle="À la création, la fin de bail est fixée à un an après la date de début (même jour). Les loyers commencent le mois suivant l’enregistrement du bail (ex. contrat en avril → 1ᵉʳ loyer en mai) ; l’échéance est ce jour dans le mois facturé. Génération jusqu’à la fin de contrat (sauf bail inactif). Le bouton « Générer les échéances » ajoute une autre année civile si besoin. Les filtres ne font que masquer des lignes à l’écran."
            />
            {leaseIdFocus ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                <strong className="font-semibold text-slate-800 dark:text-slate-200">Vue guidée :</strong> un bail précis est
                mis en avant ci-dessous (groupe ouvert, ligne surlignée). Les autres baux restent visibles dans la liste.
              </p>
            ) : null}
            {leaseIdFocus ? (
              <div
                className="mt-4 max-w-2xl rounded-xl border border-brand-200/90 bg-gradient-to-br from-brand-50/95 to-white px-4 py-3.5 shadow-sm dark:border-brand-500/35 dark:from-brand-950/50 dark:to-slate-900/80"
                role="status"
              >
                <p className="text-sm font-semibold text-brand-950 dark:text-brand-100">
                  Baux & échéances — ce bail est sélectionné
                </p>
                {leaseFocusSummary && (leaseFocusSummary.tenant || leaseFocusSummary.place) ? (
                  <p className="mt-2 text-sm leading-snug text-slate-800 dark:text-slate-200">
                    <span className="font-semibold text-slate-900 dark:text-slate-50">{leaseFocusSummary.tenant}</span>
                    {leaseFocusSummary.place ? (
                      <>
                        {' '}
                        · <span className="font-normal">{leaseFocusSummary.place}</span>
                      </>
                    ) : null}
                  </p>
                ) : leaseIdFocus && leases.length > 0 ? (
                  <p className="mt-2 text-sm text-amber-800 dark:text-amber-200/90">
                    Aucun bail avec cet identifiant dans la liste chargée — il a peut-être été supprimé. Vérifiez l’URL ou
                    ouvrez la fiche location.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Chargement du contexte…</p>
                )}
                <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <SmartLink
                    to={`/locations/${leaseIdFocus}`}
                    className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
                  >
                    ← Fiche location de ce bail
                  </SmartLink>
                  <button
                    type="button"
                    className="font-semibold text-slate-700 underline-offset-2 hover:underline dark:text-slate-300"
                    onClick={clearLeaseDeepLink}
                  >
                    Afficher la page sans sélection
                  </button>
                </p>
              </div>
            ) : null}
          </div>
          <Button type="button" className="h-auto shrink-0 gap-2 py-2.5 text-sm font-semibold shadow-sm sm:mt-1" onClick={() => openAddLeaseForm()}>
            <span className="text-lg leading-none" aria-hidden>
              +
            </span>
            Nouveau bail
          </Button>
        </div>
      </header>

      <div ref={addLeaseFormRef} id="nouveau-bail" className="scroll-mt-24">
        <Card className="!p-0 overflow-hidden shadow-sm ring-1 ring-slate-900/[0.04] dark:ring-slate-600/35">
          <button
            type="button"
            onClick={() => setAddLeaseOpen((o) => !o)}
            aria-expanded={addLeaseOpen}
            className="flex w-full items-center justify-between gap-4 border-b border-transparent px-4 py-4 text-left transition hover:bg-slate-50/95 dark:hover:bg-slate-800/50 sm:px-5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/12 text-lg font-bold leading-none text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                +
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Étape administrative</p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Enregistrer un nouveau bail</h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {addLeaseOpen ? 'Replier le formulaire' : 'Déplier pour saisir bien, locataire et loyer'}
                </p>
              </div>
            </div>
            <svg
              className={`size-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500 ${addLeaseOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {addLeaseOpen ? (
            <div className="border-t border-slate-200/90 bg-slate-50/40 px-4 pb-5 pt-4 dark:border-slate-700 dark:bg-slate-900/25 sm:px-5">
        <form noValidate onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Label htmlFor="lease-building" className="mb-0">
                Bien
              </Label>
              {immeubleIndicatifHint ? (
                <HelpHint className="align-middle" title={immeubleIndicatifHint} />
              ) : null}
            </div>
            <Select
              id="lease-building"
              value={buildingIdForLease}
              onChange={(e) => {
                setBuildingIdForLease(e.target.value);
                setUnitId('');
              }}
              required
            >
              <option value="">Choisir le bien…</option>
              {[...buildingsAvailableForNewLease]
                .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {formatBuildingChoiceLabel(b)}
                  </option>
                ))}
            </Select>
          </div>
          {showLeaseUnitSelect ? (
            <div className="sm:col-span-2">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <Label htmlFor="lease-unit" className="mb-0">
                  {isMultiLotSelected ? 'Lot / unité à louer' : 'Unité concernée'}
                </Label>
                {nUnitsInBuilding > 1 ? (
                  <span className="rounded-md bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800 dark:bg-brand-500/20 dark:text-brand-200">
                    {nVacantUnits} libre{nVacantUnits !== 1 ? 's' : ''} sur {nUnitsInBuilding} lot{nUnitsInBuilding !== 1 ? 's' : ''}
                  </span>
                ) : null}
              </div>
              <Select
                id="lease-unit"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                required
                disabled={!buildingIdForLease}
              >
                <option value="">
                  {buildingIdForLease ? "Choisir l'unité ou le lot…" : "Choisissez d'abord un bien"}
                </option>
                {vacantUnitsInSelectedBuilding.map((u) => (
                  <option key={u.id} value={u.id}>
                    {unitKindLabel(u.kind)} — {u.label}
                    {u.apartmentSlot != null ? ` (n° ${u.apartmentSlot})` : ''}
                  </option>
                ))}
              </Select>
            </div>
          ) : needsUnitsOnBuildingFirst ? (
            <div className="sm:col-span-2 rounded-xl border border-amber-300/90 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-semibold">Aucune unité enregistrée sur ce bien multi-lots.</p>
              <p className="mt-1 leading-snug">
                Créez d’abord les lots (unités) sur la fiche « Biens », puis revenez pour attacher le bail au bon lot.
              </p>
              {selectedBuilding ? (
                <SmartLink
                  className="mt-2 inline-flex font-semibold text-amber-900 underline-offset-2 hover:underline dark:text-amber-200"
                  to={`/biens/${selectedBuilding.id}`}
                >
                  Ouvrir la fiche du bien « {selectedBuilding.name} »
                </SmartLink>
              ) : null}
            </div>
          ) : allUnitsLeased ? (
            <div className="sm:col-span-2 rounded-xl border border-slate-200/90 bg-slate-100/90 px-4 py-3 text-sm text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200">
              <p className="font-semibold">Aucun lot libre sur ce bien.</p>
              <p className="mt-1 leading-snug">
                Tous les lots ont déjà un bail actif. Pour enregistrer un nouveau bail ici, terminez ou désactivez d’abord un bail existant sur la fiche location concernée.
              </p>
            </div>
          ) : selectedBuilding && !isMultiLotSelected ? (
            <div className="sm:col-span-2 rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2.5 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
              {monoLotBlocksLease ? (
                <>
                  <span className="font-medium text-slate-800 dark:text-slate-200">Aucun lot sur ce bien.</span>{' '}
                  Créez l’unité (villa, parcelle, local unique…) sur la{' '}
                  <SmartLink className="font-semibold text-brand-600 underline hover:text-brand-700 dark:text-brand-400" to={`/biens/${selectedBuilding.id}`}>
                    fiche du bien
                  </SmartLink>
                  , puis enregistrez le bail.
                </>
              ) : unitsInSelectedBuilding.length === 1 && nVacantUnits === 1 ? (
                <>
                  <span className="font-medium text-slate-800 dark:text-slate-200">Bail sur l’unique lot :</span>{' '}
                  {unitKindLabel(vacantUnitsInSelectedBuilding[0].kind)} — {vacantUnitsInSelectedBuilding[0].label}
                  {vacantUnitsInSelectedBuilding[0].apartmentSlot != null
                    ? ` (n° ${vacantUnitsInSelectedBuilding[0].apartmentSlot})`
                    : ''}
                  .
                </>
              ) : null}
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Label>Locataire</Label>
            <Select value={tenantId} onChange={(e) => setTenantId(e.target.value)} required>
              <option value="">Choisir…</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
              <SmartLink
                to="/locataires?returnLocation=%2Fbaux#nouveau-locataire"
                className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
              >
                Nouveau locataire…
              </SmartLink>{' '}
              (retour automatique sur les baux après enregistrement)
            </p>
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Label htmlFor="lease-start" className="mb-0">
                Début du bail
              </Label>
              <HelpHint title="La fin de contrat est enregistrée automatiquement un an après cette date (même jour). Le premier loyer facturé est le mois suivant l’enregistrement du bail (sauf si la date de début est plus tard : on commence alors à ce mois-là). Chaque échéance tombe le jour indiqué dans le mois de la période (ex. mai → 1ᵉʳ mai si échéance le 1)." />
            </div>
            <Input id="lease-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            {leaseEndPreviewFr ? (
              <p className="mt-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                Fin de contrat (automatique) : {leaseEndPreviewFr}
              </p>
            ) : null}
          </div>
          <div>
            <Label>{INPUT_AMOUNT_FCFA_LABEL} — loyer mensuel</Label>
            <AmountFcfaInput min={0} step={1} value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} required />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Label htmlFor="lease-deposit-months" className="mb-0">
                Caution (dépôt) — nombre de loyers
              </Label>
              <HelpHint
                className="align-middle"
                title="Caution = loyer × le nombre de mois choisi. « Aucune » si pas de dépôt contractuel."
              />
            </div>
            <Select
              id="lease-deposit-months"
              value={depositMonthsPreset}
              onChange={(e) => setDepositMonthsPreset(e.target.value as '0' | '1' | '2' | '3')}
            >
              <option value="0">Aucune caution calculée</option>
              <option value="1">1 mois de loyer</option>
              <option value="2">2 mois de loyer</option>
              <option value="3">3 mois de loyer</option>
            </Select>
          </div>
          <div>
            <Label>Jour d’échéance (1–31)</Label>
            <Input type="number" min={1} max={31} value={rentDueDay} onChange={(e) => setRentDueDay(e.target.value)} />
          </div>
          {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button type="submit" disabled={monoLotBlocksLease || needsUnitsOnBuildingFirst}>
              Créer le bail
            </Button>
            <Button type="button" variant="secondary" className="py-2 text-sm" onClick={cancelNewLease}>
              Annuler
            </Button>
          </div>
        </form>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="space-y-4">
        <Card
          id="filtres-baux"
          className="scroll-mt-24 overflow-hidden !p-0 shadow-sm ring-1 ring-slate-900/[0.06] dark:shadow-none dark:ring-slate-600/40"
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 border-b border-slate-200/90 bg-slate-50/90 px-3 py-2 text-left transition hover:bg-slate-100/90 dark:border-slate-700 dark:bg-slate-900/90 dark:hover:bg-slate-800/90 sm:px-4"
            aria-expanded={leasesFiltersOpen}
            aria-controls="leases-filters-panel"
            onClick={() => setLeasesFiltersOpen((o) => !o)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Filtres
                </span>
                {!leasesFiltersOpen ? (
                  <span className="truncate text-xs text-slate-600 dark:text-slate-300">{filterSummaryShort}</span>
                ) : null}
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-medium text-brand-600 dark:text-brand-400">
              {leasesFiltersOpen ? 'Réduire' : 'Afficher'}
            </span>
            <svg
              className={`size-4 shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${leasesFiltersOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div
            id="leases-filters-panel"
            className="grid gap-3 px-3 pb-3 pt-2 sm:px-4 lg:grid-cols-12 lg:items-start lg:gap-x-4 lg:gap-y-2"
            hidden={!leasesFiltersOpen}
          >
            <fieldset className="border-0 p-0 lg:col-span-3">
              <legend className="sr-only">Filtrer par statut du bail</legend>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Statut
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'active' as const, label: 'Actifs', count: leaseStats.active },
                    { id: 'inactive' as const, label: 'Inactifs', count: leaseStats.inactive },
                    { id: 'all' as const, label: 'Tous', count: leaseStats.total },
                  ] as const
                ).map((t) => {
                  const on = statusTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setStatusTab(t.id)}
                      className={`${filterPillBase} inline-flex items-center gap-1.5 ${on ? filterPillOn : filterPillOff}`}
                    >
                      <span>{t.label}</span>
                      <span
                        className={`tabular-nums text-[10px] ${on ? 'text-brand-800/80 dark:text-brand-200/90' : 'text-slate-400 dark:text-slate-500'}`}
                      >
                        {t.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="min-w-0 border-0 p-0 lg:col-span-6">
              <legend className="sr-only">Filtrer par nature du local</legend>
              <div className="mb-1.5 flex flex-wrap items-center gap-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Nature du local
                </p>
                <HelpHint
                  className="shrink-0 [&_button]:size-5 [&_button]:opacity-70"
                  title="Chaque bail est relié à une unité déclarée sur la fiche Bien. Filtrez par type (appartement, maison, bureau…)."
                />
              </div>
              <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                {[
                  { id: 'all' as const, label: 'Tous types', countKey: 'all' as const },
                  ...UNIT_KIND_OPTIONS.map((o) => ({
                    id: o.value as WellViewFilter,
                    label: o.label,
                    countKey: o.value,
                  })),
                ].map((t) => {
                  const on = wellViewFilter === t.id;
                  const count = wellViewCounts[t.countKey] ?? 0;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setWellViewFilter(t.id)}
                      className={`${filterPillBase} inline-flex items-center gap-1.5 ${on ? filterPillOn : filterPillOff}`}
                    >
                      <span>{t.label}</span>
                      <span
                        className={`tabular-nums text-[10px] ${on ? 'text-brand-800/80 dark:text-brand-200/90' : 'text-slate-400 dark:text-slate-500'}`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2 border-t border-slate-100 pt-2 dark:border-slate-800 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between lg:col-span-3 lg:border-t-0 lg:pt-0">
              <div className="min-w-0 sm:flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Année des échéances
                  </p>
                  <HelpHint
                    className="shrink-0 [&_button]:size-5 [&_button]:opacity-70"
                    title="Année cible pour le bouton « Générer les échéances » sur chaque ligne du tableau (création des lignes de loyer / paiements attendus)."
                  />
                </div>
                <Input
                  id="leases-gen-year"
                  className="h-8 max-w-[5.5rem] border-slate-200 text-sm shadow-sm dark:border-slate-600"
                  value={genYear}
                  onChange={(e) => setGenYear(e.target.value)}
                  inputMode="numeric"
                  aria-label="Année pour la génération des échéances"
                />
              </div>
              <a
                href="#liste-des-baux"
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Liste
                <span aria-hidden className="text-slate-400">↓</span>
              </a>
            </div>
          </div>
        </Card>

        <section id="liste-des-baux" className="min-w-0 scroll-mt-24">
          <Card className="overflow-hidden !p-0 shadow-sm ring-1 ring-slate-900/[0.04] dark:ring-slate-600/35">
            <div className="border-b border-slate-200/90 bg-slate-50/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Liste des baux</h2>
                    <HelpHint
                      className="shrink-0 align-middle"
                      title="Une ligne par bail (locataire en premier). Fiche location, génération des échéances (année dans les filtres), pièce jointe du contrat, activation."
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {leaseListSearch.trim()
                      ? `${tableLeases.length} sur ${filteredLeases.length} affiché${tableLeases.length !== 1 ? 's' : ''}`
                      : `${tableLeases.length} bail${tableLeases.length !== 1 ? 'x' : ''}`}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                  {filteredLeases.length > 0 ? (
                    <div className="relative w-full min-w-0 sm:max-w-xs">
                      <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400" aria-hidden>
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
                        </svg>
                      </span>
                      <Input
                        type="search"
                        value={leaseListSearch}
                        onChange={(e) => setLeaseListSearch(e.target.value)}
                        placeholder="Rechercher (locataire, bien, unité…)"
                        className="w-full rounded-lg border-slate-200 py-2 pl-9 pr-8 text-sm dark:border-slate-600"
                        aria-label="Filtrer la liste des baux"
                        autoComplete="off"
                      />
                      {leaseListSearch.trim() ? (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                          onClick={() => setLeaseListSearch('')}
                          aria-label="Effacer la recherche"
                        >
                          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="shrink-0 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-center dark:border-slate-600 dark:bg-slate-800/80">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Lignes</p>
                    <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{tableLeases.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {leases.length > 0 && filteredLeases.length > 0 && leasesForTable.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
                    <LeaseSortTh
                      label="Locataire"
                      columnKey="tenant"
                      activeKey={leaseSortKey}
                      dir={leaseSortDir}
                      onSort={toggleLeaseSort}
                    />
                    <LeaseSortTh
                      label="Bien"
                      columnKey="building"
                      activeKey={leaseSortKey}
                      dir={leaseSortDir}
                      onSort={toggleLeaseSort}
                    />
                    <LeaseSortTh
                      label="Unité"
                      columnKey="unit"
                      activeKey={leaseSortKey}
                      dir={leaseSortDir}
                      onSort={toggleLeaseSort}
                    />
                    <LeaseSortTh
                      label="Loyer"
                      columnKey="rent"
                      activeKey={leaseSortKey}
                      dir={leaseSortDir}
                      onSort={toggleLeaseSort}
                    />
                    <LeaseSortTh
                      label="Début"
                      columnKey="start"
                      activeKey={leaseSortKey}
                      dir={leaseSortDir}
                      onSort={toggleLeaseSort}
                    />
                    <LeaseSortTh
                      label="Statut"
                      columnKey="status"
                      activeKey={leaseSortKey}
                      dir={leaseSortDir}
                      onSort={toggleLeaseSort}
                    />
                    <th
                      className="whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:px-5 dark:text-slate-400"
                      title="Fiche du bail (location)"
                    >
                      Fiche location
                    </th>
                    <th className="min-w-[10rem] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:px-5 dark:text-slate-400">
                      Contrat
                    </th>
                    <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 sm:px-5 dark:text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableLeases.map((l, rowIndex) => (
                    <tr key={l.id} id={`lease-row-${l.id}`} className={listTableDataRowClass(rowIndex)}>
                      <td className={`${listTableFirstCellClass} font-medium text-slate-900 dark:text-slate-100`}>
                        <SmartLink
                          to={`/locataires?edit=${encodeURIComponent(l.tenant.id)}`}
                          className="text-brand-800 underline-offset-2 hover:underline dark:text-brand-400"
                        >
                          {l.tenant.firstName} {l.tenant.lastName}
                        </SmartLink>
                      </td>
                      <td className={`${listTableCellClass} text-slate-800 dark:text-slate-200`}>
                        <div className="flex items-start gap-2">
                          <BuildingScopeBadge className="mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <SmartLink
                              to={`/biens/${l.unit.building.id}?returnLocation=${encodeURIComponent('/baux')}`}
                              className="block font-medium text-brand-800 underline-offset-2 hover:underline dark:text-brand-400"
                            >
                              {l.unit.building.name}
                            </SmartLink>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {l.unit.building.commune}, {l.unit.building.city}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`${listTableCellClass} text-slate-700 dark:text-slate-300`}>
                        <div className="flex items-start gap-2">
                          <UnitScopeBadge className="mt-0.5 shrink-0" />
                          <SmartLink
                            to={`/biens/${l.unit.building.id}?unitId=${encodeURIComponent(l.unit.id)}&hintUnitLabel=${encodeURIComponent(l.unit.label)}&returnLocation=${encodeURIComponent('/baux')}`}
                            className="min-w-0 block text-brand-800 underline-offset-2 hover:underline dark:text-brand-400"
                          >
                            <span className="text-xs text-slate-500 dark:text-slate-400">{unitKindLabel(l.unit.kind)}</span>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{l.unit.label}</p>
                          </SmartLink>
                        </div>
                      </td>
                      <td className={`${listTableCellClass} tabular-nums text-slate-800 dark:text-slate-200`}>
                        <p className="font-semibold">{fcfa(Number(l.monthlyRent))}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">/ mois · le {l.rentDueDay}</p>
                        {l.depositAmount != null && Number(l.depositAmount) > 0 ? (
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            Caution {fcfa(Number(l.depositAmount))}
                            {l.depositPaidAt ? (
                              <span className="text-emerald-700 dark:text-emerald-400"> · enc.</span>
                            ) : (
                              <span className="text-amber-800 dark:text-amber-300"> · non enc.</span>
                            )}
                          </p>
                        ) : null}
                      </td>
                      <td className={`${listTableCellClass} text-slate-700 dark:text-slate-300`}>
                        <p className="text-xs tabular-nums">{l.startDate.slice(0, 10)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {l.endDate ? `fin ${l.endDate.slice(0, 10)}` : 'sans fin'}
                        </p>
                      </td>
                      <td className={listTableCellClass}>
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            l.active
                              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {l.active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap ${listTableCellClass}`}>
                        <FicheLocationLink leaseId={l.id} />
                      </td>
                      <td className={listTableCellClass}>
                        <details className="max-w-[14rem] rounded-lg border border-slate-200 bg-slate-50/80 dark:border-slate-600 dark:bg-slate-800/50">
                          <summary className="cursor-pointer list-none px-2.5 py-1.5 text-xs font-medium marker:hidden [&::-webkit-details-marker]:hidden">
                            {l.contractFileKey ? (
                              <span className="text-emerald-700 dark:text-emerald-400">Contrat joint</span>
                            ) : (
                              <span className="text-slate-600 dark:text-slate-300">Joindre le contrat</span>
                            )}
                          </summary>
                          <div className="border-t border-slate-200 px-2 py-2 dark:border-slate-600">
                            <LeaseContractSection
                              leaseId={l.id}
                              compact
                              contract={
                                l.contractFileKey
                                  ? {
                                      fileName: l.contractFileOriginalName ?? null,
                                      mimeType: l.contractFileMime ?? null,
                                      size: l.contractFileSize ?? null,
                                      uploadedAt: l.contractUploadedAt ?? null,
                                    }
                                  : null
                              }
                              onChanged={load}
                            />
                          </div>
                        </details>
                      </td>
                      <td className={`text-right align-top ${listTableCellClass}`}>
                        <details className="ml-auto inline-block min-w-[8.5rem] max-w-[14rem] rounded-lg border border-slate-200 bg-slate-50/80 text-left dark:border-slate-600 dark:bg-slate-800/50">
                          <summary className="cursor-pointer list-none px-2.5 py-1.5 text-xs font-medium text-slate-700 marker:hidden [&::-webkit-details-marker]:hidden dark:text-slate-200">
                            Actions
                          </summary>
                          <div className="border-t border-slate-200 px-2 py-2 dark:border-slate-600">
                            <div className="flex flex-col gap-1.5">
                              <Button
                                variant="secondary"
                                className="w-full flex-col gap-0.5 py-2 text-xs leading-snug"
                                title={`Crée les lignes de loyer et d’échéances pour l’année ${genYear} (identique au champ « Année des échéances » dans les filtres).`}
                                onClick={() => generatePayments(l.id)}
                              >
                                <span className="font-semibold">Générer les échéances</span>
                                <span className="text-[10px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
                                  Année {genYear}
                                </span>
                              </Button>
                              <Button variant="ghost" className="w-full justify-center py-1.5 text-xs" onClick={() => toggleActive(l)}>
                                {l.active ? 'Désactiver le bail' : 'Réactiver le bail'}
                              </Button>
                            </div>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            ) : null}

            {leases.length === 0 && (
              <div className="border-t border-slate-200/80 bg-white px-4 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40 sm:px-6">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucun bail enregistré pour le moment.</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Commencez par créer un bail ci-dessus, ou vérifiez vos biens et unités.</p>
                <Button type="button" className="mt-5 py-2 text-sm" onClick={() => openAddLeaseForm()}>
                  Créer un premier bail
                </Button>
              </div>
            )}
            {leases.length > 0 && filteredLeases.length === 0 && (
              <div className="border-t border-slate-200/80 bg-white px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40 sm:px-6">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucun bail ne correspond à vos filtres.</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Élargissez la nature du local ou le statut dans les filtres ci-dessus, ou{' '}
                  <a href="#filtres-baux" className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400">
                    remonter aux filtres
                  </a>
                  .
                </p>
              </div>
            )}
            {leases.length > 0 && filteredLeases.length > 0 && leasesForTable.length === 0 && (
              <div className="border-t border-slate-200/80 bg-white px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40 sm:px-6">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucun résultat pour cette recherche.</p>
                <button
                  type="button"
                  className="mt-3 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                  onClick={() => setLeaseListSearch('')}
                >
                  Effacer la recherche
                </button>
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
