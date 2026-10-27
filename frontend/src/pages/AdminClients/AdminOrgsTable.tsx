import { Button, Callout, Card, DataTable, StatusBadge } from '@/components/ui/index';
import { orgAccessStatus, type AdminOrgRow } from './types';

type AdminOrgsTableProps = {
  organizations: AdminOrgRow[];
  listLoading: boolean;
  listErr: string | null;
  onOpenAccess: (o: AdminOrgRow) => void;
};

function accessBadge(o: AdminOrgRow) {
  const s = orgAccessStatus(o);
  if (s === 'suspended') return <StatusBadge status="LATE" label="Suspendu" size="sm" />;
  if (s === 'expired') return <StatusBadge status="PENDING" label="Expiré" size="sm" />;
  return <StatusBadge status="PAID" label="Actif" size="sm" />;
}

/** Tableau des organisations clientes + contrôle d’accès. */
export function AdminOrgsTable({ organizations, listLoading, listErr, onOpenAccess }: AdminOrgsTableProps) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 py-3 sm:px-5">
        <h2 className="text-base font-semibold text-[var(--color-ink)]">Organisations</h2>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          Comptes clients — contrôle d’accès selon la facturation mensuelle que vous enregistrez ici.
        </p>
      </div>
      {listLoading ? (
        <p className="px-4 py-8 text-sm text-[var(--color-muted)]">Chargement…</p>
      ) : listErr ? (
        <div className="p-4">
          <Callout variant="danger">{listErr}</Callout>
        </div>
      ) : (
        <DataTable
          caption="Organisations clientes"
          className="rounded-none border-0"
          getRowId={(o) => o.id}
          rows={organizations}
          empty="Aucune organisation."
          columns={[
            {
              id: 'org',
              header: 'Organisation',
              cell: (o) => (
                <div className="max-w-[14rem]">
                  <p className="font-semibold text-[var(--color-ink)]">{o.name?.trim() || '—'}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    Créée le{' '}
                    {new Date(o.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              ),
            },
            {
              id: 'users',
              header: 'Comptes',
              cell: (o) => (
                <ul className="list-none space-y-0.5 text-xs">
                  {o.users.map((u) => (
                    <li key={u.id}>
                      <span className="font-medium text-[var(--color-ink)]">{u.email}</span>
                      {u.role === 'PLATFORM_ADMIN' ? (
                        <span className="ml-1 text-[10px] font-bold uppercase text-brand-700 dark:text-brand-400">
                          admin
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ),
            },
            {
              id: 'paidUntil',
              header: 'Payé jusqu’au',
              cell: (o) =>
                o.platformAccessPaidUntil
                  ? new Date(`${o.platformAccessPaidUntil}T12:00:00`).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—',
            },
            {
              id: 'status',
              header: 'Statut',
              cell: (o) => accessBadge(o),
            },
            {
              id: 'data',
              header: 'Données',
              align: 'right',
              cell: (o) => (
                <span className="text-xs text-[var(--color-muted)]">
                  {o.buildingCount} bien{o.buildingCount !== 1 ? 's' : ''} · {o.tenantCount} locataire
                  {o.tenantCount !== 1 ? 's' : ''}
                </span>
              ),
            },
            {
              id: 'action',
              header: ' ',
              align: 'right',
              cell: (o) => (
                <Button type="button" variant="secondary" className="py-1.5 text-xs" onClick={() => onOpenAccess(o)}>
                  Accès
                </Button>
              ),
            },
          ]}
        />
      )}
    </Card>
  );
}
