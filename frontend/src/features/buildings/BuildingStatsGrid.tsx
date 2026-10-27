import { StatTile } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import type { BuildingStats } from './buildingStats';

/** Grille d'indicateurs de la fiche (unités, non créées, avec locataire, revenu mensuel, surface). */
export function BuildingStatsGrid({ stats }: { stats: BuildingStats }) {
  return (
    <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto lg:max-w-2xl lg:grid-cols-3">
      <StatTile label="Unités" value={String(stats.total)} sub={stats.unitsSub} />
      {stats.declaredCapacity != null && stats.missingFromDeclared != null ? (
        <StatTile
          label="Non créé(s)"
          value={String(stats.missingFromDeclared)}
          emphasize={stats.missingFromDeclared > 0}
          sub={
            stats.structureKind === 'TERRAIN_LOTS'
              ? `sur ${stats.declaredCapacity} lot${stats.declaredCapacity !== 1 ? 's' : ''} déclaré${stats.declaredCapacity !== 1 ? 's' : ''}`
              : `sur ${stats.declaredCapacity} logement${stats.declaredCapacity !== 1 ? 's' : ''} prévu${stats.declaredCapacity !== 1 ? 's' : ''} sur ce bien`
          }
        />
      ) : null}
      <StatTile
        label="Avec locataire"
        value={String(stats.occupied)}
        sub={stats.total ? `${Math.round((stats.occupied / stats.total) * 100)} % du bien` : undefined}
      />
      <StatTile label="Sans bail actif" value={String(stats.vacant)} />
      <StatTile
        label="Revenu mensuel"
        value={fcfa(Math.round(stats.monthlyRentTotal))}
        sub="Somme des loyers (baux actifs)"
      />
      <StatTile
        label="Surface déclarée"
        value={stats.surfaceLabel}
        sub={
          stats.surfaceCount > 0
            ? `sur ${stats.surfaceCount} lot${stats.surfaceCount !== 1 ? 's' : ''}`
            : 'renseignez les m² par unité'
        }
      />
    </div>
  );
}
