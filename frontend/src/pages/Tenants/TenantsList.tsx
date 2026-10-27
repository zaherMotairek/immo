import { Button, Card, EmptyState } from '@/components/ui/index';
import { useIsDesktop } from '../Payments/useIsDesktop';
import { TenantsCardList } from './TenantsCardList';
import { TenantsKanban } from './TenantsKanban';
import { TenantsTable } from './TenantsTable';
import type { Tenant, TenantSort } from './types';
import type { TenantEdit } from './useTenantEdit';
import type { TenantsFilters } from './useTenantsFilters';

type TenantsListProps = {
  rows: Tenant[];
  filters: TenantsFilters;
  edit: TenantEdit;
  sort: TenantSort;
  flashTenantId: string | null;
  onChanged: () => void;
  onRemove: (id: string) => void;
  onAddTenant: () => void;
};

const emptyWrap = 'rounded-none border-0 border-t border-solid';

/** Section « Liste des locataires » : en-tête + tableau (desktop) / cartes (mobile) / kanban + états vides. */
export function TenantsList({
  rows,
  filters,
  edit,
  sort,
  flashTenantId,
  onChanged,
  onRemove,
  onAddTenant,
}: TenantsListProps) {
  const isDesktop = useIsDesktop();
  const { filteredRows, sortedFilteredRows, kanbanTenants, viewMode, setListSearch } = filters;
  const total = rows.length;
  const shown = filteredRows.length;
  const hasRows = total > 0 && shown > 0;

  return (
    <section id="liste-des-locataires" className="min-w-0 scroll-mt-24">
      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold tracking-tight text-[var(--color-ink)]">
            {viewMode === 'kanban' ? 'Kanban locataires' : 'Liste des locataires'}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {shown === total
              ? `${total} fiche${total !== 1 ? 's' : ''}`
              : `${shown} sur ${total} affichée${shown !== 1 ? 's' : ''}`}
          </p>
        </div>

        {hasRows && viewMode === 'kanban' ? (
          <TenantsKanban withLease={kanbanTenants.withLease} withoutLease={kanbanTenants.withoutLease} />
        ) : null}

        {total > 0 && viewMode === 'list' ? (
          isDesktop ? (
            <TenantsTable
              tenants={sortedFilteredRows}
              sort={sort}
              edit={edit}
              flashTenantId={flashTenantId}
              onChanged={onChanged}
              onRemove={onRemove}
            />
          ) : (
            <TenantsCardList
              tenants={sortedFilteredRows}
              edit={edit}
              flashTenantId={flashTenantId}
              onChanged={onChanged}
              onRemove={onRemove}
            />
          )
        ) : null}

        {total === 0 ? (
          <EmptyState
            className={emptyWrap}
            title="Aucun locataire."
            description="Ajoutez un premier locataire pour pouvoir lui créer un bail."
            action={<Button onClick={onAddTenant}>Ajouter un premier locataire</Button>}
          />
        ) : null}
        {total > 0 && shown === 0 ? (
          <EmptyState
            className={emptyWrap}
            title="Aucun résultat pour cette recherche."
            action={
              <Button variant="secondary" onClick={() => setListSearch('')}>
                Effacer la recherche
              </Button>
            }
          />
        ) : null}
      </Card>
    </section>
  );
}
