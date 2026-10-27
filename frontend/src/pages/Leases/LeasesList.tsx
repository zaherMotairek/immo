import { Button, Card, EmptyState } from '@/components/ui/index';
import { LeasesCardList } from './LeasesCardList';
import { LeasesListHeader } from './LeasesListHeader';
import { LeasesTable } from './LeasesTable';
import type { LeaseSortKey, LeasesViewProps } from './types';
import type { TableSortDir } from '@/lib/tableSort';
import { useIsDesktop } from '../Payments/useIsDesktop';

type LeasesListProps = Omit<LeasesViewProps, 'leases'> & {
  /** Baux visibles (filtrés + triés). */
  tableLeases: LeasesViewProps['leases'];
  /** Nombre total de baux chargés. */
  totalCount: number;
  /** Baux après filtres statut / nature (avant recherche texte). */
  filteredCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  sort: { key: LeaseSortKey; dir: TableSortDir; onSort: (k: LeaseSortKey) => void };
  onNewLease: () => void;
};

const emptyWrap = 'rounded-none border-0 border-t border-solid';

/** Section « Liste des baux » : en-tête + tableau (desktop) ou cartes (mobile) + états vides. */
export function LeasesList({
  tableLeases,
  totalCount,
  filteredCount,
  search,
  onSearchChange,
  sort,
  onNewLease,
  ...view
}: LeasesListProps) {
  const isDesktop = useIsDesktop();
  const hasRows = totalCount > 0 && filteredCount > 0 && tableLeases.length > 0;

  return (
    <section id="liste-des-baux" className="min-w-0 scroll-mt-24">
      <Card padding="none" className="overflow-hidden">
        <LeasesListHeader
          shownCount={tableLeases.length}
          filteredCount={filteredCount}
          search={search}
          onSearchChange={onSearchChange}
        />

        {hasRows ? (
          isDesktop ? (
            <LeasesTable leases={tableLeases} sort={sort} {...view} />
          ) : (
            <LeasesCardList leases={tableLeases} {...view} />
          )
        ) : null}

        {totalCount === 0 ? (
          <EmptyState
            className={emptyWrap}
            title="Aucun bail enregistré pour le moment."
            description="Commencez par créer un bail ci-dessus, ou vérifiez vos biens et unités."
            action={<Button onClick={onNewLease}>Créer un premier bail</Button>}
          />
        ) : null}
        {totalCount > 0 && filteredCount === 0 ? (
          <EmptyState
            className={emptyWrap}
            title="Aucun bail ne correspond à vos filtres."
            description="Élargissez la nature du local ou le statut dans les filtres ci-dessus."
            action={
              <a
                href="#filtres-baux"
                className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
              >
                Remonter aux filtres
              </a>
            }
          />
        ) : null}
        {totalCount > 0 && filteredCount > 0 && tableLeases.length === 0 ? (
          <EmptyState
            className={emptyWrap}
            title="Aucun résultat pour cette recherche."
            action={
              <Button variant="secondary" onClick={() => onSearchChange('')}>
                Effacer la recherche
              </Button>
            }
          />
        ) : null}
      </Card>
    </section>
  );
}
