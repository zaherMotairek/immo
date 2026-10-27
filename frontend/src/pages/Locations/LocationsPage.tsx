import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { LocationsHeader } from './LocationsHeader';
import { LocationsList } from './LocationsList';
import { useLocationsData } from './useLocationsData';
import { useLocationsFilters } from './useLocationsFilters';

/** Page Locations : overview baux, recherche / tri, fiches et suppression. */
export function LocationsPage() {
  useRegisterRootSectionFallback();
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const locationSheetState = useMemo(() => ({ backgroundLocation: routerLocation }), [routerLocation]);
  const [showAll, setShowAll] = useState(false);

  const data = useLocationsData(showAll);
  const filters = useLocationsFilters(data.rows);

  return (
    <div id="locations-page-root" className="space-y-4">
      <LocationsHeader
        totalCount={data.rows.length}
        showAll={showAll}
        onToggleShowAll={() => setShowAll((v) => !v)}
      />
      <LocationsList
        rows={data.rows}
        filteredRows={filters.filteredRows}
        sortedTableRows={filters.sortedTableRows}
        listSearch={filters.listSearch}
        onSearchChange={filters.setListSearchPreserveScroll}
        sort={{
          key: filters.tableSortKey,
          dir: filters.tableSortDir,
          onSort: filters.toggleTableSort,
        }}
        listFetched={data.listFetched}
        listErr={data.listErr}
        flashLeaseId={data.flashLeaseId}
        locationSheetState={locationSheetState}
        onRetry={data.load}
        onOpen={(leaseId) => navigate(`/locations/${leaseId}`, { state: locationSheetState })}
        onDelete={(r) => void data.requestDeleteLocation(r)}
      />
    </div>
  );
}
