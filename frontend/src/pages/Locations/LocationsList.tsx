import { SmartLink } from '@/components/SmartLink';
import { HelpHint } from '@/components/ui';
import { Button, Card, EmptyState, Field } from '@/components/ui/index';
import type { AppNavigateState } from '@/lib/navigation';
import type { TableSortDir } from '@/lib/tableSort';
import { LocationsCardList } from './LocationsCardList';
import { LocationsSearchField } from './LocationsSearchField';
import { LocationsTable } from './LocationsTable';
import type { LocationSortKey, OverviewRow } from './types';

type LocationsListProps = {
  rows: OverviewRow[];
  filteredRows: OverviewRow[];
  sortedTableRows: OverviewRow[];
  listSearch: string;
  onSearchChange: (next: string) => void;
  sort: { key: LocationSortKey; dir: TableSortDir; onSort: (key: LocationSortKey) => void };
  flashLeaseId: string | null;
  locationSheetState: AppNavigateState;
  onOpen: (leaseId: string) => void;
  onDelete: (r: OverviewRow) => void;
};

const emptyWrap = 'rounded-none border-0 border-t border-solid';

/** Section liste : recherche, cartes/tableau, états vides. */
export function LocationsList({
  rows,
  filteredRows,
  sortedTableRows,
  listSearch,
  onSearchChange,
  sort,
  flashLeaseId,
  locationSheetState,
  onOpen,
  onDelete,
}: LocationsListProps) {
  return (
    <>
      {rows.length > 0 ? (
        <div className="space-y-1">
          <Field label="Recherche" htmlFor="locations-search-main">
            <LocationsSearchField
              id="locations-search-main"
              value={listSearch}
              onChange={onSearchChange}
              wrapperClassName="max-w-md"
            />
          </Field>
          <p className="text-[11px] leading-snug text-[var(--color-muted)]">
            Filtre la liste ci-dessous. Tri : cliquez sur les en-têtes de colonnes.
          </p>
        </div>
      ) : null}

      {filteredRows.length > 0 ? (
        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[var(--color-ink)]">Liste des locations</h2>
                  <p className="mt-0.5 min-h-[2.5rem] text-xs leading-snug text-[var(--color-muted)]">
                    Sur téléphone : fiches empilées. Sur grand écran : tableau triable (clic sur les en-têtes).
                  </p>
                  <p className="mt-2 min-h-[1.25rem] text-xs font-medium tabular-nums text-[var(--color-ink)]">
                    <span className="inline-block min-w-[8rem]">
                      {sortedTableRows.length} ligne{sortedTableRows.length !== 1 ? 's' : ''} affichée
                      {sortedTableRows.length !== 1 ? 's' : ''}
                    </span>
                    {listSearch.trim() ? (
                      <span className="block truncate font-normal text-[var(--color-muted)] sm:inline sm:max-w-[min(100%,24rem)]">
                        {' · '}
                        filtre « {listSearch.trim()} »
                      </span>
                    ) : null}
                  </p>
                </div>
                <HelpHint title="Recherche et tri s’appliquent à toute la liste affichée." />
              </div>
              <Field label="Recherche (même filtre)" htmlFor="locations-search-table" className="max-w-lg">
                <LocationsSearchField
                  id="locations-search-table"
                  value={listSearch}
                  onChange={onSearchChange}
                  wrapperClassName="w-full"
                />
              </Field>
            </div>
          </div>
          <LocationsCardList
            rows={sortedTableRows}
            flashLeaseId={flashLeaseId}
            locationSheetState={locationSheetState}
            onOpen={onOpen}
            onDelete={onDelete}
          />
          <LocationsTable
            rows={sortedTableRows}
            sort={sort}
            flashLeaseId={flashLeaseId}
            locationSheetState={locationSheetState}
            onOpen={onOpen}
            onDelete={onDelete}
          />
        </Card>
      ) : null}

      {rows.length > 0 && filteredRows.length === 0 && listSearch.trim() ? (
        <EmptyState
          className={emptyWrap}
          title={`Aucune location ne correspond à « ${listSearch.trim()} ».`}
          action={
            <Button type="button" variant="secondary" onClick={() => onSearchChange('')}>
              Effacer la recherche
            </Button>
          }
        />
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="Aucune location pour cette vue."
          description="Créez un bail (bien + unité + locataire) depuis la page Baux."
          action={
            <SmartLink to="/baux" className="text-sm font-medium text-brand-700 dark:text-brand-400">
              Aller aux baux
            </SmartLink>
          }
        />
      ) : null}
    </>
  );
}
