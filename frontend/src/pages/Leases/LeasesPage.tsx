import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Callout, Skeleton } from '@/components/ui/index';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { useReturnRowFocus } from '@/hooks/useReturnRowFocus';
import { useEscapeCancel } from '@/lib/useEscapeCancel';
import { LeasesFilters } from './LeasesFilters';
import { LeasesHeader } from './LeasesHeader';
import { LeasesList } from './LeasesList';
import { LeasesToolbar } from './LeasesToolbar';
import { NewLeaseCard } from './NewLeaseCard';
import { QuickTenantModal } from './QuickTenantModal';
import { useLeaseDeepLink } from './useLeaseDeepLink';
import { useLeasesData } from './useLeasesData';
import { useLeasesFilters } from './useLeasesFilters';
import { useNewLeaseForm } from './useNewLeaseForm';
import { useQuickTenant } from './useQuickTenant';

/** Page Baux : chargement des données → filtres / formulaire de création → composition des sections. */
export function LeasesPage() {
  useRegisterRootSectionFallback();
  const routerLocation = useLocation();
  const locationSheetState = useMemo(() => ({ backgroundLocation: routerLocation }), [routerLocation]);
  const navigate = useNavigate();

  const data = useLeasesData();
  const filters = useLeasesFilters(data.leases);
  const deepLink = useLeaseDeepLink({
    leases: data.leases,
    tableLeases: filters.tableLeases,
    setStatusTab: filters.setStatusTab,
    setWellViewFilter: filters.setWellViewFilter,
  });
  const form = useNewLeaseForm({
    buildings: data.buildings,
    leases: data.leases,
    activeLeaseUnitIds: data.activeLeaseUnitIds,
    buildingsAvailableForNewLease: data.buildingsAvailableForNewLease,
    load: data.load,
  });
  const quickTenant = useQuickTenant({
    tenants: data.tenants,
    setTenants: data.setTenants,
    setTenantId: form.setTenantId,
  });
  const flashLeaseRowId = useReturnRowFocus({ rowIdPrefix: 'lease-row-', ready: data.leasesFetched });

  useEscapeCancel(form.addLeaseOpen || quickTenant.quickTenantOpen, () => {
    if (quickTenant.quickTenantOpen) {
      quickTenant.closeQuickTenant();
      return;
    }
    form.cancelNewLease();
  });

  return (
    <div className="space-y-6 pb-10">
      <LeasesHeader
        totalCount={data.leases.length}
        hasLeases={data.leases.length > 0}
        leaseIdFocus={deepLink.leaseIdFocus}
        leaseFocusSummary={deepLink.leaseFocusSummary}
        locationSheetState={locationSheetState}
        onNewLease={form.openAddLeaseForm}
        onClearFocus={deepLink.clearLeaseDeepLink}
      />

      <LeasesToolbar visibleCount={filters.leasesForTable.length} filterSummary={filters.filterSummaryShort} />

      {data.loadErr ? (
        <Callout variant="danger" title="La liste des baux n’a pas pu être chargée">
          <p>{data.loadErr}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={data.load}>
            Réessayer
          </Button>
        </Callout>
      ) : null}

      {!data.leasesFetched && !data.loadErr ? (
        <div className="space-y-3" role="status" aria-busy="true" aria-label="Chargement des baux">
          <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
          <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />
        </div>
      ) : null}

      {!data.loadErr ? (
        <>
          <NewLeaseCard
            form={form}
            buildingsAvailable={data.buildingsAvailableForNewLease}
            tenants={data.tenants}
            onOpenQuickTenant={quickTenant.openQuickTenant}
          />

          <div className="space-y-4">
            <LeasesFilters f={filters} stats={data.leaseStats} />
            {data.leasesFetched ? (
              <LeasesList
                tableLeases={filters.tableLeases}
                totalCount={data.leases.length}
                filteredCount={filters.filteredLeases.length}
                search={filters.leaseListSearch}
                onSearchChange={filters.setLeaseListSearch}
                sort={{ key: filters.leaseSortKey, dir: filters.leaseSortDir, onSort: filters.toggleLeaseSort }}
                genYear={filters.genYear}
                flashLeaseRowId={flashLeaseRowId}
                onOpen={(id) => navigate(`/locations/${id}`, { state: locationSheetState })}
                onChanged={data.load}
                onGeneratePayments={(id) => void data.generatePayments(id, filters.genYear)}
                onToggleActive={(lease) => void data.toggleActive(lease)}
                onNewLease={form.openAddLeaseForm}
              />
            ) : null}
          </div>
        </>
      ) : null}

      <QuickTenantModal q={quickTenant} />
    </div>
  );
}
