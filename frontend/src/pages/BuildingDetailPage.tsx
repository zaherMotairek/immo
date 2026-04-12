import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAppNavigation } from '@/context/NavigationContext';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SmartLink } from '@/components/SmartLink';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { PageDetailBackLink, PageDetailHero } from '@/components/PageDetailHero';
import { SidebarNavIcon } from '@/components/SidebarNavIcons';
import { Button, Card, HelpHint, Input, Label, Select } from '@/components/ui';
import { BUILDING_STRUCTURE_OPTIONS, type BuildingStructureValue } from '@/lib/buildingStructure';
import { UNIT_KIND_OPTIONS, unitKindLabel } from '@/lib/unitKind';
import { resolveReturnTarget } from '@/lib/navigation';

type Unit = {
  id: string;
  label: string;
  kind?: string;
  floor: number | null;
  apartmentSlot?: number | null;
  surfaceM2: unknown;
  rooms: number | null;
  description?: string | null;
  leases?: Array<{
    id: string;
    monthlyRent?: unknown;
    tenant: { firstName: string; lastName: string };
  }>;
};

type Building = {
  id: string;
  name: string;
  city: string;
  commune: string | null;
  address: string | null;
  postalCode: string | null;
  country: string;
  structureKind: BuildingStructureValue;
  floorCount?: number | null;
  apartmentCount?: number | null;
  terrainLotCount?: number | null;
  units: Unit[];
};

const ORG_SECTION_HINT =
  'Immeuble ou terrain multi-lots : plusieurs unités et plusieurs baux sur ce même bien. Un seul lot : une seule unité (villa, parcelle unique, hangar en bloc, etc.).';

const UNIT_SECTION_HINT =
  'Pour chaque lot ou local : choisissez d’abord la nature (appartement, maison, bureau, entrepôt, commerce, terrain…), puis l’emplacement (étage, n° de lot). Un même immeuble peut mélanger plusieurs types.';

function unitIsOccupied(u: Unit) {
  return (u.leases?.length ?? 0) > 0;
}

function floorLabel(floor: number | null) {
  if (floor == null) return null;
  return floor === 0 ? 'RDC' : `Étage ${floor}`;
}

function BuildingHeroIcon({ structureKind }: { structureKind: BuildingStructureValue }) {
  if (structureKind === 'IMMEUBLE') {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-sm dark:bg-sky-950/55 dark:text-sky-300">
        <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <path d="M3 21h18M6 21V10l6-3.5L18 10v11M10 21v-5h4v5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  if (structureKind === 'TERRAIN_LOTS') {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-lime-100 text-lime-900 shadow-sm dark:bg-lime-950/50 dark:text-lime-200">
        <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <path d="M4 20h16M6 20V10l4-6 4 4 4-4v16" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 14h2M12 12h2M16 14h2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-sm dark:bg-amber-950/45 dark:text-amber-200">
      <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2.5 shadow-sm dark:border-slate-600/80 dark:bg-slate-800/50">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-50">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{sub}</p> : null}
    </div>
  );
}

export function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const focusUnitId = params.get('unitId')?.trim() ?? '';
  const hintUnitLabel = params.get('hintUnitLabel')?.trim() ?? '';
  const returnLocation = params.get('returnLocation')?.trim() ?? '';
  const location = useLocation();
  const { setReturnFallback } = useAppNavigation();
  const back = useMemo(
    () =>
      resolveReturnTarget(
        location.state,
        { fallbackHref: '/biens', fallbackLabel: 'Biens' },
        { returnLocationQuery: returnLocation },
      ),
    [location.state, returnLocation],
  );
  useEffect(() => {
    setReturnFallback(back.href);
    return () => setReturnFallback('/');
  }, [back.href, setReturnFallback]);
  const [b, setB] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [floor, setFloor] = useState('');
  const [surfaceM2, setSurfaceM2] = useState('');
  const [rooms, setRooms] = useState('');
  const [kind, setKind] = useState('APARTMENT');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [structureKindDraft, setStructureKindDraft] = useState<BuildingStructureValue>('MONO_LOT');
  const [floorCountDraft, setFloorCountDraft] = useState('');
  const [apartmentCountDraft, setApartmentCountDraft] = useState('');
  const [terrainLotCountDraft, setTerrainLotCountDraft] = useState('');
  const [structureErr, setStructureErr] = useState<string | null>(null);
  const [structureSaving, setStructureSaving] = useState(false);
  /** Étage et n° d’app. (sélecteurs immeuble avec carnet renseigné). */
  const [immeubleEtage, setImmeubleEtage] = useState('');
  const [immeubleAppNo, setImmeubleAppNo] = useState('');
  /** Numéro de lot 1…N sur terrain multi-lots (carnet déclaré). */
  const [terrainLotNo, setTerrainLotNo] = useState('');
  const [unitListFilter, setUnitListFilter] = useState<'all' | 'vacant' | 'occupied'>('all');
  const [unitListSearch, setUnitListSearch] = useState('');
  const [addUnitFormOpen, setAddUnitFormOpen] = useState(false);
  const addUnitFormRef = useRef<HTMLDivElement | null>(null);

  function openAddUnitForm() {
    setAddUnitFormOpen(true);
    window.requestAnimationFrame(() => {
      addUnitFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    api<Building>(`/buildings/${id}`)
      .then((data) => {
        setB(data);
        setStructureKindDraft(data.structureKind ?? 'MONO_LOT');
        setFloorCountDraft(data.floorCount != null ? String(data.floorCount) : '');
        setApartmentCountDraft(data.apartmentCount != null ? String(data.apartmentCount) : '');
        setTerrainLotCountDraft(data.terrainLotCount != null ? String(data.terrainLotCount) : '');
        setLoadError(null);
      })
      .catch((e) => {
        setB(null);
        setLoadError(e instanceof Error ? e.message : 'Impossible de charger ce bien.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  /** Immeuble ou terrain multi-lots : le type ne peut plus repasser en « un seul lot ». */
  const immeubleLocked = b?.structureKind === 'IMMEUBLE' || b?.structureKind === 'TERRAIN_LOTS';

  /** Immeuble avec carnet d’étages : dès que le nombre d’étages est renseigné (pas besoin du nombre d’appartements). */
  const immeubleFloorPickerActive =
    !!b &&
    b.structureKind === 'IMMEUBLE' &&
    b.floorCount != null &&
    b.floorCount > 0;

  /** Carnet 1…N pour les numéros d’app. : nécessite aussi apartmentCount sur le bien. */
  const immeubleSlotPickerActive =
    immeubleFloorPickerActive && (b?.apartmentCount ?? 0) > 0;

  /** Terrain avec N lots déclarés : numéros 1…N, pas d’étages. */
  const terrainPlanActive =
    !!b &&
    b.structureKind === 'TERRAIN_LOTS' &&
    b.terrainLotCount != null &&
    b.terrainLotCount > 0;

  const terrainLotsFull =
    terrainPlanActive && b!.terrainLotCount != null && b!.units.length >= b!.terrainLotCount;

  /** Récap terrain multi-lots pour le formulaire nouvelle unité (bas de formulaire). */
  const terrainLotRecap = useMemo(() => {
    if (!b || b.structureKind !== 'TERRAIN_LOTS' || b.terrainLotCount == null || b.terrainLotCount <= 0) {
      return null;
    }
    const n = b.terrainLotCount;
    const created = b.units.length;
    const free = Math.max(0, n - created);
    return { n, created, free };
  }, [b]);

  const usedApartmentSlots = useMemo(() => {
    if (!b?.units?.length) return new Set<number>();
    const s = new Set<number>();
    for (const u of b.units) {
      if (u.apartmentSlot != null) s.add(u.apartmentSlot);
    }
    return s;
  }, [b?.units]);

  const buildingStats = useMemo(() => {
    if (!b?.units) return null;
    const total = b.units.length;
    const occupied = b.units.filter((u) => (u.leases?.length ?? 0) > 0).length;
    const vacant = Math.max(0, total - occupied);
    let surfaceSum = 0;
    let surfaceCount = 0;
    for (const u of b.units) {
      if (u.surfaceM2 == null) continue;
      const n = Number(u.surfaceM2);
      if (Number.isFinite(n) && n > 0) {
        surfaceSum += n;
        surfaceCount += 1;
      }
    }
    const surfaceLabel =
      surfaceCount > 0
        ? `${Math.round(surfaceSum * 100) / 100} m²`.replace('.', ',')
        : '—';
    let monthlyRentTotal = 0;
    for (const u of b.units) {
      const lease = u.leases?.[0];
      if (lease == null || lease.monthlyRent == null) continue;
      const raw = lease.monthlyRent;
      const n = typeof raw === 'string' ? Number(raw) : Number(raw);
      if (Number.isFinite(n) && n >= 0) monthlyRentTotal += n;
    }
    return { total, occupied, vacant, surfaceLabel, surfaceCount, monthlyRentTotal };
  }, [b?.units]);

  const sortedUnits = useMemo(() => {
    if (!b?.units?.length) return [];
    return [...b.units].sort((a, c) => {
      const fa = a.floor ?? 10_000;
      const fc = c.floor ?? 10_000;
      if (fa !== fc) return fa - fc;
      const sa = a.apartmentSlot ?? 10_000;
      const sc = c.apartmentSlot ?? 10_000;
      if (sa !== sc) return sa - sc;
      return a.label.localeCompare(c.label, 'fr', { numeric: true, sensitivity: 'base' });
    });
  }, [b?.units]);

  const filteredUnits = useMemo(() => {
    if (unitListFilter === 'vacant') return sortedUnits.filter((u) => !unitIsOccupied(u));
    if (unitListFilter === 'occupied') return sortedUnits.filter((u) => unitIsOccupied(u));
    return sortedUnits;
  }, [sortedUnits, unitListFilter]);

  const tableUnits = useMemo(() => {
    const q = unitListSearch.trim().toLowerCase();
    if (!q) return filteredUnits;
    return filteredUnits.filter((u) => {
      const lease0 = u.leases?.[0];
      const tenant = lease0?.tenant;
      const tenantLine = tenant ? `${tenant.firstName} ${tenant.lastName}`.toLowerCase() : '';
      const hay = [
        u.label,
        u.apartmentSlot != null ? String(u.apartmentSlot) : '',
        unitKindLabel(u.kind),
        u.description ?? '',
        tenantLine,
        floorLabel(u.floor) ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [filteredUnits, unitListSearch]);

  const unitFocusTitle = useMemo(() => {
    if (!focusUnitId || !b?.units?.length) return hintUnitLabel || '';
    const u = b.units.find((x) => x.id === focusUnitId);
    return u?.label ?? hintUnitLabel ?? focusUnitId;
  }, [b?.units, focusUnitId, hintUnitLabel]);

  function clearUnitFocus() {
    setParams(
      (prev) => {
        const q = new URLSearchParams(prev);
        q.delete('unitId');
        q.delete('hintUnitLabel');
        q.delete('returnLocation');
        return q;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    if (!focusUnitId) return;
    setUnitListFilter('all');
    setUnitListSearch('');
  }, [focusUnitId]);

  useLayoutEffect(() => {
    if (!id || !focusUnitId || !b?.units?.length || b.id !== id) return;
    const unit = b.units.find((u) => u.id === focusUnitId);
    if (!unit) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(`unit-row-${focusUnitId}`);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('ring-2', 'ring-brand-500', 'ring-offset-2', 'rounded-2xl', 'dark:ring-offset-slate-900');
      window.setTimeout(
        () =>
          el.classList.remove(
            'ring-2',
            'ring-brand-500',
            'ring-offset-2',
            'rounded-2xl',
            'dark:ring-offset-slate-900',
          ),
        2600,
      );
    }, 200);
    return () => clearTimeout(t);
  }, [id, b?.id, b?.units, focusUnitId, filteredUnits, tableUnits]);

  useEffect(() => {
    if (!immeubleFloorPickerActive || kind !== 'APARTMENT') return;
    if (immeubleEtage === '' || immeubleAppNo === '') return;
    const ét = immeubleEtage === '0' ? 'RDC' : `ét. ${immeubleEtage}`;
    setLabel(`App. ${immeubleAppNo} · ${ét}`);
  }, [immeubleFloorPickerActive, kind, immeubleEtage, immeubleAppNo]);

  useEffect(() => {
    if (!terrainPlanActive || terrainLotNo === '') return;
    setLabel(`Unité ${terrainLotNo}`);
  }, [terrainPlanActive, terrainLotNo]);

  useEffect(() => {
    if (addUnitFormOpen && terrainPlanActive) {
      setKind('LAND');
    }
  }, [addUnitFormOpen, terrainPlanActive]);

  async function addUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setErr(null);
    if (immeubleFloorPickerActive && kind === 'APARTMENT') {
      if (immeubleEtage === '' || immeubleAppNo === '') {
        setErr('Choisissez l’étage et le numéro d’appartement dans l’immeuble.');
        return;
      }
      if (!immeubleSlotPickerActive) {
        const appN = Number(immeubleAppNo);
        if (!Number.isInteger(appN) || appN < 1) {
          setErr('Le n° d’appartement doit être un entier ≥ 1.');
          return;
        }
        if (usedApartmentSlots.has(appN)) {
          setErr(`Le numéro d’appartement ${appN} est déjà utilisé sur ce bien.`);
          return;
        }
      }
    }
    if (terrainPlanActive) {
      if (terrainLotNo === '') {
        setErr('Choisissez le numéro d’unité / de lot sur le terrain (1, 2, 3…).');
        return;
      }
    }
    try {
      const useImmeublePicks = immeubleFloorPickerActive && kind === 'APARTMENT';
      const useTerrainLotPick = terrainPlanActive;
      await api(`/buildings/${id}/units`, {
        method: 'POST',
        json: {
          label,
          floor: useImmeublePicks ? Number(immeubleEtage) : useTerrainLotPick ? undefined : floor ? Number(floor) : undefined,
          apartmentSlot: useImmeublePicks
            ? Number(immeubleAppNo)
            : useTerrainLotPick
              ? Number(terrainLotNo)
              : undefined,
          surfaceM2: surfaceM2 ? Number(surfaceM2) : undefined,
          rooms: rooms ? Number(rooms) : undefined,
          kind,
          description: description.trim() || undefined,
        },
      });
      setLabel('');
      setFloor('');
      setImmeubleEtage('');
      setImmeubleAppNo('');
      setTerrainLotNo('');
      setSurfaceM2('');
      setRooms('');
      setKind('APARTMENT');
      setDescription('');
      setAddUnitFormOpen(false);
      load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  async function removeUnit(unitId: string) {
    if (!confirm('Supprimer cette unité ? Les baux et loyers liés seront aussi supprimés.')) return;
    try {
      await api(`/units/${unitId}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Suppression impossible.');
    }
  }

  async function updateUnitKind(unitId: string, newKind: string) {
    try {
      await api(`/units/${unitId}`, { method: 'PATCH', json: { kind: newKind } });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Modification impossible.');
    }
  }

  function parseOptionalInt(raw: string): { ok: true; value: number | null } | { ok: false } {
    const t = raw.trim();
    if (t === '') return { ok: true, value: null };
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) return { ok: false };
    return { ok: true, value: Math.floor(n) };
  }

  async function saveBuildingProfile(e?: React.FormEvent) {
    e?.preventDefault();
    if (!id) return;
    setStructureErr(null);
    const fc = parseOptionalInt(floorCountDraft);
    const ac = parseOptionalInt(apartmentCountDraft);
    const tlc = parseOptionalInt(terrainLotCountDraft);
    const immeubleCarnetShape = immeubleLocked
      ? b!.structureKind === 'IMMEUBLE'
      : structureKindDraft === 'IMMEUBLE';
    const terrainLotsShape = immeubleLocked
      ? b!.structureKind === 'TERRAIN_LOTS'
      : structureKindDraft === 'TERRAIN_LOTS';
    if (immeubleCarnetShape && (!fc.ok || !ac.ok)) {
      setStructureErr('Nombre d’étages et nombre d’appartements doivent être des entiers positifs ou vides.');
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
      if (immeubleCarnetShape) {
        json.floorCount = fc.ok ? fc.value : null;
        json.apartmentCount = ac.ok ? ac.value : null;
        json.terrainLotCount = null;
      } else if (terrainLotsShape) {
        json.floorCount = null;
        json.apartmentCount = null;
        json.terrainLotCount = tlc.ok ? tlc.value : null;
      } else {
        json.floorCount = null;
        json.apartmentCount = null;
        json.terrainLotCount = null;
      }
      await api(`/buildings/${id}`, { method: 'PATCH', json });
      await load();
    } catch (e2) {
      setStructureErr(e2 instanceof Error ? e2.message : 'Enregistrement impossible.');
    } finally {
      setStructureSaving(false);
    }
  }

  const dirtyFloors =
    !!b &&
    (floorCountDraft.trim() !== (b.floorCount != null ? String(b.floorCount) : '') ||
      apartmentCountDraft.trim() !== (b.apartmentCount != null ? String(b.apartmentCount) : ''));
  const dirtyTerrainLots =
    !!b &&
    terrainLotCountDraft.trim() !== (b.terrainLotCount != null ? String(b.terrainLotCount) : '');

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
    setStructureKindDraft(b.structureKind ?? 'MONO_LOT');
    setFloorCountDraft(b.floorCount != null ? String(b.floorCount) : '');
    setApartmentCountDraft(b.apartmentCount != null ? String(b.apartmentCount) : '');
    setTerrainLotCountDraft(b.terrainLotCount != null ? String(b.terrainLotCount) : '');
    setStructureErr(null);
  }

  function resetAddUnitForm() {
    setLabel('');
    setFloor('');
    setImmeubleEtage('');
    setImmeubleAppNo('');
    setTerrainLotNo('');
    setSurfaceM2('');
    setRooms('');
    setKind('APARTMENT');
    setDescription('');
    setErr(null);
  }

  async function removeBuilding() {
    if (
      !confirm(
        'Supprimer ce bien et toutes ses unités, baux et loyers associés ? Cette action est définitive.',
      )
    ) {
      return;
    }
    if (!id) return;
    try {
      await api(`/buildings/${id}`, { method: 'DELETE' });
      navigate('/biens');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Suppression impossible.');
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Chargement du bien">
        <div className="animate-pulse space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-5 dark:border-slate-700 dark:bg-slate-900/60 sm:p-6">
          <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-8 max-w-md rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 max-w-sm rounded bg-slate-200/80 dark:bg-slate-700/80" />
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="h-7 w-20 rounded-full bg-slate-200/90 dark:bg-slate-700" />
            <div className="h-7 w-28 rounded-full bg-slate-200/90 dark:bg-slate-700" />
          </div>
        </div>
        <div className="h-36 animate-pulse rounded-2xl border border-slate-200/60 bg-slate-100/50 dark:border-slate-700 dark:bg-slate-900/40" />
        <div className="h-52 animate-pulse rounded-2xl border border-slate-200/60 bg-slate-100/50 dark:border-slate-700 dark:bg-slate-900/40" />
        <p className="sr-only">Chargement du bien…</p>
      </div>
    );
  }

  if (loadError || !b) {
    return (
      <Card>
        <p className="font-medium text-red-700 dark:text-red-400">{loadError ?? 'Bien introuvable.'}</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Vérifiez que l’API tourne, que vous êtes connecté, et que la base est à jour ({' '}
          <code className="rounded bg-slate-200 px-1 dark:bg-slate-800 dark:text-slate-200">npx prisma migrate deploy</code> ).
        </p>
        <PageDetailBackLink to={back.href}>Retour vers {back.label}</PageDetailBackLink>
      </Card>
    );
  }

  const locParts = [b.commune, b.city].filter(Boolean);
  const locLine = locParts.length ? locParts.join(', ') : '—';
  const addressParts = [b.address, b.postalCode].filter(Boolean);
  const addressLine = addressParts.length ? addressParts.join(' · ') : '';
  const structureTypeHint = immeubleLocked
    ? b.structureKind === 'TERRAIN_LOTS'
      ? 'Ce terrain est en multi-lots : le type ne peut plus être repassé en « un seul lot ».'
      : 'Ce bien est enregistré comme immeuble : le type ne peut plus être repassé en « un seul lot ».'
    : (BUILDING_STRUCTURE_OPTIONS.find((o) => o.value === structureKindDraft)?.description ?? '');
  const carnetHint =
    immeubleFloorPickerActive && b
      ? (b.apartmentCount != null && b.apartmentCount > 0
          ? `Carnet : ${b.floorCount} niveau(x) d’étage (RDC + étages 1…${b.floorCount}), ${b.apartmentCount} place(s) numérotées pour les appartements. Les numéros déjà pris sont masqués.`
          : `Carnet : ${b.floorCount} niveau(x) d’étage — choisissez le rez-de-chaussée ou l’étage dans la liste, puis le n° d’appartement. Pour un menu 1…N, renseignez aussi le nombre d’appartements dans « Organisation du bien ».`)
      : '';
  const terrainCarnetHint =
    terrainPlanActive && b
      ? `${b.terrainLotCount} lot(s) déclaré(s) sur ce terrain : ajoutez au plus une unité par numéro (unité 1, unité 2…). Les numéros déjà utilisés sont masqués ; pas d’étage.`
      : '';

  return (
    <div className="space-y-6">
      <PageDetailHero
        backHref={back.href}
        backLabel={back.label}
        breadcrumbCurrent={b.name}
        headerEnd={
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="gap-1.5 py-2 text-sm font-semibold sm:self-auto"
              onClick={openAddUnitForm}
            >
              <span className="text-base leading-none" aria-hidden>
                +
              </span>
              Ajouter une unité
            </Button>
            <Button variant="danger" className="py-2 text-sm sm:self-auto" onClick={removeBuilding}>
              Supprimer le bien
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex flex-1 gap-3 sm:gap-4">
            <div className="flex shrink-0 flex-col items-center gap-2 sm:flex-row sm:items-start sm:gap-3">
              <div
                className="flex size-[3.15rem] shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-gradient-to-br from-brand-50 via-white to-sky-50/90 text-brand-700 shadow-md shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.03] dark:border-slate-600 dark:from-brand-950/50 dark:via-slate-900 dark:to-slate-800/90 dark:text-brand-300 dark:ring-white/[0.04] sm:size-[3.35rem]"
                aria-hidden
                title="Biens"
              >
                <SidebarNavIcon to="/biens" className="size-6 sm:size-[1.6rem]" />
              </div>
              <BuildingHeroIcon structureKind={b.structureKind} />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
                {b.name}
              </h1>
              <p className="text-sm font-medium leading-snug text-slate-700 dark:text-slate-300">{locLine}</p>
              {addressLine ? (
                <p className="text-sm leading-snug text-slate-600 dark:text-slate-400">{addressLine}</p>
              ) : (
                <p className="text-sm italic text-slate-500 dark:text-slate-500">Adresse non renseignée</p>
              )}
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{b.country}</p>
              <div className="flex flex-wrap gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-700">
                {b.structureKind === 'IMMEUBLE' ? (
                  <>
                    <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-900 dark:bg-sky-950/60 dark:text-sky-200">
                      Immeuble multi-lots
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      {b.floorCount != null
                        ? `${b.floorCount} étage${b.floorCount !== 1 ? 's' : ''}`
                        : 'Étages non renseignés'}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      {b.apartmentCount != null
                        ? `${b.apartmentCount} app. carnet`
                        : 'Carnet non renseigné'}
                    </span>
                  </>
                ) : b.structureKind === 'TERRAIN_LOTS' ? (
                  <>
                    <span className="inline-flex items-center rounded-full bg-lime-100 px-2.5 py-0.5 text-xs font-semibold text-lime-950 dark:bg-lime-950/55 dark:text-lime-100">
                      Terrain multi-lots
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      {b.terrainLotCount != null
                        ? `${b.terrainLotCount} lot${b.terrainLotCount !== 1 ? 's' : ''} déclaré${b.terrainLotCount !== 1 ? 's' : ''}`
                        : 'Lots non renseignés'}
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                    Un seul lot
                  </span>
                )}
                <span className="inline-flex items-center rounded-full border border-emerald-600/90 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 dark:border-emerald-600/50 dark:bg-emerald-950/50 dark:text-emerald-200">
                  {b.units.length} unité{b.units.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          {buildingStats ? (
            <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto lg:max-w-xl lg:grid-cols-3">
              <StatTile label="Unités" value={String(buildingStats.total)} />
              <StatTile
                label="Avec locataire"
                value={String(buildingStats.occupied)}
                sub={buildingStats.total ? `${Math.round((buildingStats.occupied / buildingStats.total) * 100)} % du bien` : undefined}
              />
              <StatTile label="Sans bail actif" value={String(buildingStats.vacant)} />
              <StatTile
                label="Revenu mensuel"
                value={fcfa(Math.round(buildingStats.monthlyRentTotal))}
                sub="Somme des loyers (baux actifs)"
              />
              <StatTile
                label="Surface déclarée"
                value={buildingStats.surfaceLabel}
                sub={
                  buildingStats.surfaceCount > 0
                    ? `sur ${buildingStats.surfaceCount} lot${buildingStats.surfaceCount !== 1 ? 's' : ''}`
                    : 'renseignez les m² par unité'
                }
              />
            </div>
          ) : null}
        </div>
      </PageDetailHero>

      {focusUnitId ? (
        <div
          className="rounded-xl border border-brand-200/90 bg-gradient-to-br from-brand-50/95 to-white px-4 py-3.5 shadow-sm dark:border-brand-500/35 dark:from-brand-950/45 dark:to-slate-900/85"
          role="status"
        >
          <p className="text-sm font-semibold text-brand-950 dark:text-brand-100">Unité précise mise en avant</p>
          <p className="mt-1.5 text-sm leading-snug text-slate-800 dark:text-slate-200">
            Cette fiche bien affiche <strong className="font-semibold text-slate-900 dark:text-slate-50">toutes les unités</strong>
            ; la liste ci-dessous a été défilée vers{' '}
            <strong className="font-semibold text-slate-900 dark:text-slate-50">
              {unitFocusTitle || `l’unité (${focusUnitId.slice(0, 8)}…)`}
            </strong>
            .
          </p>
          <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
            {returnLocation.startsWith('/locations/') ? (
              <Link
                to={returnLocation}
                className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
              >
                ← Retour à la fiche location
              </Link>
            ) : null}
            <button
              type="button"
              className="font-semibold text-slate-700 underline-offset-2 hover:underline dark:text-slate-300"
              onClick={clearUnitFocus}
            >
              Afficher la fiche bien sans mise au point
            </button>
          </p>
        </div>
      ) : null}

      <nav
        aria-label="Sections de la fiche"
        className="flex flex-wrap gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/50"
      >
        <a
          href="#fiche-organisation"
          className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-900/5 transition hover:text-brand-700 dark:bg-slate-800 dark:text-slate-200 dark:ring-white/10 dark:hover:text-brand-400"
        >
          Organisation
        </a>
        <a
          href="#fiche-nouvelle-unite"
          className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-900/5 transition hover:text-brand-700 dark:bg-slate-800 dark:text-slate-200 dark:ring-white/10 dark:hover:text-brand-400"
          onClick={(e) => {
            e.preventDefault();
            openAddUnitForm();
          }}
        >
          Nouvelle unité
        </a>
        <a
          href="#fiche-unites"
          className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-900/5 transition hover:text-brand-700 dark:bg-slate-800 dark:text-slate-200 dark:ring-white/10 dark:hover:text-brand-400"
        >
          Liste des unités
        </a>
      </nav>

      <Card id="fiche-organisation" className="scroll-mt-24">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Organisation du bien</h2>
          <HelpHint title={ORG_SECTION_HINT} className="align-middle" />
        </div>
        <form
          onSubmit={saveBuildingProfile}
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <div className="min-w-[min(100%,20rem)] flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Label htmlFor="building-structure-kind" className="mb-0">
                Type
              </Label>
              <HelpHint title={structureTypeHint} className="align-middle" />
            </div>
            {immeubleLocked ? (
              <p
                id="building-structure-kind"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200"
              >
                {b.structureKind === 'TERRAIN_LOTS'
                  ? 'Terrain multi-lots (plusieurs parcelles / baux)'
                  : 'Immeuble ou bâtiment multi-lots'}
              </p>
            ) : (
              <Select
                id="building-structure-kind"
                value={structureKindDraft}
                onChange={(e) => setStructureKindDraft(e.target.value as BuildingStructureValue)}
              >
                {BUILDING_STRUCTURE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </div>
          {structureKindDraft === 'IMMEUBLE' ? (
            <>
              <div className="w-full min-w-[8rem] sm:w-auto">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <Label htmlFor="building-floor-count" className="mb-0">
                    Étages (indicatif)
                  </Label>
                  <HelpHint
                    title="Nombre d’étages indicatif pour le carnet d’appartements."
                    className="align-middle"
                  />
                </div>
                <Input
                  id="building-floor-count"
                  type="number"
                  min={0}
                  value={floorCountDraft}
                  onChange={(e) => setFloorCountDraft(e.target.value)}
                  placeholder="—"
                />
              </div>
              <div className="w-full min-w-[8rem] sm:w-auto">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <Label htmlFor="building-apartment-count" className="mb-0">
                    Appartements (indicatif)
                  </Label>
                  <HelpHint
                    title="À l’ajout d’unités, les numéros d’appartement déjà attribués sont masqués."
                    className="align-middle"
                  />
                </div>
                <Input
                  id="building-apartment-count"
                  type="number"
                  min={0}
                  value={apartmentCountDraft}
                  onChange={(e) => setApartmentCountDraft(e.target.value)}
                  placeholder="—"
                />
              </div>
            </>
          ) : structureKindDraft === 'TERRAIN_LOTS' ? (
            <div className="w-full min-w-[10rem] sm:max-w-xs">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <Label htmlFor="building-terrain-lot-count" className="mb-0">
                  Lots sur le terrain (indicatif)
                </Label>
                <HelpHint
                  title="Nombre de lots prévus sur ce terrain (parcelles, emplacements, etc.). Indicatif : les baux restent liés aux unités créées."
                  className="align-middle"
                />
              </div>
              <Input
                id="building-terrain-lot-count"
                type="number"
                min={0}
                value={terrainLotCountDraft}
                onChange={(e) => setTerrainLotCountDraft(e.target.value)}
                placeholder="Ex. 5"
              />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="py-2" disabled={structureSaving || !buildingProfileDirty}>
              {structureSaving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="py-2"
              disabled={structureSaving || !buildingProfileDirty}
              onClick={resetBuildingProfileFromLoaded}
            >
              Annuler
            </Button>
          </div>
        </form>
        {structureErr && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{structureErr}</p>}
      </Card>

      <div ref={addUnitFormRef} id="fiche-nouvelle-unite" className="scroll-mt-24">
        <Card className="!p-0 overflow-hidden">
          <button
            type="button"
            onClick={() => setAddUnitFormOpen((o) => !o)}
            aria-expanded={addUnitFormOpen}
            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50/95 dark:hover:bg-slate-800/60 sm:px-5 sm:py-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/12 text-lg font-bold leading-none text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                +
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nouvelle unité</h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {addUnitFormOpen ? 'Masquer le formulaire' : 'Afficher le formulaire d’ajout'}
                </p>
              </div>
            </div>
            <svg
              className={`size-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500 ${addUnitFormOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {addUnitFormOpen ? (
            <div className="border-t border-slate-200/90 px-4 pb-5 pt-2 dark:border-slate-700 sm:px-5">
              <div className="mb-3 flex flex-wrap items-center gap-2 pt-2">
                <HelpHint title={UNIT_SECTION_HINT} className="align-middle" />
                {immeubleFloorPickerActive && kind === 'APARTMENT' ? (
                  <HelpHint title={carnetHint} className="align-middle" />
                ) : null}
                {terrainPlanActive ? <HelpHint title={terrainCarnetHint} className="align-middle" /> : null}
              </div>
              {terrainLotsFull ? (
                <p className="flex flex-wrap items-center gap-2 text-sm text-amber-800 dark:text-amber-200/90">
                  <span>
                    Nombre maximum d’unités atteint ({b!.terrainLotCount} lot
                    {b!.terrainLotCount !== 1 ? 's' : ''} déclaré{b!.terrainLotCount !== 1 ? 's' : ''} sur ce terrain).
                  </span>
                  <HelpHint title="Pour ajouter un lot, augmentez d’abord le nombre de lots dans « Organisation du bien », ou supprimez une unité existante." />
                </p>
              ) : b.structureKind === 'MONO_LOT' && b.units.length >= 1 ? (
                <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span>Ce bien est en un seul lot : une seule unité suffit.</span>
                  <HelpHint title="Pour plusieurs lots sur le même terrain ou le même bâtiment, passez le type à « Immeuble ou bâtiment multi-lots » ou « Terrain multi-lots » dans Organisation du bien." />
                </p>
              ) : (
                <div className="rounded-xl border border-slate-200/75 bg-slate-50/70 p-4 shadow-inner shadow-slate-900/[0.02] dark:border-slate-600/70 dark:bg-slate-800/35 dark:shadow-none sm:p-5">
              <form onSubmit={addUnit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-slate-200/90 bg-white/70 p-3 shadow-sm dark:border-slate-600 dark:bg-slate-900/50">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    1. Nature du local
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Indiquez si ce lot est un appartement, une maison, un bureau, un entrepôt, un commerce, un terrain, etc. Vous pourrez ajouter d’autres unités avec un autre type sur le même bien.
                  </p>
                  <div className="mt-3 max-w-md">
                    <div className="mb-1 flex items-center gap-1.5">
                      <Label htmlFor="new-unit-kind" className="mb-0">
                        Type de local
                      </Label>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">*</span>
                    </div>
                    <Select id="new-unit-kind" value={kind} onChange={(e) => setKind(e.target.value)} required>
                      {UNIT_KIND_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    2. Emplacement sur le bien
                  </p>
                  {terrainPlanActive && !terrainLotsFull ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      Le <strong className="font-medium text-slate-800 dark:text-slate-200">numéro de lot</strong> et le
                      rappel du nombre de lots déclarés se trouvent{' '}
                      <strong className="font-medium text-slate-800 dark:text-slate-200">en bas du formulaire</strong>{' '}
                      (après les caractéristiques).
                    </p>
                  ) : null}
                </div>
                {immeubleFloorPickerActive && kind === 'APARTMENT' ? (
                  <>
                    <div>
                      <Label htmlFor="immeuble-etage">Étage</Label>
                      <Select
                        id="immeuble-etage"
                        value={immeubleEtage}
                        onChange={(e) => setImmeubleEtage(e.target.value)}
                        required
                      >
                        <option value="">Choisir…</option>
                        <option value="0">Rez-de-chaussée</option>
                        {Array.from({ length: b.floorCount ?? 0 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={String(n)}>
                            Étage {n}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="immeuble-app-no">N° appartement</Label>
                      {immeubleSlotPickerActive ? (
                        <>
                          <Select
                            id="immeuble-app-no"
                            value={immeubleAppNo}
                            onChange={(e) => setImmeubleAppNo(e.target.value)}
                            required
                          >
                            <option value="">Choisir…</option>
                            {Array.from({ length: b.apartmentCount ?? 0 }, (_, i) => i + 1)
                              .filter((n) => !usedApartmentSlots.has(n))
                              .map((n) => (
                                <option key={n} value={String(n)}>
                                  Appartement n° {n}
                                </option>
                              ))}
                          </Select>
                          {Array.from({ length: b.apartmentCount ?? 0 }, (_, i) => i + 1).every((n) =>
                            usedApartmentSlots.has(n),
                          ) && (
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                              Tous les numéros du carnet sont déjà attribués.
                            </p>
                          )}
                        </>
                      ) : (
                        <Input
                          id="immeuble-app-no"
                          type="number"
                          min={1}
                          step={1}
                          value={immeubleAppNo}
                          onChange={(e) => setImmeubleAppNo(e.target.value)}
                          required
                          placeholder="Ex. 12"
                        />
                      )}
                    </div>
                  </>
                ) : null}
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    3. Libellé
                  </p>
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Label htmlFor="new-unit-label" className="mb-0">
                      Nom ou référence du local
                    </Label>
                    {immeubleFloorPickerActive && kind === 'APARTMENT' ? (
                      <HelpHint title="Rempli automatiquement à partir de l'étage et du numéro d'appartement ; vous pouvez le modifier." />
                    ) : terrainPlanActive ? (
                      <HelpHint title="Rempli automatiquement à partir du numéro d’unité ; vous pouvez le modifier." />
                    ) : null}
                  </div>
                  <Input
                    id="new-unit-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    required
                    placeholder="A12, Bureau 2, Entrepôt B…"
                  />
                </div>
                {!(immeubleFloorPickerActive && kind === 'APARTMENT') && !terrainPlanActive ? (
                  <div>
                    <Label>Étage (si pertinent)</Label>
                    <Input value={floor} onChange={(e) => setFloor(e.target.value)} type="number" />
                  </div>
                ) : null}

                <div className="sm:col-span-2 border-t border-slate-200/80 pt-4 lg:col-span-3 dark:border-slate-600/80">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    4. Caractéristiques
                  </p>
                </div>
                <div>
                  <Label>Surface m²</Label>
                  <Input value={surfaceM2} onChange={(e) => setSurfaceM2(e.target.value)} type="number" step="0.01" />
                </div>
                <div>
                  <Label>Nombre de pièces</Label>
                  <Input value={rooms} onChange={(e) => setRooms(e.target.value)} type="number" />
                </div>
                <div className="sm:col-span-full">
                  <Label>Description simple (optionnel)</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex. balcon, parking, cave…"
                  />
                </div>
                {terrainPlanActive && !terrainLotsFull && terrainLotRecap ? (
                  <div className="sm:col-span-full space-y-3 rounded-xl border-2 border-lime-300/80 bg-lime-50/95 p-4 shadow-sm dark:border-lime-700/60 dark:bg-lime-950/40">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-lime-900 dark:text-lime-200">
                        Lots du terrain (rappel)
                      </p>
                      <p className="mt-1.5 text-base font-semibold tabular-nums text-lime-950 dark:text-lime-50">
                        {terrainLotRecap.n} lot{terrainLotRecap.n !== 1 ? 's' : ''} déclaré
                        {terrainLotRecap.n !== 1 ? 's' : ''} sur ce bien — n° 1 à {terrainLotRecap.n}
                      </p>
                      <p className="mt-1 text-sm text-lime-900/90 dark:text-lime-200/95">
                        {terrainLotRecap.created} unité{terrainLotRecap.created !== 1 ? 's' : ''} déjà créée
                        {terrainLotRecap.created !== 1 ? 's' : ''}
                        {terrainLotRecap.free > 0
                          ? ` · ${terrainLotRecap.free} emplacement${terrainLotRecap.free !== 1 ? 's' : ''} encore libre${terrainLotRecap.free !== 1 ? 's' : ''}`
                          : ''}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="terrain-lot-no">Numéro de lot pour cette unité</Label>
                      <Select
                        id="terrain-lot-no"
                        value={terrainLotNo}
                        onChange={(e) => setTerrainLotNo(e.target.value)}
                        required
                        className="mt-1.5 max-w-md"
                      >
                        <option value="">Choisir le numéro (1…{terrainLotRecap.n})</option>
                        {Array.from({ length: b!.terrainLotCount ?? 0 }, (_, i) => i + 1)
                          .filter((n) => !usedApartmentSlots.has(n))
                          .map((n) => (
                            <option key={n} value={String(n)}>
                              Lot n° {n}
                            </option>
                          ))}
                      </Select>
                      {Array.from({ length: b!.terrainLotCount ?? 0 }, (_, i) => i + 1).every((n) =>
                        usedApartmentSlots.has(n),
                      ) ? (
                        <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                          Tous les numéros de lot sont déjà attribués.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {err && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-full">{err}</p>}
                <div className="sm:col-span-full flex flex-wrap items-center gap-3">
                  <Button type="submit">Ajouter l&apos;unité</Button>
                  <Button type="button" variant="secondary" onClick={resetAddUnitForm}>
                    Annuler
                  </Button>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Le loyer se saisit dans le <strong className="font-medium text-slate-700 dark:text-slate-300">bail / contrat</strong> (page Baux), pas ici.
                  </p>
                </div>
              </form>
                </div>
              )}
            </div>
          ) : null}
        </Card>
      </div>

      <Card
        id="fiche-unites"
        className="scroll-mt-24 overflow-hidden !p-0 shadow-sm ring-1 ring-slate-900/[0.04] dark:ring-slate-600/35"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200/90 bg-slate-50/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Liste des unités</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Tri par étage et n° de lot. Modifiez la nature du local dans la colonne dédiée.
              </p>
              {b.units.length > 0 && buildingStats ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {tableUnits.length === filteredUnits.length
                    ? `${filteredUnits.length} unité${filteredUnits.length !== 1 ? 's' : ''} affichée${filteredUnits.length !== 1 ? 's' : ''}`
                    : `${tableUnits.length} sur ${filteredUnits.length} affichée${tableUnits.length !== 1 ? 's' : ''}`}
                  {' · '}
                  <span className="text-emerald-700 dark:text-emerald-400">{buildingStats.occupied} louée{buildingStats.occupied !== 1 ? 's' : ''}</span>
                  {' · '}
                  <span>{buildingStats.vacant} libre{buildingStats.vacant !== 1 ? 's' : ''}</span>
                </p>
              ) : null}
            </div>
            {b.units.length > 0 ? (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les unités">
                {(
                  [
                    { key: 'all' as const, label: 'Toutes' },
                    { key: 'vacant' as const, label: 'Libres' },
                    { key: 'occupied' as const, label: 'Louées' },
                  ] as const
                ).map(({ key, label: lbl }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setUnitListFilter(key)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      unitListFilter === key
                        ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-sm dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-100'
                        : 'border-slate-200 bg-slate-100/80 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {b.units.length > 0 ? (
            <div className="relative w-full min-w-0 sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400" aria-hidden>
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" strokeLinecap="round" />
                </svg>
              </span>
              <Input
                type="search"
                value={unitListSearch}
                onChange={(e) => setUnitListSearch(e.target.value)}
                placeholder="Rechercher (libellé, lot, locataire…)"
                className="w-full rounded-lg border-slate-200 py-2 pl-9 pr-8 text-sm dark:border-slate-600"
                aria-label="Filtrer la liste des unités"
                autoComplete="off"
              />
              {unitListSearch.trim() ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  onClick={() => setUnitListSearch('')}
                  aria-label="Effacer la recherche"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {b.units.length > 0 && tableUnits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                  <th className="whitespace-nowrap px-4 py-2.5 sm:px-5">Unité</th>
                  <th className="min-w-[11rem] whitespace-nowrap px-4 py-2.5 sm:px-5">Nature du local</th>
                  <th className="whitespace-nowrap px-4 py-2.5 sm:px-5">Étage</th>
                  <th className="whitespace-nowrap px-4 py-2.5 sm:px-5">Surface</th>
                  <th className="whitespace-nowrap px-4 py-2.5 sm:px-5">Pièces</th>
                  <th className="min-w-[10rem] px-4 py-2.5 sm:px-5">Locataire</th>
                  <th className="whitespace-nowrap px-4 py-2.5 sm:px-5">Loyer</th>
                  <th className="whitespace-nowrap px-4 py-2.5 sm:px-5">Statut</th>
                  <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-right sm:px-5"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tableUnits.map((u) => {
                  const lease0 = u.leases?.[0];
                  const tenant = lease0?.tenant;
                  const rawRent = lease0?.monthlyRent;
                  const rent =
                    rawRent != null && rawRent !== ''
                      ? Number(rawRent)
                      : null;
                  const occupied = unitIsOccupied(u);
                  const fl = floorLabel(u.floor);
                  return (
                    <tr
                      key={u.id}
                      id={`unit-row-${u.id}`}
                      className="align-top transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <div className="min-w-0 max-w-[14rem]">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {u.apartmentSlot != null ? `Lot n° ${u.apartmentSlot}` : 'Unité'}
                          </p>
                          <p className="font-semibold leading-snug text-slate-900 dark:text-slate-100">{u.label}</p>
                          {u.description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{u.description}</p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <Select
                          id={`unit-kind-${u.id}`}
                          value={u.kind ?? 'APARTMENT'}
                          onChange={(e) => void updateUnitKind(u.id, e.target.value)}
                          className="min-w-[10rem] text-xs"
                        >
                          {UNIT_KIND_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300 sm:px-5">{fl ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300 sm:px-5">
                        {u.surfaceM2 != null ? `${Number(u.surfaceM2)} m²` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300 sm:px-5">
                        {u.rooms != null ? u.rooms : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 sm:px-5">
                        {tenant ? (
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {tenant.firstName} {tenant.lastName}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-800 dark:text-slate-200 sm:px-5">
                        {rent != null && Number.isFinite(rent) ? fcfa(rent) : '—'}
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            occupied
                              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                              : 'bg-slate-200/90 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {occupied ? 'Loué' : 'Libre'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right sm:px-5">
                        <div className="inline-flex flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                          {lease0?.id ? (
                            <SmartLink
                              to={`/locations/${lease0.id}`}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-300/90 bg-slate-100/85 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                            >
                              Fiche location
                            </SmartLink>
                          ) : (
                            <SmartLink
                              to={`/baux?buildingId=${encodeURIComponent(b.id)}&unitId=${encodeURIComponent(u.id)}#nouveau-bail`}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-300/90 bg-slate-100/85 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                              title="Ouvrir la création de bail avec ce bien et cette unité déjà sélectionnés"
                            >
                              Baux
                            </SmartLink>
                          )}
                          <Button variant="danger" className="py-1.5 text-xs" onClick={() => removeUnit(u.id)}>
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {b.units.length === 0 && (
          <div className="border-t border-slate-200/80 px-4 py-12 text-center dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">Aucune unité pour ce bien.</p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
              onClick={openAddUnitForm}
            >
              Ajouter une unité
            </button>
          </div>
        )}
        {b.units.length > 0 && filteredUnits.length === 0 && (
          <div className="border-t border-slate-200/80 px-4 py-10 text-center dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucune unité dans cette vue — choisissez « Toutes » ou un autre filtre.</p>
          </div>
        )}
        {b.units.length > 0 && filteredUnits.length > 0 && tableUnits.length === 0 && (
          <div className="border-t border-slate-200/80 px-4 py-10 text-center dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucun résultat pour cette recherche.</p>
            <Button type="button" variant="secondary" className="mt-3 py-2 text-xs" onClick={() => setUnitListSearch('')}>
              Effacer la recherche
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
