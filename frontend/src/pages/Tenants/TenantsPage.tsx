import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { useEscapeCancel } from '@/lib/useEscapeCancel';
import { NewTenantCard } from './NewTenantCard';
import { TenantsHeader } from './TenantsHeader';
import { TenantsList } from './TenantsList';
import { TenantsToolbar } from './TenantsToolbar';
import { useNewTenant } from './useNewTenant';
import { useTenantEdit } from './useTenantEdit';
import { useTenantsData } from './useTenantsData';
import { useTenantsFilters } from './useTenantsFilters';

/** Page Locataires : chargement → filtres / formulaires (création, édition) → composition des sections. */
export function TenantsPage() {
  useRegisterRootSectionFallback();

  const data = useTenantsData();
  const newTenant = useNewTenant({ load: data.load });
  const edit = useTenantEdit({ rows: data.rows, load: data.load });
  const filters = useTenantsFilters(data.rows);

  useEscapeCancel(edit.editingId !== null || newTenant.addTenantOpen, () => {
    if (edit.editingId !== null) edit.cancelEdit();
    else newTenant.cancelNewTenant();
  });

  return (
    <div className="space-y-6 pb-10">
      <TenantsHeader
        totalCount={data.rows.length}
        editParam={edit.editParam}
        onAddTenant={newTenant.openAddTenantForm}
        onCloseEdit={edit.cancelEdit}
      />

      <TenantsToolbar
        shownCount={filters.filteredRows.length}
        totalCount={data.rows.length}
        search={filters.listSearch}
        onSearchChange={filters.setListSearch}
        viewMode={filters.viewMode}
        onViewModeChange={filters.setViewMode}
      />

      <NewTenantCard form={newTenant} />

      <TenantsList
        rows={data.rows}
        filters={filters}
        edit={edit}
        sort={filters.sort}
        listFetched={data.listFetched}
        listErr={data.listErr}
        flashTenantId={data.flashTenantId}
        onChanged={data.load}
        onRetry={data.load}
        onRemove={(id) => void data.removeTenant(id)}
        onAddTenant={newTenant.openAddTenantForm}
      />
    </div>
  );
}
