import { FicheLocationLink } from '@/components/FicheLocationLink';
import { Button, CardList, cn } from '@/components/ui/index';
import { TenantEditForm } from './TenantEditForm';
import type { Tenant } from './types';
import { tenantRowFlash } from './tenantUtils';
import type { TenantEdit } from './useTenantEdit';

type TenantsCardListProps = {
  tenants: Tenant[];
  edit: TenantEdit;
  flashTenantId: string | null;
  onChanged: () => void;
  onRemove: (id: string) => void;
};

/**
 * Vue mobile des locataires : une ligne par locataire (ouvre l'édition) + actions.
 * Lignes `<li>` maison (et non `ListRow`) : elles portent un id de ligne et le formulaire d'édition en ligne.
 */
export function TenantsCardList({ tenants, edit, flashTenantId, onChanged, onRemove }: TenantsCardListProps) {
  return (
    <CardList ariaLabel="Liste des locataires" className="rounded-none border-x-0 border-b-0">
      {tenants.map((t) => {
        const l = t.leases[0];
        if (edit.editingId === t.id) {
          return (
            <li
              key={t.id}
              id={`tenant-row-${t.id}`}
              className={cn(
                'list-none scroll-mt-28 bg-[var(--odoo-table-head-bg)] p-3.5',
                tenantRowFlash(flashTenantId === t.id),
              )}
            >
              <TenantEditForm tenant={t} edit={edit} onChanged={onChanged} variant="mobile" />
            </li>
          );
        }
        return (
          <li
            key={t.id}
            id={`tenant-row-${t.id}`}
            className={cn('list-none scroll-mt-28 space-y-2 p-3.5', tenantRowFlash(flashTenantId === t.id))}
          >
            <button
              type="button"
              className="w-full rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              onClick={() => edit.beginEdit(t)}
            >
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {t.firstName} {t.lastName}
              </p>
              {t.phone?.trim() ? (
                <p className="mt-1 text-sm tabular-nums text-[var(--color-ink)]">{t.phone}</p>
              ) : null}
              {t.email?.trim() ? (
                <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">{t.email}</p>
              ) : null}
              {l ? (
                <p className="mt-1.5 text-xs text-[var(--color-ink)]">
                  {l.unit.building.name} · {l.unit.label}
                  <span className="text-[var(--color-muted)]">
                    {' '}
                    · {l.unit.building.commune}, {l.unit.building.city}
                  </span>
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">Sans bail actif</p>
              )}
            </button>
            <div className="flex flex-wrap items-center gap-1">
              {l ? <FicheLocationLink leaseId={l.id} returnFocusRowId={t.id} className="px-2" /> : null}
              <Button variant="ghost" size="sm" onClick={() => edit.beginEdit(t)}>
                Modifier
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--status-late)]"
                onClick={() => onRemove(t.id)}
              >
                Supprimer
              </Button>
            </div>
          </li>
        );
      })}
    </CardList>
  );
}
