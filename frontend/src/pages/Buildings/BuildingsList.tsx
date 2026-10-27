import { Button, Callout, Card, EmptyState } from '@/components/ui/index';
import { useIsDesktop } from '../Payments/useIsDesktop';
import { BuildingsCardList } from './BuildingsCardList';
import { BuildingsKanban } from './BuildingsKanban';
import { BuildingsTable } from './BuildingsTable';
import type { BuildingRow } from './buildingListUtils';
import type { BuildingsFilters } from './useBuildingsFilters';

type BuildingsListProps = {
  rows: BuildingRow[];
  filters: BuildingsFilters;
  listErr: string | null;
  flashBuildingId: string | null;
  onRetry: () => void;
  onDelete: (b: BuildingRow) => void;
  onAddBuilding: () => void;
};

const emptyWrap = 'rounded-none border-0 border-t border-solid';

/** Section « Liste des biens » : en-tête, erreur de chargement, tableau (desktop) / cartes (mobile) / kanban, états vides. */
export function BuildingsList({
  rows,
  filters,
  listErr,
  flashBuildingId,
  onRetry,
  onDelete,
  onAddBuilding,
}: BuildingsListProps) {
  const isDesktop = useIsDesktop();
  const { filteredRows, viewMode, genreFilter, listSearch, setListSearch, totalUnits, totalUnitsFiltered } = filters;
  const total = rows.length;
  const searching = listSearch.trim() !== '';

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 py-3 sm:px-5">
        <h2 className="text-base font-semibold tracking-tight text-[var(--color-ink)]">
          {viewMode === 'kanban' ? 'Kanban patrimoine' : 'Liste des biens'}
        </h2>
        {total > 0 ? (
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {searching ? (
              <>
                <span className="font-semibold tabular-nums text-[var(--color-ink)]">{filteredRows.length}</span> sur{' '}
                <span className="tabular-nums">{total}</span> {total !== 1 ? 'biens affichés' : 'bien affiché'}
                {genreFilter ? ' (filtre genre actif)' : ''} ·{' '}
                <span className="tabular-nums">{totalUnitsFiltered}</span> unité{totalUnitsFiltered !== 1 ? 's' : ''} dans
                cette sélection
              </>
            ) : (
              <>
                <span className="font-semibold tabular-nums text-[var(--color-ink)]">{total}</span> bien
                {total !== 1 ? 's' : ''}
                {genreFilter ? ' (filtre actif)' : ''} · <span className="tabular-nums">{totalUnits}</span> unité
                {totalUnits !== 1 ? 's' : ''} au total
              </>
            )}
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">Aucun bien pour cette vue.</p>
        )}
      </div>

      {listErr ? (
        <div className="p-4">
          <Callout variant="danger" title="La liste n’a pas pu être chargée">
            <p>{listErr}</p>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Si vous voyez une erreur serveur (500) : dans le dossier{' '}
              <code className="rounded bg-[var(--odoo-table-head-bg)] px-1">backend</code>, arrêtez Node, puis{' '}
              <code className="rounded bg-[var(--odoo-table-head-bg)] px-1">npx prisma migrate deploy</code> et{' '}
              <code className="rounded bg-[var(--odoo-table-head-bg)] px-1">npx prisma generate</code>, relancez{' '}
              <code className="rounded bg-[var(--odoo-table-head-bg)] px-1">npm run start:dev</code>. Assurez-vous d’être
              connecté.
            </p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
              Réessayer
            </Button>
          </Callout>
        </div>
      ) : null}

      {filteredRows.length > 0 && viewMode === 'kanban' ? <BuildingsKanban columns={filters.kanbanColumns} /> : null}

      {filteredRows.length > 0 && viewMode === 'list' ? (
        isDesktop ? (
          <BuildingsTable rows={filteredRows} flashBuildingId={flashBuildingId} onDelete={onDelete} />
        ) : (
          <BuildingsCardList rows={filteredRows} flashBuildingId={flashBuildingId} onDelete={onDelete} />
        )
      ) : null}

      {total > 0 && filteredRows.length === 0 && searching && !listErr ? (
        <EmptyState
          className={emptyWrap}
          title={`Aucun bien ne correspond à « ${listSearch.trim()} ».`}
          action={
            <Button variant="secondary" onClick={() => setListSearch('')}>
              Effacer la recherche
            </Button>
          }
        />
      ) : null}

      {total === 0 && !listErr ? (
        genreFilter ? (
          <EmptyState
            className={emptyWrap}
            title="Aucun bien ne correspond à ce genre."
            action={
              <Button variant="secondary" onClick={filters.clearGenreFilter}>
                Retirer le filtre
              </Button>
            }
          />
        ) : (
          <EmptyState
            className={emptyWrap}
            title="Aucun bien pour le moment."
            description="Utilisez le formulaire « Nouveau bien » ci-dessus ou lancez « npm run seed » côté backend."
            action={<Button onClick={onAddBuilding}>Créer un premier bien</Button>}
          />
        )
      ) : null}
    </Card>
  );
}
