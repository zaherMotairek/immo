import { Button, Card, EmptyState, Input, SegmentedControl } from '@/components/ui/index';
import { useIsDesktop } from '@/pages/Payments/useIsDesktop';
import type { BuildingStats } from './buildingStats';
import type { Building, UnitListFilter } from './types';
import { UnitsCardList } from './UnitsCardList';
import { UnitsTable } from './UnitsTable';
import type { UnitActions } from './useUnitActions';
import type { UnitsList } from './useUnitsList';

const FILTER_OPTIONS: { id: UnitListFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'vacant', label: 'Libres' },
  { id: 'occupied', label: 'Louées' },
];

const emptyWrap = 'rounded-none border-0 border-t border-solid';

type UnitsTabProps = {
  b: Building;
  stats: BuildingStats | null;
  list: UnitsList;
  actions: UnitActions;
  onAddUnit: () => void;
};

/** Onglet « Unités » : en-tête (compteurs, filtre libres / louées, recherche), tableau ou cartes, états vides. */
export function UnitsTab({ b, stats, list, actions, onAddUnit }: UnitsTabProps) {
  const isDesktop = useIsDesktop();
  const { filteredUnits, tableUnits, unitListSearch, setUnitListSearch, unitListFilter, setUnitListFilter } = list;
  const hasUnits = b.units.length > 0;

  return (
    <Card id="fiche-unites" padding="none" className="scroll-mt-24 overflow-hidden !border-0 !shadow-none">
      <div className="flex flex-col gap-3 border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-ink)]">Liste des unités</h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Tri par étage et n° de lot. Modifiez la nature du local dans la colonne dédiée.
            </p>
            {hasUnits && stats ? (
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {tableUnits.length === filteredUnits.length
                  ? `${filteredUnits.length} unité${filteredUnits.length !== 1 ? 's' : ''} affichée${filteredUnits.length !== 1 ? 's' : ''}`
                  : `${tableUnits.length} sur ${filteredUnits.length} affichée${tableUnits.length !== 1 ? 's' : ''}`}
                {' · '}
                <span className="text-[var(--status-paid)]">
                  {stats.occupied} louée{stats.occupied !== 1 ? 's' : ''}
                </span>
                {' · '}
                <span>
                  {stats.vacant} libre{stats.vacant !== 1 ? 's' : ''}
                </span>
              </p>
            ) : null}
          </div>
          {hasUnits ? (
            <SegmentedControl
              ariaLabel="Filtrer les unités"
              options={FILTER_OPTIONS}
              value={unitListFilter}
              onChange={(id) => setUnitListFilter(id as UnitListFilter)}
            />
          ) : null}
        </div>
        {hasUnits ? (
          <div className="relative w-full min-w-0 sm:max-w-xs">
            <span
              className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[var(--color-muted)]"
              aria-hidden
            >
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
              className="!pl-10 pr-9"
              aria-label="Filtrer la liste des unités"
              autoComplete="off"
            />
            {unitListSearch.trim() ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded p-1 text-[var(--color-muted)] hover:bg-[var(--odoo-row-hover)] hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
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

      {hasUnits && tableUnits.length > 0 ? (
        isDesktop ? (
          <UnitsTable b={b} list={list} actions={actions} />
        ) : (
          <UnitsCardList b={b} list={list} actions={actions} />
        )
      ) : null}

      {!hasUnits ? (
        <EmptyState
          className={emptyWrap}
          title="Aucune unité pour ce bien."
          action={
            <>
              <Button variant="secondary" onClick={onAddUnit}>
                Ajouter une unité
              </Button>
              {actions.canAutoGenerateUnits ? (
                <Button
                  variant="secondary"
                  disabled={actions.autoGenBusy}
                  onClick={() => void actions.autoGenerateUnitsFromStructure()}
                >
                  {actions.autoGenBusy ? 'Génération…' : 'Générer unités auto'}
                </Button>
              ) : null}
            </>
          }
        />
      ) : null}
      {hasUnits && filteredUnits.length === 0 ? (
        <EmptyState
          className={emptyWrap}
          title="Aucune unité dans cette vue."
          description="Choisissez « Toutes » ou un autre filtre."
        />
      ) : null}
      {hasUnits && filteredUnits.length > 0 && tableUnits.length === 0 ? (
        <EmptyState
          className={emptyWrap}
          title="Aucun résultat pour cette recherche."
          action={
            <Button variant="secondary" onClick={() => setUnitListSearch('')}>
              Effacer la recherche
            </Button>
          }
        />
      ) : null}
    </Card>
  );
}
