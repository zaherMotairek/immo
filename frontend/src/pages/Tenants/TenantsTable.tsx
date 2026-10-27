import { BuildingUnitStack } from '@/components/BuildingUnitBadges';
import { FicheLocationLink } from '@/components/FicheLocationLink';
import { SmartLink } from '@/components/SmartLink';
import { SortableTh } from '@/components/SortableTh';
import { Button } from '@/components/ui/index';
import { openTenantIdDocumentPreview } from '@/lib/api';
import {
  listTableCellClass,
  listTableDataRowClass,
  listTableEditingFirstCellClass,
  listTableFirstCellClass,
  listTableRowEditingClass,
  listTableRowOpenableClass,
  onListRowClick,
} from '@/lib/listTableStyles';
import { unitKindLabel } from '@/lib/unitKind';
import { TenantEditForm } from './TenantEditForm';
import type { Tenant, TenantSort } from './types';
import { tenantRowFlash } from './tenantUtils';
import type { TenantEdit } from './useTenantEdit';

type TenantsTableProps = {
  tenants: Tenant[];
  sort: TenantSort;
  edit: TenantEdit;
  flashTenantId: string | null;
  onChanged: () => void;
  onRemove: (id: string) => void;
};

const thStatic =
  'whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)] sm:px-3.5';

/** Tableau desktop des locataires (tri, ouverture de l'édition au clic, édition en ligne). */
export function TenantsTable({ tenants, sort, edit, flashTenantId, onChanged, onRemove }: TenantsTableProps) {
  const sortProps = { activeKey: sort.key, dir: sort.dir, onSort: sort.onSort };
  return (
    <div className="table-scroll overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)]">
            <SortableTh label="Locataire" columnKey="tenant" thClassName="whitespace-nowrap px-3 py-2 sm:px-3.5" {...sortProps} />
            <SortableTh label="Contact" columnKey="contact" thClassName="whitespace-nowrap px-3 py-2 sm:px-3.5" {...sortProps} />
            <SortableTh
              label="Bien & unité"
              columnKey="place"
              thClassName="min-w-[10rem] whitespace-nowrap px-3 py-2 sm:px-3.5"
              {...sortProps}
            />
            <th className={`w-[1%] text-right ${thStatic}`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((t, rowIndex) => {
            const l = t.leases[0];
            if (edit.editingId === t.id) {
              return (
                <tr
                  key={t.id}
                  id={`tenant-row-${t.id}`}
                  className={`scroll-mt-28 ${listTableRowEditingClass} ${tenantRowFlash(flashTenantId === t.id)}`}
                >
                  <td colSpan={4} className={listTableEditingFirstCellClass}>
                    <div className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] p-3 dark:border-zinc-600">
                      <TenantEditForm tenant={t} edit={edit} onChanged={onChanged} variant="desktop" />
                    </div>
                  </td>
                </tr>
              );
            }
            return (
              <tr
                key={t.id}
                id={`tenant-row-${t.id}`}
                title="Clic pour modifier"
                onClick={(e) => onListRowClick(e, () => edit.beginEdit(t))}
                className={`scroll-mt-28 ${listTableDataRowClass(rowIndex)} ${listTableRowOpenableClass} ${tenantRowFlash(flashTenantId === t.id)}`}
              >
                <td className={listTableFirstCellClass}>
                  <div className="min-w-0">
                    <SmartLink
                      to={`/locataires?edit=${encodeURIComponent(t.id)}`}
                      returnFocusId={t.id}
                      className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
                    >
                      {t.firstName} {t.lastName}
                    </SmartLink>
                    {t.idDocFileKey ? (
                      <button
                        type="button"
                        className="mt-0.5 block text-left text-[11px] text-[var(--color-muted)] hover:underline"
                        onClick={() => openTenantIdDocumentPreview(t.id)}
                      >
                        Pièce d’identité
                      </button>
                    ) : null}
                  </div>
                </td>
                <td className={`${listTableCellClass} text-[var(--color-ink)]`}>
                  <div className="max-w-[12rem] space-y-0.5">
                    <p className="text-sm tabular-nums">
                      {t.phone?.trim() ? (
                        <a href={`tel:${t.phone.replace(/\s/g, '')}`} className="hover:underline">
                          {t.phone}
                        </a>
                      ) : (
                        <span className="text-[var(--color-muted)]">—</span>
                      )}
                    </p>
                    {t.email?.trim() ? (
                      <p className="truncate text-[11px] text-[var(--color-muted)]">
                        <a href={`mailto:${t.email}`} className="hover:underline">
                          {t.email}
                        </a>
                      </p>
                    ) : null}
                  </div>
                </td>
                <td className={`${listTableCellClass} text-[var(--color-ink)]`}>
                  {l ? (
                    <BuildingUnitStack
                      buildingName={
                        <SmartLink
                          to={`/biens/${l.unit.building.id}?unitId=${encodeURIComponent(l.unit.id)}&hintUnitLabel=${encodeURIComponent(l.unit.label)}&returnLocation=${encodeURIComponent('/locataires')}`}
                          returnFocusId={t.id}
                          className="underline-offset-2 hover:underline"
                        >
                          {l.unit.building.name}
                        </SmartLink>
                      }
                      buildingSubline={
                        <>
                          {l.unit.building.commune}, {l.unit.building.city}
                        </>
                      }
                      unitKindLabel={unitKindLabel(l.unit.kind)}
                      unitLabel={l.unit.label}
                    />
                  ) : (
                    <span className="text-[var(--color-muted)]">Sans bail actif</span>
                  )}
                </td>
                <td className={`whitespace-nowrap text-right ${listTableCellClass}`}>
                  <div className="inline-flex items-center gap-1">
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
