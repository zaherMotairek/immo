import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SmartLink } from '@/components/SmartLink';
import { useReturnRowFocus } from '@/hooks/useReturnRowFocus';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { unitKindLabel } from '@/lib/unitKind';
import { AppPageTitle, PageHeaderKpi } from '@/components/AppPageTitle';
import { PdfPrintButton } from '@/components/PdfPrintButton';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { Button, Card, HelpHint, Input, Label } from '@/components/ui';
import { listTableCellClass, listTableDataRowClass, listTableFirstCellClass, listTableRowOpenableClass, onListRowClick } from '@/lib/listTableStyles';
import { SortableTh } from '@/components/SortableTh';
import { toggleTableSortColumn } from '@/lib/tableSort';
import type { TableSortDir } from '@/lib/tableSort';

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

function compareLocationRows(a: OverviewRow, b: OverviewRow, key: LocationSortKey, dir: TableSortDir): number {
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

const locationSortThBase =
  'min-w-0 whitespace-normal px-2 py-2.5 leading-tight sm:whitespace-nowrap sm:px-4 sm:py-2.5 lg:px-5';

/** Barre de recherche de la liste principale des locations. */
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
        className="w-full rounded-xl border-slate-200 py-2.5 !pl-11 pr-10 text-sm shadow-sm dark:border-slate-600"
        aria-label="Filtrer la liste des locations"
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

function rowFlashClass(active: boolean) {
  return active
    ? 'ring-2 ring-inset ring-brand-500/90 bg-brand-50/90 shadow-[0_0_0_1px_rgba(59,130,246,0.35)] dark:bg-brand-950/45 dark:ring-brand-400/80'
    : '';
}

export function LocationsPage() {
  useRegisterRootSectionFallback();
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const locationSheetState = useMemo(() => ({ backgroundLocation: routerLocation }), [routerLocation]);
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [listFetched, setListFetched] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [tableSortKey, setTableSortKey] = useState<LocationSortKey>('tenant');
  const [tableSortDir, setTableSortDir] = useState<TableSortDir>('asc');
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
    const n = toggleTableSortColumn(tableSortKey, tableSortDir, key);
    setTableSortKey(n.key);
    setTableSortDir(n.dir);
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
    <div id="locations-page-root" className="space-y-4">
      <AppPageTitle
        iconTo="/locations"
        title="Locations"
        hintTitle="Pour chaque bail : localisation, locataire, loyer, statut du mois. Fiche = détail. Supprimer = supprime le bail et les paiements (pas le bien ni le locataire)."
        actions={
          <>
            <PageHeaderKpi label="Total" value={String(rows.length)} />
            <PdfPrintButton
              path={`/reports/table-locations.pdf${showAll ? '?all=1' : ''}`}
              title={
                showAll
                  ? 'Liste des locations en PDF (actives et inactives)'
                  : 'Liste des locations en PDF (baux actifs — comme le filtre ci-dessous)'
              }
            />
            <Button variant={showAll ? 'primary' : 'secondary'} className="py-2 text-xs" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Actives seulement' : 'Voir aussi inactives'}
            </Button>
          </>
        }
      />

      {rows.length > 0 ? (
        <div className="space-y-1">
          <Label htmlFor="locations-search-main" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Recherche
          </Label>
          <LocationsSearchField
            id="locations-search-main"
            value={listSearch}
            onChange={setListSearchPreserveScroll}
            wrapperClassName="max-w-md"
          />
          <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-500">
            Filtre la liste ci-dessous. Tri : cliquez sur les en-têtes de colonnes.
          </p>
        </div>
      ) : null}

      {filteredRows.length > 0 ? (
        <>
          <Card className="!overflow-hidden !p-0 shadow-sm ring-1 ring-slate-900/[0.04] dark:ring-slate-600/35">
            <div className="border-b border-slate-200/90 bg-slate-50/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/80 sm:px-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Liste des locations</h2>
                    <p className="mt-0.5 min-h-[2.5rem] text-xs leading-snug text-slate-600 dark:text-slate-400">
                      Sur téléphone : fiches empilées. Sur grand écran : tableau triable (clic sur les en-têtes).
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
                  <HelpHint title="Recherche et tri s’appliquent à toute la liste affichée." />
                </div>
                <div className="max-w-lg space-y-1.5">
                  <Label htmlFor="locations-search-table" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Recherche (même filtre)
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
            {/* Mobile : fiches lisibles (évite table-fixed compressée) */}
            <ul className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-950/30 md:hidden">
              {sortedTableRows.map((r) => (
                <li
                  key={`card-${r.leaseId}`}
                  id={`loc-row-${r.leaseId}`}
                  className={`scroll-mt-28 space-y-2.5 p-3.5 ${rowFlashClass(flashLeaseId === r.leaseId)}`}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => navigate(`/locations/${r.leaseId}`, { state: locationSheetState })}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-50">
                          {r.buildingName} — {r.unitLabel}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{unitKindLabel(r.unitKind)}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass(r.currentMonthStatusFr)}`}
                      >
                        {r.currentMonthStatusFr}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{r.localizationLine}</p>
                    <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{r.tenantFullName}</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                      {fcfa(r.monthlyRent)}
                      <span className="ml-2 text-xs font-normal text-slate-500">échéance le {r.rentDueDay}</span>
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">{r.active ? 'Actif' : 'Inactif'}</p>
                  </button>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <SmartLink
                      to={`/locations/${r.leaseId}`}
                      state={locationSheetState}
                      returnFocusId={r.leaseId}
                      className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
                    >
                      Fiche
                    </SmartLink>
                    <button
                      type="button"
                      className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      onClick={() => void requestDeleteLocation(r)}
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="table-scroll hidden min-w-0 overflow-x-auto bg-white dark:bg-slate-950/30 md:block">
              <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
                    <SortableTh
                      label="Lieu"
                      columnKey="place"
                      activeKey={tableSortKey}
                      dir={tableSortDir}
                      onSort={toggleTableSort}
                      thClassName={locationSortThBase}
                    />
                    <SortableTh
                      label="Bien / unité"
                      columnKey="buildingUnit"
                      activeKey={tableSortKey}
                      dir={tableSortDir}
                      onSort={toggleTableSort}
                      thClassName={locationSortThBase}
                    />
                    <SortableTh
                      label="Locataire"
                      columnKey="tenant"
                      activeKey={tableSortKey}
                      dir={tableSortDir}
                      onSort={toggleTableSort}
                      thClassName={locationSortThBase}
                    />
                    <SortableTh
                      label="Loyer"
                      columnKey="rent"
                      activeKey={tableSortKey}
                      dir={tableSortDir}
                      onSort={toggleTableSort}
                      align="end"
                      thClassName={locationSortThBase}
                    />
                    <SortableTh
                      label="Échéance"
                      columnKey="dueDay"
                      activeKey={tableSortKey}
                      dir={tableSortDir}
                      onSort={toggleTableSort}
                      thClassName={locationSortThBase}
                    />
                    <SortableTh
                      label="Mois en cours"
                      columnKey="status"
                      activeKey={tableSortKey}
                      dir={tableSortDir}
                      onSort={toggleTableSort}
                      thClassName={locationSortThBase}
                    />
                    <SortableTh
                      label="Bail"
                      columnKey="active"
                      activeKey={tableSortKey}
                      dir={tableSortDir}
                      onSort={toggleTableSort}
                      thClassName={locationSortThBase}
                    />
                    <th className="min-w-0 w-[9rem] whitespace-normal px-2 py-2.5 text-right text-[11px] font-semibold uppercase leading-tight tracking-[0.06em] text-slate-500 sm:w-[1%] sm:whitespace-nowrap sm:px-4 lg:px-5 dark:text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTableRows.map((r, rowIndex) => (
                    <tr
                      key={`table-${r.leaseId}`}
                      id={`loc-row-d-${r.leaseId}`}
                      title="Clic pour ouvrir la fiche"
                      onClick={(e) =>
                        onListRowClick(e, () => navigate(`/locations/${r.leaseId}`, { state: locationSheetState }))
                      }
                      className={`scroll-mt-28 ${listTableDataRowClass(rowIndex)} ${listTableRowOpenableClass} ${rowFlashClass(flashLeaseId === r.leaseId)}`}
                    >
                      <td className={`${listTableFirstCellClass} min-w-0 max-w-0 text-slate-700 dark:text-slate-300`}>
                        <span className="block break-words text-xs leading-snug">{r.localizationLine}</span>
                      </td>
                      <td className={`${listTableCellClass} min-w-0 break-words px-2 py-3 sm:px-4 sm:py-4 lg:px-5`}>
                        <SmartLink
                          to={hrefBiensUnit(r.buildingId, r.unitId, r.unitLabel, `/locations/${r.leaseId}`)}
                          returnFocusId={r.leaseId}
                          className="font-semibold leading-snug text-brand-800 underline-offset-2 hover:underline dark:text-brand-400"
                        >
                          {r.buildingName} — {r.unitLabel}
                        </SmartLink>
                        <p className="mt-0.5 break-words text-xs text-slate-500 dark:text-slate-400">{unitKindLabel(r.unitKind)}</p>
                      </td>
                      <td className={`${listTableCellClass} min-w-0 break-words px-2 py-3 font-medium text-slate-900 sm:px-4 sm:py-4 lg:px-5 dark:text-slate-100`}>
                        <SmartLink
                          to={`/locataires?edit=${encodeURIComponent(r.tenantId)}`}
                          className="leading-snug text-brand-800 underline-offset-2 hover:underline dark:text-brand-400"
                        >
                          {r.tenantFullName}
                        </SmartLink>
                      </td>
                      <td className={`${listTableCellClass} min-w-0 px-2 py-3 text-right text-xs tabular-nums font-semibold leading-snug text-slate-800 sm:px-4 sm:py-4 sm:text-sm lg:px-5 dark:text-slate-200`}>
                        {fcfa(r.monthlyRent)}
                      </td>
                      <td className={`${listTableCellClass} min-w-0 px-2 py-3 tabular-nums text-xs text-slate-700 sm:px-4 sm:py-4 sm:text-sm lg:px-5 dark:text-slate-300`}>
                        le {r.rentDueDay}
                      </td>
                      <td className={`${listTableCellClass} min-w-0 px-2 py-3 sm:px-4 sm:py-4 lg:px-5`}>
                        <span className={`inline-block max-w-full break-words rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:px-2 sm:text-[10px] ${statusClass(r.currentMonthStatusFr)}`}>
                          {r.currentMonthStatusFr}
                        </span>
                      </td>
                      <td className={`${listTableCellClass} min-w-0 px-2 py-3 text-xs font-medium text-slate-600 sm:px-4 sm:py-4 lg:px-5 dark:text-slate-400`}>
                        {r.active ? 'Actif' : 'Inactif'}
                      </td>
                      <td className={`${listTableCellClass} min-w-0 px-2 py-3 text-right sm:px-4 sm:py-4 lg:px-5`}>
                        <div className="flex flex-col items-end gap-1 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-1.5">
                          <SmartLink
                            to={`/locations/${r.leaseId}`}
                            state={locationSheetState}
                            returnFocusId={r.leaseId}
                            className="inline-block rounded-md px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
                          >
                            Fiche
                          </SmartLink>
                          <button
                            type="button"
                            className="inline-block rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
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
