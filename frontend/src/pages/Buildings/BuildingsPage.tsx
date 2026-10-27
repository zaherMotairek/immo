import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { useEscapeCancel } from '@/lib/useEscapeCancel';
import { BuildingsHeader } from './BuildingsHeader';
import { BuildingsList } from './BuildingsList';
import { BuildingsToolbar } from './BuildingsToolbar';
import { NewBuildingCard } from './NewBuildingCard';
import { useBuildingsData } from './useBuildingsData';
import { useBuildingsFilters, useGenreFilter } from './useBuildingsFilters';
import { useNewBuilding } from './useNewBuilding';

/** Page « Mes biens » : chargement → filtres / formulaire de création → composition des sections. */
export function BuildingsPage() {
  useRegisterRootSectionFallback();

  // Le filtre « genre » (URL) pilote le chargement ; recherche et affichage en dérivent.
  const genre = useGenreFilter();
  const data = useBuildingsData(genre.genreFilter);
  const filters = useBuildingsFilters(data.rows, genre);
  const newBuilding = useNewBuilding({ load: data.load });

  useEscapeCancel(newBuilding.addFormOpen, newBuilding.cancelNewBuilding);

  return (
    <div className="space-y-4">
      <BuildingsHeader totalCount={data.rows.length} onAddBuilding={newBuilding.openAddForm} />
      <NewBuildingCard form={newBuilding} />
      <BuildingsToolbar filters={filters} totalCount={data.rows.length} />
      <BuildingsList
        rows={data.rows}
        filters={filters}
        listFetched={data.listFetched}
        listErr={data.listErr}
        flashBuildingId={data.flashBuildingId}
        onRetry={data.load}
        onDelete={(b) => void data.requestDeleteBuilding(b)}
        onAddBuilding={newBuilding.openAddForm}
      />
    </div>
  );
}
