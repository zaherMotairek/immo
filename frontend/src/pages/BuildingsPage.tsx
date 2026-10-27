import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SmartLink } from '@/components/SmartLink';
import { useReturnRowFocus } from '@/hooks/useReturnRowFocus';
import { api } from '@/lib/api';
import { COMMUNE_SUGGESTIONS, IVORY_COAST_CITIES } from '@/lib/ciLocation';
import { AppPageTitle } from '@/components/AppPageTitle';
import { PdfPrintButton } from '@/components/PdfPrintButton';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { Button, Card, HelpHint, Input, Label, Select, StatTile } from '@/components/ui';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { useEscapeCancel } from '@/lib/useEscapeCancel';
import { isSafeInternalReturnPath, navigateAfterCreate } from '@/lib/navigation';
import {
  OdooActionBar,
  OdooKanbanBoard,
  OdooKanbanCard,
  OdooKanbanColumn,
  OdooListToolbar,
  type OdooViewMode,
} from '@/components/OdooKit';
import {
  BUILDING_STRUCTURE_OPTIONS,
  IMMEUBLE_LOGEMENTS_PAR_ETAGE_HINT,
  IMMEUBLE_FLOORS_HINT,
  IMMEUBLE_REZ_APARTMENTS_HINT,
  IMMEUBLE_RDC_CHECKBOX_HINT,
  type BuildingStructureValue,
} from '@/lib/buildingStructure';
import {
  listTableCellClass,
  listTableClassName,
  listTableDataRowClass,
  listTableFirstCellClass,
  listTableRowOpenableClass,
  onListRowClick,
} from '@/lib/listTableStyles';

type BuildingRow = {
  id: string;
  name: string;
  city: string;
  commune?: string | null;
  postalCode: string | null;
  structureKind?: BuildingStructureValue;
  floorCount?: number | null;
  apartmentCount?: number | null;
  apartmentsPerFloor?: number | null;
  terrainLotCount?: number | null;
  _count: { units: number };
};

const STRUCTURE_QUERY_VALUES = ['IMMEUBLE', 'TERRAIN_LOTS', 'MONO_LOT'] as const satisfies readonly BuildingStructureValue[];

function normalizeGenreParam(raw: string | null): BuildingStructureValue | null {
  if (!raw?.trim()) return null;
  const k = raw.trim().toUpperCase();
  return (STRUCTURE_QUERY_VALUES as readonly string[]).includes(k) ? (k as BuildingStructureValue) : null;
}

function structureKindShort(k?: BuildingStructureValue | string | null) {
  if (k === 'IMMEUBLE') return 'Multi locataires';
  if (k === 'TERRAIN_LOTS') return 'Terrain multi loc.';
  return 'Un seul lot';
}

function buildingDetailsText(b: BuildingRow): string {
  if (b.structureKind === 'IMMEUBLE') {
    const parts: string[] = [];
    if (b.floorCount != null) parts.push(`${b.floorCount} ét.`);
    if (b.apartmentsPerFloor != null && b.apartmentsPerFloor > 0) parts.push(`${b.apartmentsPerFloor}/ét.`);
    if (b.apartmentCount != null) parts.push(`${b.apartmentCount} app.`);
    return parts.length ? parts.join(' · ') : '—';
  }
  if (b.structureKind === 'TERRAIN_LOTS' && b.terrainLotCount != null) {
    return `${b.terrainLotCount} lot${b.terrainLotCount !== 1 ? 's' : ''} décl.`;
  }
  return '—';
}

function BuildingCardIcon({ structureKind }: { structureKind?: BuildingStructureValue | string | null }) {
  if (structureKind === 'IMMEUBLE') {
    return (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M3 21h18M6 21V10l6-3.5L18 10v11M10 21v-5h4v5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  if (structureKind === 'TERRAIN_LOTS') {
    return (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-lime-100 text-lime-900 dark:bg-lime-950/45 dark:text-lime-200">
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M4 20h16M6 20V10l4-6 4 4 4-4v16" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 14h2M12 12h2M16 14h2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/45 dark:text-amber-200">
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function BuildingsPage() {
  useRegisterRootSectionFallback();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnLocationParam = searchParams.get('returnLocation')?.trim() ?? '';
  const returnAfterBuildingCreateRef = useRef<string | null>(null);
  const genreFilter = useMemo(() => normalizeGenreParam(searchParams.get('genre')), [searchParams]);

  function selectGenreFilter(next: BuildingStructureValue) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('kind');
        p.set('genre', next);
        return p;
      },
      { replace: true },
    );
  }

  function clearGenreFilter() {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('genre');
        p.delete('kind');
        return p;
      },
      { replace: true },
    );
  }

  const [rows, setRows] = useState<BuildingRow[]>([]);
  const [listFetched, setListFetched] = useState(false);
  const [name, setName] = useState('');
  const [cityChoice, setCityChoice] = useState<string>(IVORY_COAST_CITIES[0]);
  const [cityOther, setCityOther] = useState('');
  const [communeChoice, setCommuneChoice] = useState<string>(COMMUNE_SUGGESTIONS[0]);
  const [communeOther, setCommuneOther] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [structureKind, setStructureKind] = useState<BuildingStructureValue>('MONO_LOT');
  const [floorCountImmeuble, setFloorCountImmeuble] = useState('');
  const [includeRezDeChaussee, setIncludeRezDeChaussee] = useState(true);
  const [apartmentsPerFloorImmeuble, setApartmentsPerFloorImmeuble] = useState('');
  const [rezApartmentImmeuble, setRezApartmentImmeuble] = useState('');
  const [terrainLotCountNew, setTerrainLotCountNew] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [listErr, setListErr] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [viewMode, setViewMode] = useState<OdooViewMode>('list');
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [structureSettingsOpen, setStructureSettingsOpen] = useState(false);
  const addFormRef = useRef<HTMLDivElement | null>(null);

  function openAddForm() {
    setAddFormOpen(true);
    window.requestAnimationFrame(() => {
      addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function resetNewBuildingForm() {
    setName('');
    setCityChoice(IVORY_COAST_CITIES[0]);
    setCityOther('');
    setCommuneChoice(COMMUNE_SUGGESTIONS[0]);
    setCommuneOther('');
    setAddress('');
    setPostalCode('');
    setStructureKind('MONO_LOT');
    setFloorCountImmeuble('');
    setIncludeRezDeChaussee(true);
    setApartmentsPerFloorImmeuble('');
    setRezApartmentImmeuble('');
    setTerrainLotCountNew('');
    setStructureSettingsOpen(false);
    setErr(null);
  }

  function cancelNewBuilding() {
    resetNewBuildingForm();
    setAddFormOpen(false);
    returnAfterBuildingCreateRef.current = null;
    if (searchParams.get('returnLocation')) {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete('returnLocation');
          return p;
        },
        { replace: true },
      );
    }
    if (window.location.hash === '#nouveau-bien') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  useEscapeCancel(addFormOpen, cancelNewBuilding);

  const load = useCallback(() => {
    const q = genreFilter ? `?structureKind=${encodeURIComponent(genreFilter)}` : '';
    setListErr(null);
    setListFetched(false);
    api<BuildingRow[]>(`/buildings${q}`)
      .then((data) => {
        setRows(data);
        setListErr(null);
      })
      .catch((e) => {
        setRows([]);
        setListErr(
          e instanceof Error
            ? e.message
            : 'Impossible de charger les biens. Vérifiez la connexion et que l’API répond (terminal backend).',
        );
      })
      .finally(() => setListFetched(true));
  }, [genreFilter]);

  const flashBuildingId = useReturnRowFocus({ rowIdPrefix: 'bien-row-', ready: listFetched });

  function bienRowFlashClass(active: boolean) {
    return active
      ? 'ring-2 ring-inset ring-brand-500/90 bg-brand-50/90 shadow-[0_0_0_1px_rgba(59,130,246,0.35)] dark:bg-brand-950/45 dark:ring-brand-400/80'
      : '';
  }

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (returnLocationParam && isSafeInternalReturnPath(returnLocationParam)) {
      returnAfterBuildingCreateRef.current = returnLocationParam;
    } else {
      returnAfterBuildingCreateRef.current = null;
    }
  }, [returnLocationParam]);

  useEffect(() => {
    if (window.location.hash === '#nouveau-bien') {
      setAddFormOpen(true);
    }
  }, []);

  async function requestDeleteBuilding(b: BuildingRow) {
    const n = b._count.units;
    const msg =
      n > 0
        ? `Supprimer « ${b.name} », ses ${n} unité${n !== 1 ? 's' : ''} et toutes les données liées (baux, loyers) ? Cette action est irréversible.`
        : `Supprimer définitivement le bien « ${b.name} » ? Cette action est irréversible.`;
    const ok = await confirmDialog({
      title: 'Supprimer le bien',
      message: msg,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api(`/buildings/${b.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Suppression impossible.', { variant: 'error' });
    }
  }

  function resolvedCity() {
    return cityChoice === 'Autre' ? cityOther.trim() : cityChoice;
  }

  function resolvedCommune() {
    return communeChoice === 'Autre' ? communeOther.trim() : communeChoice;
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const city = resolvedCity();
    const commune = resolvedCommune();
    if (!city || !commune) {
      setErr('Indiquez une ville et une commune / zone.');
      return;
    }
    if (structureKind === 'IMMEUBLE') {
      const fc = floorCountImmeuble.trim() === '' ? NaN : Number(floorCountImmeuble);
      const pf = apartmentsPerFloorImmeuble.trim() === '' ? NaN : Number(apartmentsPerFloorImmeuble);
      if (!Number.isInteger(fc) || fc < 1 || !Number.isInteger(pf) || pf < 1) {
        setErr(
          'Pour un immeuble, indiquez au moins un étage au-dessus du RDC et au moins un logement par étage (nombres entiers).',
        );
        return;
      }
      if (includeRezDeChaussee && rezApartmentImmeuble.trim() !== '') {
        const rz = Number(rezApartmentImmeuble);
        if (!Number.isInteger(rz) || rz < 0) {
          setErr('Le nombre d’unités au rez-de-chaussée doit être un entier positif ou zéro.');
          return;
        }
      }
    }
    try {
      await api('/buildings', {
        method: 'POST',
        json: {
          name,
          city,
          commune,
          address: address.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          structureKind,
          ...(structureKind === 'IMMEUBLE'
            ? {
                floorCount: Number(floorCountImmeuble),
                hasRezDeChaussee: includeRezDeChaussee,
                apartmentsPerFloor: Number(apartmentsPerFloorImmeuble),
                rezApartmentCount: includeRezDeChaussee
                  ? rezApartmentImmeuble.trim() === ''
                    ? undefined
                    : Number(rezApartmentImmeuble)
                  : undefined,
              }
            : {}),
          ...(structureKind === 'TERRAIN_LOTS'
            ? {
                terrainLotCount: terrainLotCountNew.trim() === '' ? undefined : Number(terrainLotCountNew),
              }
            : {}),
        },
      });
      const back = returnAfterBuildingCreateRef.current;
      returnAfterBuildingCreateRef.current = null;
      setName('');
      setAddress('');
      setPostalCode('');
      setCityOther('');
      setCommuneOther('');
      setFloorCountImmeuble('');
      setIncludeRezDeChaussee(true);
      setApartmentsPerFloorImmeuble('');
      setRezApartmentImmeuble('');
      setTerrainLotCountNew('');
      setAddFormOpen(false);
      if (back) {
        navigateAfterCreate(navigate, back);
      } else {
        load();
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  const filterHint = genreFilter
    ? 'Filtre par genre de bien (structure) : immeuble multi locataires, terrain avec plusieurs locataires ou un seul lot — comme dans « Nouveau bien ».'
    : '« Tous les biens » : aucun filtre. Choisissez un genre pour restreindre la liste.';

  const immeubleCreateTotalPreview = useMemo(() => {
    const fc = floorCountImmeuble.trim() === '' ? NaN : Number(floorCountImmeuble);
    const pf = apartmentsPerFloorImmeuble.trim() === '' ? NaN : Number(apartmentsPerFloorImmeuble);
    if (!Number.isInteger(fc) || fc < 1 || !Number.isInteger(pf) || pf < 1) return null;
    const rz =
      includeRezDeChaussee && rezApartmentImmeuble.trim() !== ''
        ? Math.max(0, Math.floor(Number(rezApartmentImmeuble)))
        : 0;
    return fc * pf + (includeRezDeChaussee ? rz : 0);
  }, [floorCountImmeuble, apartmentsPerFloorImmeuble, includeRezDeChaussee, rezApartmentImmeuble]);

  const filteredRows = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((b) => {
      const loc = [b.commune ?? '', b.city, b.postalCode ?? ''].filter(Boolean).join(' ');
      const hay = `${b.name} ${loc} ${structureKindShort(b.structureKind)} ${b.structureKind ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, listSearch]);

  const totalUnits = useMemo(() => rows.reduce((s, b) => s + b._count.units, 0), [rows]);
  const totalUnitsFiltered = useMemo(
    () => filteredRows.reduce((s, b) => s + b._count.units, 0),
    [filteredRows],
  );

  const worksheetPdfPath = useMemo(() => {
    const q = new URLSearchParams();
    if (genreFilter) q.set('structureKind', genreFilter);
    const s = listSearch.trim();
    if (s) q.set('q', s);
    const qs = q.toString();
    return `/buildings/worksheet.pdf${qs ? `?${qs}` : ''}`;
  }, [genreFilter, listSearch]);

  const kanbanColumns = useMemo(() => {
    const groups: Record<BuildingStructureValue, BuildingRow[]> = {
      IMMEUBLE: [],
      TERRAIN_LOTS: [],
      MONO_LOT: [],
    };
    for (const row of filteredRows) {
      const kind = row.structureKind ?? 'MONO_LOT';
      groups[kind].push(row);
    }
    return groups;
  }, [filteredRows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <AppPageTitle
          className="max-w-3xl"
          iconTo="/biens"
          title="Biens immobiliers"
          hintTitle="Immeuble collectif, villa, entrepôt, terrain… même principe : nom du site + localisation (Côte d’Ivoire). Supprimer un bien : bouton en bas de carte (supprime aussi unités, baux et loyers liés)."
          titleExtra={<StatTile className="shrink-0" label="Total" value={String(rows.length)} />}
        />
        <Button type="button" variant="secondary" className="gap-1.5 py-2 text-sm font-semibold" onClick={() => openAddForm()}>
          <span className="text-base leading-none" aria-hidden>
            +
          </span>
          Ajouter un bien
        </Button>
      </div>

      <div ref={addFormRef} id="nouveau-bien" className="scroll-mt-24">
        <Card className="!p-0 overflow-hidden">
          <button
            type="button"
            onClick={() => setAddFormOpen((o) => !o)}
            aria-expanded={addFormOpen}
            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50/95 dark:hover:bg-slate-800/60 sm:px-5 sm:py-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/12 text-lg font-bold leading-none text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                +
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nouveau bien</h2>
              </div>
            </div>
            <svg
              className={`size-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500 ${addFormOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {addFormOpen ? (
            <div className="border-t border-slate-200/90 px-4 pb-5 pt-2 dark:border-slate-700 sm:px-5">
              <div className="mb-4 flex flex-wrap items-center gap-2 pt-2">
                <HelpHint
                  className="align-middle"
                  title="Immeuble multi locataires ou terrain avec plusieurs locataires : un seul bien avec plusieurs unités et plusieurs baux. Villa, entrepôt entier ou parcelle unique sans découpe : un seul lot, une unité, un bail."
                />
              </div>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-xl border border-slate-200/90 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-900/40">
            <button
              type="button"
              onClick={() => setStructureSettingsOpen((v) => !v)}
              aria-expanded={structureSettingsOpen}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Organisation du bien (optionnel)
              </span>
              <svg
                className={`size-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${
                  structureSettingsOpen ? 'rotate-180' : ''
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {structureSettingsOpen ? (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <Label className="mb-0">Genre de bien</Label>
                    <HelpHint
                      className="align-middle"
                      title={BUILDING_STRUCTURE_OPTIONS.find((o) => o.value === structureKind)?.description ?? ''}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Genre de bien">
                    {BUILDING_STRUCTURE_OPTIONS.map((o) => {
                      const on = structureKind === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setStructureKind(o.value)}
                          className={`rounded-xl border-2 p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                            on
                              ? 'border-brand-600 bg-brand-50 shadow-sm dark:border-brand-500 dark:bg-brand-950/40'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900/80 dark:hover:border-slate-500 dark:hover:bg-slate-800/80'
                          }`}
                        >
                          <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">{o.cardTitle}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {structureKind === 'IMMEUBLE' ? (
                  <div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Label htmlFor="new-building-floors" className="mb-0">
                      Étages au-dessus du RDC
                    </Label>
                    <HelpHint className="align-middle" title={IMMEUBLE_FLOORS_HINT} />
                  </div>
                  <Input
                    id="new-building-floors"
                    type="number"
                    min={1}
                    value={floorCountImmeuble}
                    onChange={(e) => setFloorCountImmeuble(e.target.value)}
                    placeholder="Ex. 5"
                  />
                </div>
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Label htmlFor="new-building-apartments-per-floor" className="mb-0">
                      Logements par étage (étages 1 à N)
                    </Label>
                    <HelpHint className="align-middle" title={IMMEUBLE_LOGEMENTS_PAR_ETAGE_HINT} />
                  </div>
                  <Input
                    id="new-building-apartments-per-floor"
                    type="number"
                    min={1}
                    value={apartmentsPerFloorImmeuble}
                    onChange={(e) => setApartmentsPerFloorImmeuble(e.target.value)}
                    placeholder="Ex. 2"
                  />
                  {immeubleCreateTotalPreview != null ? (
                    <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                      Total logements d’habitation :{' '}
                      <span className="tabular-nums">{immeubleCreateTotalPreview}</span>
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="sm:col-span-2 flex flex-wrap items-start gap-2 rounded-lg border border-slate-200/90 bg-slate-50/80 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800/40">
                <input
                  id="new-building-has-rdc"
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900"
                  checked={includeRezDeChaussee}
                  onChange={(e) => setIncludeRezDeChaussee(e.target.checked)}
                />
                <div className="min-w-0 flex-1">
                  <Label htmlFor="new-building-has-rdc" className="mb-0 cursor-pointer font-medium">
                    Inclure le rez-de-chaussée dans les étages
                  </Label>
                  <div className="mt-1">
                    <HelpHint title={IMMEUBLE_RDC_CHECKBOX_HINT} className="align-middle shrink-0" />
                  </div>
                </div>
              </div>
              {includeRezDeChaussee ? (
                <div className="sm:col-span-2">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Label htmlFor="new-building-rez-apartments" className="mb-0">
                      Nombre d’unités d’habitation au rez-de-chaussée (plafond)
                    </Label>
                    <HelpHint className="align-middle" title={IMMEUBLE_REZ_APARTMENTS_HINT} />
                  </div>
                  <Input
                    id="new-building-rez-apartments"
                    type="number"
                    min={0}
                    value={rezApartmentImmeuble}
                    onChange={(e) => setRezApartmentImmeuble(e.target.value)}
                    placeholder="0 = pas d’unité d’habitation au RDC"
                  />
                </div>
              ) : null}
                  </div>
                ) : structureKind === 'TERRAIN_LOTS' ? (
                  <div>
              <div className="max-w-xs">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <Label htmlFor="new-building-terrain-lots" className="mb-0">
                    Nombre de lots / unités prévues
                  </Label>
                  <HelpHint
                    className="align-middle"
                    title="Combien de lots ou d’emplacements (parcelles, stands…). Pour chaque lot, vous choisirez ensuite le type (terrain bâti, commerce, etc.) sur la fiche du bien."
                  />
                </div>
                <Input
                  id="new-building-terrain-lots"
                  type="number"
                  min={0}
                  value={terrainLotCountNew}
                  onChange={(e) => setTerrainLotCountNew(e.target.value)}
                  placeholder="Ex. 4"
                />
              </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <Label>Nom ou référence du bien</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Résidence Ranga, Villa Dupont, Entrepôt Port-Bouët…"
            />
          </div>
          <div>
            <Label>Ville</Label>
            <Select value={cityChoice} onChange={(e) => setCityChoice(e.target.value)}>
              {IVORY_COAST_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            {cityChoice === 'Autre' && (
              <Input className="mt-2" value={cityOther} onChange={(e) => setCityOther(e.target.value)} placeholder="Nom de la ville" />
            )}
          </div>
          <div>
            <Label>Commune / zone</Label>
            <Select value={communeChoice} onChange={(e) => setCommuneChoice(e.target.value)}>
              {COMMUNE_SUGGESTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            {communeChoice === 'Autre' && (
              <Input className="mt-2" value={communeOther} onChange={(e) => setCommuneOther(e.target.value)} placeholder="Ex. Marcory Zone 4" />
            )}
          </div>
          <div className="sm:col-span-2">
            <Label>Adresse ou précision (optionnel)</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rue, repère, accès…" />
          </div>
          <div>
            <Label>Code postal (optionnel)</Label>
            <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          </div>
          {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button type="submit">Enregistrer</Button>
            <Button type="button" variant="secondary" className="py-2 text-sm" onClick={cancelNewBuilding}>
              Annuler
            </Button>
          </div>
        </form>
            </div>
          ) : null}
        </Card>
      </div>

      <OdooActionBar
        left={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
            <span className="font-semibold">Affichage</span>
            <span>{filteredRows.length} bien(s)</span>
            <span>· {totalUnitsFiltered} unité(s)</span>
            {genreFilter ? <span className="font-semibold text-brand-700 dark:text-brand-300">Filtre genre actif</span> : null}
          </div>
        }
        right={
          rows.length > 0 ? (
            <OdooListToolbar
              search={listSearch}
              onSearchChange={setListSearch}
              searchPlaceholder="Rechercher (nom, ville, commune…)"
              searchAriaLabel="Filtrer les biens"
              showViewToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              exports={
                <>
                  <PdfPrintButton
                    path={worksheetPdfPath}
                    title="Feuille de route PDF (filtres actifs)"
                    variant="labeled"
                  />
                  <PdfPrintButton path="/reports/table-biens.pdf" title="Tableau PDF complet" variant="icon" />
                </>
              }
            />
          ) : null
        }
      />

      <div className="rounded-lg border border-slate-200/90 bg-slate-50/90 p-2.5 shadow-sm shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/25">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Afficher</p>
          <HelpHint className="align-middle" title={filterHint} />
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            title="Tout le patrimoine, tous les genres de biens"
            onClick={() => clearGenreFilter()}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
              !genreFilter
                ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-sm dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-100'
                : 'border-slate-200 bg-slate-100/80 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800'
            }`}
          >
            Tous les biens
          </button>
          {BUILDING_STRUCTURE_OPTIONS.map((opt) => {
            const active = genreFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                title={opt.description}
                onClick={() => selectGenreFilter(opt.value)}
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
                  active
                    ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-sm dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-100'
                    : 'border-slate-200 bg-slate-100/80 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800'
                }`}
              >
                {opt.cardTitle}
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        <div className="mb-3 border-b border-slate-200/80 pb-3 dark:border-slate-700">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {viewMode === 'kanban' ? 'Kanban patrimoine' : 'Liste des biens'}
            </h2>
            {rows.length > 0 ? (
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                {listSearch.trim() ? (
                  <>
                    <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                      {filteredRows.length}
                    </span>{' '}
                    sur{' '}
                    <span className="tabular-nums">{rows.length}</span>{' '}
                    {rows.length !== 1 ? 'biens affichés' : 'bien affiché'}
                    {genreFilter ? ' (filtre genre actif)' : ''} ·{' '}
                    <span className="tabular-nums">{totalUnitsFiltered}</span> unité{totalUnitsFiltered !== 1 ? 's' : ''} dans cette
                    sélection
                  </>
                ) : (
                  <>
                    <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{rows.length}</span>{' '}
                    bien{rows.length !== 1 ? 's' : ''}
                    {genreFilter ? ' (filtre actif)' : ''} ·{' '}
                    <span className="tabular-nums">{totalUnits}</span> unité{totalUnits !== 1 ? 's' : ''} au total
                  </>
                )}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Aucun bien pour cette vue.</p>
            )}
          </div>
        </div>

        {listErr && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            <p className="font-medium">La liste n’a pas pu être chargée</p>
            <p className="mt-1 opacity-90">{listErr}</p>
            <p className="mt-2 text-xs text-red-800/90 dark:text-red-300/90">
              Si vous voyez une erreur serveur (500) : dans le dossier{' '}
              <code className="rounded bg-red-100 px-1 dark:bg-red-950/80 dark:text-red-100">backend</code>, arrêtez Node, puis{' '}
              <code className="rounded bg-red-100 px-1 dark:bg-red-950/80 dark:text-red-100">npx prisma migrate deploy</code> et{' '}
              <code className="rounded bg-red-100 px-1 dark:bg-red-950/80 dark:text-red-100">npx prisma generate</code>, relancez{' '}
              <code className="rounded bg-red-100 px-1 dark:bg-red-950/80 dark:text-red-100">npm run start:dev</code>. Assurez-vous d’être connecté.
            </p>
            <Button type="button" variant="secondary" className="mt-3 py-2 text-xs" onClick={() => load()}>
              Réessayer
            </Button>
          </div>
        )}

        {filteredRows.length > 0 && viewMode === 'kanban' ? (
          <OdooKanbanBoard>
            {BUILDING_STRUCTURE_OPTIONS.map((opt) => (
              <OdooKanbanColumn key={opt.value} title={opt.cardTitle} count={kanbanColumns[opt.value].length}>
                {kanbanColumns[opt.value].map((b) => (
                  <OdooKanbanCard key={b.id} onClick={() => navigate(`/biens/${b.id}`)}>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{b.name}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                      {[b.commune ?? '—', b.city].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-1 text-[10px] font-bold tabular-nums text-brand-700 dark:text-brand-300">
                      {b._count.units} unité{b._count.units !== 1 ? 's' : ''}
                    </p>
                  </OdooKanbanCard>
                ))}
              </OdooKanbanColumn>
            ))}
          </OdooKanbanBoard>
        ) : null}

        {filteredRows.length > 0 && viewMode === 'list' ? (
          <>
            <ul className="divide-y divide-[var(--odoo-border)] md:hidden">
              {filteredRows.map((b) => {
                const details = buildingDetailsText(b);
                const place = [b.commune ?? '—', b.city].filter(Boolean).join(' · ');
                const placeFull = b.postalCode ? `${place} · ${b.postalCode}` : place;
                return (
                  <li
                    key={b.id}
                    id={`bien-row-${b.id}`}
                    className={`scroll-mt-28 space-y-2 p-3.5 ${bienRowFlashClass(flashBuildingId === b.id)}`}
                  >
                    <button type="button" className="w-full text-left" onClick={() => navigate(`/biens/${b.id}`)}>
                      <div className="flex items-start gap-2">
                        <BuildingCardIcon structureKind={b.structureKind} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{b.name}</p>
                          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{placeFull}</p>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {structureKindShort(b.structureKind)}
                            {details ? ` · ${details}` : ''}
                            {' · '}
                            {b._count.units} unité{b._count.units !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </button>
                    <div className="flex flex-wrap gap-2 pl-8">
                      <SmartLink
                        to={`/biens/${b.id}`}
                        returnFocusId={b.id}
                        className="rounded-md px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Ouvrir
                      </SmartLink>
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-600/90 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        onClick={() => void requestDeleteBuilding(b)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="table-scroll hidden min-w-0 overflow-x-auto md:block">
              <table className={`${listTableClassName} min-w-[720px]`}>
                <thead>
                  <tr className="border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)]">
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600 sm:px-4 dark:text-slate-400">
                      Bien
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600 sm:px-4 dark:text-slate-400">
                      Localisation
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600 sm:px-4 dark:text-slate-400">
                      Type
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600 sm:px-4 dark:text-slate-400">
                      Détails
                    </th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-600 sm:px-4 dark:text-slate-400">
                      Unités
                    </th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-600 sm:px-4 dark:text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((b, rowIndex) => {
                    const details = buildingDetailsText(b);
                    const place = [b.commune ?? '—', b.city].filter(Boolean).join(' · ');
                    const placeFull = b.postalCode ? `${place} · ${b.postalCode}` : place;
                    return (
                      <tr
                        key={b.id}
                        id={`bien-row-d-${b.id}`}
                        title="Clic pour ouvrir la fiche"
                        onClick={(e) => onListRowClick(e, () => navigate(`/biens/${b.id}`))}
                        className={`scroll-mt-28 ${listTableDataRowClass(rowIndex)} ${listTableRowOpenableClass} ${bienRowFlashClass(flashBuildingId === b.id)}`}
                      >
                        <td className={listTableFirstCellClass}>
                          <div className="flex min-w-0 items-center gap-2">
                            <BuildingCardIcon structureKind={b.structureKind} />
                            <SmartLink
                              to={`/biens/${b.id}`}
                              returnFocusId={b.id}
                              className="truncate text-sm font-medium text-slate-900 underline-offset-2 hover:underline dark:text-slate-100"
                            >
                              {b.name}
                            </SmartLink>
                          </div>
                        </td>
                        <td className={`${listTableCellClass} text-slate-600 dark:text-slate-300`}>
                          <span className="block text-xs leading-snug sm:text-sm">{placeFull}</span>
                        </td>
                        <td className={`${listTableCellClass} text-xs text-slate-600 dark:text-slate-300`}>
                          {structureKindShort(b.structureKind)}
                        </td>
                        <td className={`${listTableCellClass} text-xs text-slate-600 dark:text-slate-400`}>{details}</td>
                        <td className={`${listTableCellClass} text-right tabular-nums text-slate-800 dark:text-slate-200`}>
                          {b._count.units}
                        </td>
                        <td className={`${listTableCellClass} text-right`}>
                          <div className="inline-flex items-center gap-2.5">
                            <SmartLink
                              to={`/biens/${b.id}`}
                              returnFocusId={b.id}
                              className="text-xs font-medium text-slate-700 underline-offset-2 hover:underline dark:text-slate-300"
                            >
                              Ouvrir
                            </SmartLink>
                            <button
                              type="button"
                              className="text-xs font-medium text-red-600/90 hover:underline dark:text-red-400"
                              onClick={() => void requestDeleteBuilding(b)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {rows.length > 0 && filteredRows.length === 0 && listSearch.trim() && !listErr ? (
          <div className="rounded-xl border border-dashed border-slate-300/90 bg-slate-50/50 py-12 text-center dark:border-slate-600 dark:bg-slate-900/30">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Aucun bien ne correspond à « {listSearch.trim()} ».
            </p>
            <Button type="button" variant="secondary" className="mt-3 py-2 text-xs" onClick={() => setListSearch('')}>
              Effacer la recherche
            </Button>
          </div>
        ) : null}

        {rows.length === 0 && !listErr && (
          <div className="rounded-xl border border-dashed border-slate-300/90 bg-slate-50/50 py-12 text-center dark:border-slate-600 dark:bg-slate-900/30">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {genreFilter ? (
                <>
                  Aucun bien ne correspond à ce genre.{' '}
                  <button
                    type="button"
                    className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                    onClick={() => clearGenreFilter()}
                  >
                    Retirer le filtre
                  </button>
                </>
              ) : (
                <>
                  Aucun bien pour le moment — utilisez le formulaire ci-dessus ou{' '}
                  <code className="rounded bg-slate-200/80 px-1 text-xs dark:bg-slate-800">npm run seed</code> côté backend.
                </>
              )}
            </p>
            {!genreFilter ? (
              <button
                type="button"
                className="mt-3 inline-block text-sm font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                onClick={() => openAddForm()}
              >
                Créer un premier bien
              </button>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
