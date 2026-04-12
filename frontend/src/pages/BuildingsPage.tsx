import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SmartLink } from '@/components/SmartLink';
import { api } from '@/lib/api';
import { COMMUNE_SUGGESTIONS, IVORY_COAST_CITIES } from '@/lib/ciLocation';
import { AppPageTitle } from '@/components/AppPageTitle';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { Button, Card, HelpHint, Input, Label, Select } from '@/components/ui';
import { BUILDING_STRUCTURE_OPTIONS, type BuildingStructureValue } from '@/lib/buildingStructure';

type BuildingRow = {
  id: string;
  name: string;
  city: string;
  commune?: string | null;
  postalCode: string | null;
  structureKind?: BuildingStructureValue;
  floorCount?: number | null;
  apartmentCount?: number | null;
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
  if (k === 'IMMEUBLE') return 'Multi-lots';
  if (k === 'TERRAIN_LOTS') return 'Terrain multi';
  return 'Un seul lot';
}

function BuildingCardIcon({ structureKind }: { structureKind?: BuildingStructureValue | string | null }) {
  if (structureKind === 'IMMEUBLE') {
    return (
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M3 21h18M6 21V10l6-3.5L18 10v11M10 21v-5h4v5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  if (structureKind === 'TERRAIN_LOTS') {
    return (
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-lime-100 text-lime-900 dark:bg-lime-950/45 dark:text-lime-200">
        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M4 20h16M6 20V10l4-6 4 4 4-4v16" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 14h2M12 12h2M16 14h2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/45 dark:text-amber-200">
      <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function BuildingsPage() {
  useRegisterRootSectionFallback();
  const [searchParams, setSearchParams] = useSearchParams();
  /** Filtre par genre de bien (structure), aligné sur le formulaire « Genre de bien ». */
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
  const [name, setName] = useState('');
  const [cityChoice, setCityChoice] = useState<string>(IVORY_COAST_CITIES[0]);
  const [cityOther, setCityOther] = useState('');
  const [communeChoice, setCommuneChoice] = useState<string>(COMMUNE_SUGGESTIONS[0]);
  const [communeOther, setCommuneOther] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [structureKind, setStructureKind] = useState<BuildingStructureValue>('MONO_LOT');
  const [floorCountImmeuble, setFloorCountImmeuble] = useState('');
  const [apartmentCountImmeuble, setApartmentCountImmeuble] = useState('');
  const [terrainLotCountNew, setTerrainLotCountNew] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [listErr, setListErr] = useState<string | null>(null);
  const [addFormOpen, setAddFormOpen] = useState(false);
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
    setApartmentCountImmeuble('');
    setTerrainLotCountNew('');
    setErr(null);
  }

  function cancelNewBuilding() {
    resetNewBuildingForm();
    setAddFormOpen(false);
  }

  const load = useCallback(() => {
    const q = genreFilter ? `?structureKind=${encodeURIComponent(genreFilter)}` : '';
    setListErr(null);
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
      });
  }, [genreFilter]);

  useEffect(() => {
    load();
  }, [load]);

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
    if (!window.confirm(msg)) return;
    try {
      await api(`/buildings/${b.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Suppression impossible.');
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
                floorCount:
                  floorCountImmeuble.trim() === '' ? undefined : Number(floorCountImmeuble),
                apartmentCount:
                  apartmentCountImmeuble.trim() === '' ? undefined : Number(apartmentCountImmeuble),
              }
            : {}),
          ...(structureKind === 'TERRAIN_LOTS'
            ? {
                terrainLotCount: terrainLotCountNew.trim() === '' ? undefined : Number(terrainLotCountNew),
              }
            : {}),
        },
      });
      setName('');
      setAddress('');
      setPostalCode('');
      setCityOther('');
      setCommuneOther('');
      setFloorCountImmeuble('');
      setApartmentCountImmeuble('');
      setTerrainLotCountNew('');
      setAddFormOpen(false);
      load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  const filterHint = genreFilter
    ? 'Filtre par genre de bien (structure) : immeuble multi-lots, terrain parcelé ou un seul lot — comme dans « Nouveau bien ».'
    : '« Tous les biens » : aucun filtre. Choisissez un genre pour restreindre la liste.';

  const totalUnits = useMemo(() => rows.reduce((s, b) => s + b._count.units, 0), [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <AppPageTitle
          className="max-w-3xl"
          iconTo="/biens"
          title="Biens immobiliers"
          hintTitle="Immeuble collectif, villa, entrepôt, terrain… même principe : nom du site + localisation (Côte d’Ivoire). Supprimer un bien : bouton en bas de carte (supprime aussi unités, baux et loyers liés)."
        />
        <Button type="button" variant="secondary" className="gap-1.5 py-2 text-sm font-semibold" onClick={() => openAddForm()}>
          <span className="text-base leading-none" aria-hidden>
            +
          </span>
          Ajouter un bien
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/90 p-4 shadow-sm shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/25 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Afficher</p>
          <HelpHint className="align-middle" title={filterHint} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            title="Tout le patrimoine, tous les genres de biens"
            onClick={() => clearGenreFilter()}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
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
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
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
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Vos sites</h2>
            {rows.length > 0 ? (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{rows.length}</span>{' '}
                bien{rows.length !== 1 ? 's' : ''}
                {genreFilter ? ' (filtre actif)' : ''} ·{' '}
                <span className="tabular-nums">{totalUnits}</span> unité{totalUnits !== 1 ? 's' : ''} au total
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

        <ul className="grid list-none gap-4 sm:grid-cols-2">
          {rows.map((b) => {
            const isImmeuble = b.structureKind === 'IMMEUBLE';
            return (
              <li key={b.id}>
                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-slate-100/40 shadow-sm transition hover:border-brand-400/55 hover:shadow-md dark:border-slate-700 dark:from-slate-900/80 dark:to-slate-900/40 dark:hover:border-brand-500/45">
                  <SmartLink
                    to={`/biens/${b.id}`}
                    className="group flex flex-1 flex-col p-4 no-underline outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
                  >
                    <div className="flex gap-3">
                      <BuildingCardIcon structureKind={b.structureKind} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-semibold leading-snug text-slate-900 group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-400 sm:text-lg">
                            {b.name}
                          </h3>
                          <span className="shrink-0 rounded-lg bg-brand-500/15 px-2 py-0.5 text-xs font-bold tabular-nums text-brand-800 dark:bg-brand-500/20 dark:text-brand-200">
                            {b._count.units}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          {[b.commune ?? '—', b.city].filter(Boolean).join(' · ')}
                          {b.postalCode ? ` · ${b.postalCode}` : ''}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {structureKindShort(b.structureKind)}
                          </span>
                          {isImmeuble && (b.floorCount != null || b.apartmentCount != null) ? (
                            <span className="rounded-md bg-slate-200/50 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800/80 dark:text-slate-400">
                              {b.floorCount != null ? `${b.floorCount} ét.` : '— ét.'} ·{' '}
                              {b.apartmentCount != null ? `${b.apartmentCount} app.` : '— app.'}
                            </span>
                          ) : null}
                          {b.structureKind === 'TERRAIN_LOTS' && b.terrainLotCount != null ? (
                            <span className="rounded-md bg-lime-200/60 px-2 py-0.5 text-[10px] font-medium text-lime-950 dark:bg-lime-950/50 dark:text-lime-100">
                              {b.terrainLotCount} lot{b.terrainLotCount !== 1 ? 's' : ''} décl.
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </SmartLink>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-200/60 bg-slate-100/40 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/50">
                    <SmartLink
                      to={`/biens/${b.id}`}
                      className="text-xs font-medium text-brand-600 transition hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      Ouvrir la fiche
                      <span className="inline-block transition hover:translate-x-0.5" aria-hidden>
                        →
                      </span>
                    </SmartLink>
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/50"
                      onClick={() => void requestDeleteBuilding(b)}
                    >
                      Supprimer…
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

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
                  Aucun bien pour le moment — utilisez le formulaire ci-dessous ou{' '}
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
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {addFormOpen ? 'Masquer le formulaire' : 'Afficher le formulaire d’enregistrement'}
                </p>
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
                  title="Immeuble ou terrain parcelé : un seul bien avec plusieurs unités et plusieurs baux. Villa, entrepôt entier ou parcelle unique sans découpe : un seul lot, une unité, un bail."
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Choisissez d’abord le genre de bien, puis indiquez étages / nombre d’unités si besoin, puis nom et lieu.
                </span>
              </div>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Label className="mb-0">Genre de bien</Label>
              <HelpHint
                className="align-middle"
                title={BUILDING_STRUCTURE_OPTIONS.find((o) => o.value === structureKind)?.description ?? ''}
              />
            </div>
            <div
              className="grid gap-2 sm:grid-cols-3"
              role="radiogroup"
              aria-label="Genre de bien"
            >
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
                    <span className="mt-1 block text-[11px] leading-snug text-slate-600 dark:text-slate-400">{o.cardHint}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {structureKind === 'IMMEUBLE' ? (
            <div className="sm:col-span-2">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Taille de l’immeuble (indicatif)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Label htmlFor="new-building-floors" className="mb-0">
                      Nombre d&apos;étages
                    </Label>
                    <HelpHint
                      className="align-middle"
                      title="Pour proposer les étages dans « Nouvelle unité » (RDC, 1, 2…). Indicatif."
                    />
                  </div>
                  <Input
                    id="new-building-floors"
                    type="number"
                    min={0}
                    value={floorCountImmeuble}
                    onChange={(e) => setFloorCountImmeuble(e.target.value)}
                    placeholder="Ex. 4"
                  />
                </div>
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Label htmlFor="new-building-apartments" className="mb-0">
                      Nombre d&apos;unités (appartements, bureaux…)
                    </Label>
                    <HelpHint
                      className="align-middle"
                      title="Pour numéroter les locaux (n°1…n). Chaque unité sera ensuite créée avec son type : appartement, bureau, entrepôt, etc."
                    />
                  </div>
                  <Input
                    id="new-building-apartments"
                    type="number"
                    min={0}
                    value={apartmentCountImmeuble}
                    onChange={(e) => setApartmentCountImmeuble(e.target.value)}
                    placeholder="Ex. 12"
                  />
                </div>
              </div>
            </div>
          ) : structureKind === 'TERRAIN_LOTS' ? (
            <div className="sm:col-span-2">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Découpe du terrain
              </p>
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
    </div>
  );
}
