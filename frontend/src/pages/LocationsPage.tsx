import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SmartLink } from '@/components/SmartLink';
import { useReturnRowFocus } from '@/hooks/useReturnRowFocus';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { unitKindLabel } from '@/lib/unitKind';
import { AppPageTitle } from '@/components/AppPageTitle';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { Button, Card, HelpHint, Input, Label } from '@/components/ui';
import { listTableCellClass, listTableDataRowClass, listTableFirstCellClass } from '@/lib/listTableStyles';

type OverviewRow = {
  leaseId: string;
  active: boolean;
  tenantId: string;
  buildingId: string;
  unitId: string;
  localizationLine: string;
  buildingName: string;
  unitLabel: string;
  unitKind: string;
  tenantFullName: string;
  monthlyRent: number;
  rentDueDay: number;
  currentMonthStatusFr: string;
};

function hrefBiensUnit(
  buildingId: string,
  unitId: string,
  unitLabel: string,
  returnLocation: string,
) {
  const q = new URLSearchParams({
    unitId,
    hintUnitLabel: unitLabel,
    returnLocation,
  });
  return `/biens/${buildingId}?${q.toString()}`;
}

function statusClass(fr: string) {
  if (fr === 'Payé') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200';
  if (fr === 'En retard') return 'bg-amber-100 text-amber-900 dark:bg-amber-950/65 dark:text-amber-200';
  if (fr === 'Annulé') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  return 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200';
}

type LocationSortKey = 'place' | 'buildingUnit' | 'tenant' | 'rent' | 'dueDay' | 'status' | 'active';

function compareLocationRows(a: OverviewRow, b: OverviewRow, key: LocationSortKey, dir: 'asc' | 'desc'): number {
  const sign = dir === 'asc' ? 1 : -1;
  let c = 0;
  switch (key) {
    case 'place':
      c = a.localizationLine.localeCompare(b.localizationLine, 'fr', { sensitivity: 'base' });
      break;
    case 'buildingUnit':
      c = a.buildingName.localeCompare(b.buildingName, 'fr', { sensitivity: 'base' });
      if (c === 0) c = a.unitLabel.localeCompare(b.unitLabel, 'fr', { numeric: true });
      break;
    case 'tenant':
      c = a.tenantFullName.localeCompare(b.tenantFullName, 'fr', { sensitivity: 'base' });
      break;
    case 'rent':
      c = a.monthlyRent - b.monthlyRent;
      break;
    case 'dueDay':
      c = a.rentDueDay - b.rentDueDay;
      break;
    case 'status':
      c = a.currentMonthStatusFr.localeCompare(b.currentMonthStatusFr, 'fr', { sensitivity: 'base' });
      break;
    case 'active': {
      const av = a.active ? 1 : 0;
      const bv = b.active ? 1 : 0;
      c = av - bv;
      if (c === 0) c = a.tenantFullName.localeCompare(b.tenantFullName, 'fr', { sensitivity: 'base' });
      break;
    }
    default:
      c = 0;
  }
  return c * sign;
}

function LocationSortTh({
  label,
  columnKey,
  activeKey,
  dir,
  onSort,
  thClassName = '',
  align = 'start',
}: {
  label: string;
  columnKey: LocationSortKey;
  activeKey: LocationSortKey;
  dir: 'asc' | 'desc';
  onSort: (k: LocationSortKey) => void;
  thClassName?: string;
  align?: 'start' | 'end';
}) {
  const active = activeKey === columnKey;
  return (
    <th scope="col" className={`whitespace-nowrap px-4 py-2.5 sm:px-5 ${align === 'end' ? 'text-right' : ''} ${thClassName}`}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-md text-[11px] font-semibold uppercase tracking-[0.06em] transition hover:text-brand-700 dark:hover:text-brand-300 ${
          align === 'end' ? 'w-full justify-end' : 'text-left'
        } ${active ? 'text-brand-700 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}`}
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

/** Barre de recherche partagée : filtre les cartes et le tableau (même état). */
function LocationsSearchField({
  id,
  value,
  onChange,
  wrapperClassName = '',
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  wrapperClassName?: string;
}) {
  const hasQuery = Boolean(value.trim());

  return (
    <div className={`relative ${wrapperClassName}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400" aria-hidden>
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
      </span>
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Locataire, bien, unité, ville, statut…"
        className="w-full rounded-xl border-slate-200 py-2.5 pl-9 pr-10 text-sm shadow-sm dark:border-slate-600"
        aria-label="Filtrer les locations — cartes et tableau"
        autoComplete="off"
      />
      {/* Espace fixe à droite : le bouton reste dans le flux visuel (invisible si vide) pour éviter tout saut de mise en page */}
      <button
        type="button"
        className={`absolute right-1.5 top-1/2 z-[1] flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-opacity hover:bg-slate-200/80 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 ${
          hasQuery ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => onChange('')}
        aria-label="Effacer la recherche"
        tabIndex={hasQuery ? 0 : -1}
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function LeaseCardIcon({ active }: { active: boolean }) {
  return (
    <div
      className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
        active
          ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
      }`}
    >
      <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function rowFlashClass(active: boolean) {
  return active
    ? 'ring-2 ring-inset ring-brand-500/90 bg-brand-50/90 shadow-[0_0_0_1px_rgba(59,130,246,0.35)] dark:bg-brand-950/45 dark:ring-brand-400/80'
    : '';
}

export function LocationsPage() {
  useRegisterRootSectionFallback();
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [listFetched, setListFetched] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [tableSortKey, setTableSortKey] = useState<LocationSortKey>('tenant');
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('asc');
  /** Mémorise le scroll fenêtre avant un changement de recherche pour éviter que le tableau « saute » quand la liste se réduit. */
  const searchScrollYRef = useRef<number | null>(null);

  const setListSearchPreserveScroll = useCallback((next: string) => {
    searchScrollYRef.current = window.scrollY;
    setListSearch(next);
  }, []);

  const filteredRows = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay =
        `${r.tenantFullName} ${r.buildingName} ${r.unitLabel} ${r.localizationLine} ${unitKindLabel(r.unitKind)} ${r.currentMonthStatusFr}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, listSearch]);

  const sortedTableRows = useMemo(() => {
    const arr = [...filteredRows];
    arr.sort((a, b) => compareLocationRows(a, b, tableSortKey, tableSortDir));
    return arr;
  }, [filteredRows, tableSortKey, tableSortDir]);

  function toggleTableSort(key: LocationSortKey) {
    if (tableSortKey === key) {
      setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setTableSortKey(key);
      setTableSortDir('asc');
    }
  }

  const load = useCallback(() => {
    setListFetched(false);
    const q = showAll ? '?all=1' : '';
    api<OverviewRow[]>(`/leases/overview${q}`)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setListFetched(true));
  }, [showAll]);

  const flashLeaseId = useReturnRowFocus({ rowIdPrefix: 'loc-row-', ready: listFetched });

  useEffect(() => {
    load();
  }, [load]);

  useLayoutEffect(() => {
    const y = searchScrollYRef.current;
    if (y === null) return;
    searchScrollYRef.current = null;
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(y, max));
  }, [listSearch, filteredRows]);

  async function requestDeleteLocation(r: OverviewRow) {
    const msg = `Supprimer la location « ${r.buildingName} — ${r.unitLabel} » (${r.tenantFullName}) ? Le bail, l’historique des loyers et le contrat joint seront supprimés. L’unité et le locataire ne sont pas supprimés. Action irréversible.`;
    if (!window.confirm(msg)) return;
    try {
      await api(`/leases/${r.leaseId}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Suppression impossible.');
    }
  }

  return (
    <div id="locations-page-root" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <AppPageTitle
          className="max-w-3xl"
          iconTo="/locations"
          title="Locations"
          hintTitle="Pour chaque bail : localisation, locataire, loyer, statut du mois. Fiche = détail. Supprimer = supprime le bail et les paiements (pas le bien ni le locataire)."
        />
        <Button variant={showAll ? 'primary' : 'secondary'} className="py-2 text-xs" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Actives seulement' : 'Voir aussi inactives'}
        </Button>
      </div>

      {rows.length > 0 ? (
        <div className="space-y-1.5">
          <Label htmlFor="locations-search-main" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Recherche
          </Label>
          <LocationsSearchField
            id="locations-search-main"
            value={listSearch}
            onChange={setListSearchPreserveScroll}
            wrapperClassName="max-w-md"
          />
          <p className="min-h-[2.75rem] text-[11px] leading-snug text-slate-500 dark:text-slate-500">
            Filtre les cartes ci-dessous et le tableau : même texte, tri indépendant sur les colonnes du tableau.
          </p>
        </div>
      ) : null}

      {filteredRows.length > 0 ? (
        <>
          <ul className="grid list-none gap-4 sm:grid-cols-2">
            {filteredRows.map((r) => (
              <li key={r.leaseId} className={`scroll-mt-28 ${rowFlashClass(flashLeaseId === r.leaseId)}`}>
                <div
                  className={`flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-slate-100/40 shadow-sm transition hover:border-brand-400/55 hover:shadow-md dark:border-slate-700 dark:from-slate-900/80 dark:to-slate-900/40 dark:hover:border-brand-500/45 ${
                    !r.active ? 'opacity-75' : ''
                  }`}
                >
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex gap-3">
                      <LeaseCardIcon active={r.active} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              {r.localizationLine}
                            </p>
                            <SmartLink
                              to={hrefBiensUnit(r.buildingId, r.unitId, r.unitLabel, `/locations/${r.leaseId}`)}
                              returnFocusId={r.leaseId}
                              className="group mt-1 block text-base font-semibold leading-snug text-slate-900 no-underline hover:text-brand-700 dark:text-slate-100 dark:hover:text-brand-400 sm:text-lg"
                            >
                              {r.buildingName} — {r.unitLabel}
                            </SmartLink>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{unitKindLabel(r.unitKind)}</p>
                          </div>
                          <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium ${statusClass(r.currentMonthStatusFr)}`}>
                            {r.currentMonthStatusFr}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-slate-200/60 pt-3 dark:border-slate-700">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Locataire</p>
                      <SmartLink
                        to={`/locataires?edit=${encodeURIComponent(r.tenantId)}`}
                        className="mt-1 block text-lg font-semibold text-slate-900 no-underline hover:text-brand-700 dark:text-slate-100 dark:hover:text-brand-400"
                      >
                        {r.tenantFullName}
                      </SmartLink>
                      <SmartLink
                        to={`/locations/${r.leaseId}`}
                        returnFocusId={r.leaseId}
                        className="mt-3 block rounded-lg bg-slate-50/90 px-3 py-2 text-sm no-underline transition hover:bg-slate-100/90 dark:bg-slate-800/50 dark:hover:bg-slate-800/80"
                      >
                        <p>
                          <span className="font-medium text-slate-500 dark:text-slate-400">Loyer mensuel :</span>{' '}
                          <span className="text-base font-bold text-slate-900 dark:text-slate-100">{fcfa(r.monthlyRent)}</span>
                        </p>
                        <p className="mt-1 text-slate-600 dark:text-slate-400">
                          <span className="font-medium text-slate-500 dark:text-slate-400">Jour d’échéance :</span> le {r.rentDueDay}{' '}
                          de chaque mois
                        </p>
                      </SmartLink>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-200/60 bg-slate-100/40 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/50">
                    <SmartLink
                      to={`/locations/${r.leaseId}`}
                      returnFocusId={r.leaseId}
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
                      onClick={() => void requestDeleteLocation(r)}
                    >
                      Supprimer…
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Card className="!overflow-hidden !p-0 shadow-sm ring-1 ring-slate-900/[0.04] dark:ring-slate-600/35">
            <div className="border-b border-slate-200/90 bg-slate-50/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/80 sm:px-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Vue tableau (aperçu)</h2>
                    <p className="mt-0.5 min-h-[2.5rem] text-xs leading-snug text-slate-600 dark:text-slate-400">
                      Même filtre que la barre du haut : saisissez aussi ici si vous êtes en bas de page. Tri : cliquez sur les
                      en-têtes (↑ croissant, ↓ décroissant, reclic pour inverser).
                    </p>
                    <p className="mt-2 min-h-[1.25rem] text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300">
                      <span className="inline-block min-w-[8rem]">
                        {sortedTableRows.length} ligne{sortedTableRows.length !== 1 ? 's' : ''} affichée
                        {sortedTableRows.length !== 1 ? 's' : ''}
                      </span>
                      {listSearch.trim() ? (
                        <span className="block truncate font-normal text-slate-600 sm:inline sm:max-w-[min(100%,24rem)] dark:text-slate-400">
                          {' · '}
                          filtre « {listSearch.trim()} »
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <HelpHint title="Cette vue dense convient aux longues listes ; les cartes restent utiles pour un aperçu visuel rapide. Recherche et tri s’appliquent à la même liste filtrée." />
                </div>
                <div className="max-w-lg space-y-1.5">
                  <Label htmlFor="locations-search-table" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Recherche (identique au champ du haut)
                  </Label>
                  <LocationsSearchField
                    id="locations-search-table"
                    value={listSearch}
                    onChange={setListSearchPreserveScroll}
                    wrapperClassName="w-full"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto bg-white dark:bg-slate-950/30">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
                    <LocationSortTh
                      label="Lieu"
                      columnKey="place"
                      activeKey={tableSortKey}
                      dir={tableSortDir}
                      onSort={toggleTableSort}
                      thClassName="border-l-[3px] border-l-brand-500/40 pl-[13px] sm:pl-[17px] dark:border-l-brand-400/35"
                    />
                    <LocationSortTh
                      label="Bien / unité"
                      columnKey="buildingUnit"
                      activeKey={tableSortKey}
                      dir={tableSortDir}
                      onSort={toggleTableSort}
                    />
                    <LocationSortTh
                      label="Locataire"
                      columnKey="tenant"
                      activeKey={tableSortKey}
                      dir={tableSortDir}
                      onSort={toggleTableSort}
                    />
                    <LocationSortTh
                      label="Loyer"
                      columnKey="rent"
                      activeKey={tableSortKey}
                      dir={tableSortDir}
                      onSort={toggleTableSort}
                      align="end"
                    />
                    <LocationSortTh
                      label="Échéance"
                      columnKey="dueDay"
                      activeKey={tableSortKey}
                      dir={tableSortDir}
                      onSort={toggleTableSort}
                    />
                    <LocationSortTh
                      label="Mois en cours"
                      columnKey="status"
                      activeKey={tableSortKey}
                      dir={tableSortDir}
                      onSort={toggleTableSort}
                    />
                    <LocationSortTh
                      label="Bail"
                      columnKey="active"
                      activeKey={tableSortKey}
                      dir={tableSortDir}
                      onSort={toggleTableSort}
                    />
                    <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 sm:px-5 dark:text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTableRows.map((r, rowIndex) => (
                    <tr
                      key={`table-${r.leaseId}`}
                      id={`loc-row-${r.leaseId}`}
                      className={`scroll-mt-28 ${listTableDataRowClass(rowIndex)} ${rowFlashClass(flashLeaseId === r.leaseId)}`}
                    >
                      <td className={`${listTableFirstCellClass} max-w-[14rem] text-slate-700 dark:text-slate-300`}>
                        <span className="line-clamp-2 text-xs leading-snug">{r.localizationLine}</span>
                      </td>
                      <td className={`${listTableCellClass} min-w-0`}>
                        <SmartLink
                          to={hrefBiensUnit(r.buildingId, r.unitId, r.unitLabel, `/locations/${r.leaseId}`)}
                          returnFocusId={r.leaseId}
                          className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-400"
                        >
                          {r.buildingName} — {r.unitLabel}
                        </SmartLink>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{unitKindLabel(r.unitKind)}</p>
                      </td>
                      <td className={`${listTableCellClass} font-medium text-slate-900 dark:text-slate-100`}>
                        <SmartLink
                          to={`/locataires?edit=${encodeURIComponent(r.tenantId)}`}
                          className="text-brand-800 underline-offset-2 hover:underline dark:text-brand-400"
                        >
                          {r.tenantFullName}
                        </SmartLink>
                      </td>
                      <td className={`${listTableCellClass} text-right tabular-nums font-semibold text-slate-800 dark:text-slate-200`}>
                        {fcfa(r.monthlyRent)}
                      </td>
                      <td className={`${listTableCellClass} tabular-nums text-slate-700 dark:text-slate-300`}>le {r.rentDueDay}</td>
                      <td className={listTableCellClass}>
                        <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass(r.currentMonthStatusFr)}`}>
                          {r.currentMonthStatusFr}
                        </span>
                      </td>
                      <td className={`${listTableCellClass} text-xs font-medium text-slate-600 dark:text-slate-400`}>
                        {r.active ? 'Actif' : 'Inactif'}
                      </td>
                      <td className={`${listTableCellClass} text-right`}>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <SmartLink
                            to={`/locations/${r.leaseId}`}
                            returnFocusId={r.leaseId}
                            className="rounded-md px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
                          >
                            Fiche
                          </SmartLink>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                            onClick={() => void requestDeleteLocation(r)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}

      {rows.length > 0 && filteredRows.length === 0 && listSearch.trim() ? (
        <Card>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Aucune location ne correspond à « {listSearch.trim()} ».
          </p>
          <Button type="button" variant="secondary" className="mt-3 py-2 text-xs" onClick={() => setListSearchPreserveScroll('')}>
            Effacer la recherche
          </Button>
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-700 dark:text-slate-300">Aucune location pour cette vue.</p>
            <HelpHint className="align-middle" title="Créez un bail (bien + unité + locataire) depuis la page Baux." />
          </div>
          <SmartLink to="/baux" className="mt-3 inline-block text-sm font-medium text-brand-700 dark:text-brand-400">
            Aller aux baux
          </SmartLink>
        </Card>
      ) : null}
    </div>
  );
}
