import { useNavigate } from 'react-router-dom';
import { SmartLink } from '@/components/SmartLink';
import { Button, CardList, cn } from '@/components/ui/index';
import { BuildingKindIcon } from '@/features/buildings/BuildingKindIcon';
import {
  buildingDetailsText,
  buildingPlaceLine,
  buildingRowFlash,
  structureKindShort,
  type BuildingRow,
} from './buildingListUtils';

type BuildingsCardListProps = {
  rows: BuildingRow[];
  flashBuildingId: string | null;
  onDelete: (b: BuildingRow) => void;
};

/**
 * Vue mobile des biens : une ligne par bien (ouvre la fiche) + actions.
 * Lignes `<li>` maison (et non `ListRow`) : elles portent l'id de ligne et les actions « Ouvrir » / « Supprimer ».
 */
export function BuildingsCardList({ rows, flashBuildingId, onDelete }: BuildingsCardListProps) {
  const navigate = useNavigate();
  return (
    <CardList ariaLabel="Liste des biens" className="rounded-none border-x-0 border-b-0">
      {rows.map((b) => {
        const details = buildingDetailsText(b);
        return (
          <li
            key={b.id}
            id={`bien-row-${b.id}`}
            className={cn('list-none scroll-mt-28 space-y-2 p-3.5', buildingRowFlash(flashBuildingId === b.id))}
          >
            <button
              type="button"
              className="w-full rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              onClick={() => navigate(`/biens/${b.id}`)}
            >
              <div className="flex items-start gap-2">
                <BuildingKindIcon structureKind={b.structureKind} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{b.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-ink)]">{buildingPlaceLine(b)}</p>
                  <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                    {structureKindShort(b.structureKind)}
                    {details ? ` · ${details}` : ''}
                    {' · '}
                    {b._count.units} unité{b._count.units !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </button>
            <div className="flex flex-wrap items-center gap-1 pl-11">
              <SmartLink
                to={`/biens/${b.id}`}
                returnFocusId={b.id}
                className="inline-flex min-h-9 items-center rounded-[var(--radius-input)] px-3 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--odoo-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                Ouvrir
              </SmartLink>
              <Button variant="ghost" size="sm" className="text-[var(--status-late)]" onClick={() => onDelete(b)}>
                Supprimer
              </Button>
            </div>
          </li>
        );
      })}
    </CardList>
  );
}
