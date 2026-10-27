import { PageDetailHero } from '@/components/PageDetailHero';
import { BuildingHeroActions } from './BuildingHeroActions';
import { BuildingHeroInfo } from './BuildingHeroInfo';
import { BuildingStatsGrid } from './BuildingStatsGrid';
import type { BuildingStats } from './buildingStats';
import type { Building } from './types';
import type { UnitActions } from './useUnitActions';

type BuildingHeroProps = {
  b: Building;
  stats: BuildingStats | null;
  backHref: string;
  backLabel: string;
  actions: UnitActions;
  onAddUnit: () => void;
  onDeleteBuilding: () => void;
};

/** En-tête de la fiche bien : fil d'Ariane + actions, identité du bien et indicateurs. */
export function BuildingHero({ b, stats, backHref, backLabel, actions, onAddUnit, onDeleteBuilding }: BuildingHeroProps) {
  return (
    <PageDetailHero
      backHref={backHref}
      backLabel={backLabel}
      breadcrumbCurrent={b.name}
      headerEnd={
        <BuildingHeroActions
          buildingId={b.id}
          canAutoGenerateUnits={actions.canAutoGenerateUnits}
          autoGenBusy={actions.autoGenBusy}
          onAddUnit={onAddUnit}
          onAutoGenerate={() => void actions.autoGenerateUnitsFromStructure()}
          onDeleteBuilding={onDeleteBuilding}
        />
      }
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <BuildingHeroInfo b={b} />
        {stats ? <BuildingStatsGrid stats={stats} /> : null}
      </div>
    </PageDetailHero>
  );
}
