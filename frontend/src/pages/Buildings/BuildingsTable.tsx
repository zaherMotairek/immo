import { useNavigate } from 'react-router-dom';
import { SmartLink } from '@/components/SmartLink';
import { BuildingKindIcon } from '@/features/buildings/BuildingKindIcon';
import {
  listTableCellClass,
  listTableClassName,
  listTableDataRowClass,
  listTableFirstCellClass,
  listTableRowOpenableClass,
  onListRowClick,
} from '@/lib/listTableStyles';
import {
  buildingDetailsText,
  buildingPlaceLine,
  buildingRowFlash,
  structureKindShort,
  type BuildingRow,
} from './buildingListUtils';

type BuildingsTableProps = {
  rows: BuildingRow[];
  flashBuildingId: string | null;
  onDelete: (b: BuildingRow) => void;
};

const thClass =
  'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)] sm:px-4';

/** Tableau desktop des biens : un clic sur la ligne ouvre la fiche. */
export function BuildingsTable({ rows, flashBuildingId, onDelete }: BuildingsTableProps) {
  const navigate = useNavigate();
  return (
    <div className="table-scroll min-w-0 overflow-x-auto">
      <table className={`${listTableClassName} min-w-[720px]`}>
        <thead>
          <tr className="border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)]">
            <th scope="col" className={thClass}>
              Bien
            </th>
            <th scope="col" className={thClass}>
              Localisation
            </th>
            <th scope="col" className={thClass}>
              Type
            </th>
            <th scope="col" className={thClass}>
              Détails
            </th>
            <th scope="col" className={`${thClass} text-right`}>
              Unités
            </th>
            <th scope="col" className={`${thClass} text-right`}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b, rowIndex) => (
            <tr
              key={b.id}
              id={`bien-row-${b.id}`}
              title="Clic pour ouvrir la fiche"
              onClick={(e) => onListRowClick(e, () => navigate(`/biens/${b.id}`))}
              className={`scroll-mt-28 ${listTableDataRowClass(rowIndex)} ${listTableRowOpenableClass} ${buildingRowFlash(flashBuildingId === b.id)}`}
            >
              <td className={listTableFirstCellClass}>
                <div className="flex min-w-0 items-center gap-2">
                  <BuildingKindIcon structureKind={b.structureKind} />
                  <SmartLink
                    to={`/biens/${b.id}`}
                    returnFocusId={b.id}
                    className="truncate text-sm font-semibold text-[var(--color-ink)] underline-offset-2 hover:underline"
                  >
                    {b.name}
                  </SmartLink>
                </div>
              </td>
              <td className={`${listTableCellClass} text-[var(--color-ink)]`}>
                <span className="block text-xs leading-snug sm:text-sm">{buildingPlaceLine(b)}</span>
              </td>
              <td className={`${listTableCellClass} text-xs text-[var(--color-ink)]`}>
                {structureKindShort(b.structureKind)}
              </td>
              <td className={`${listTableCellClass} text-xs text-[var(--color-muted)]`}>{buildingDetailsText(b)}</td>
              <td className={`${listTableCellClass} text-right tabular-nums text-[var(--color-ink)]`}>
                {b._count.units}
              </td>
              <td className={`${listTableCellClass} text-right`}>
                <div className="inline-flex items-center gap-2.5">
                  <SmartLink
                    to={`/biens/${b.id}`}
                    returnFocusId={b.id}
                    className="text-xs font-medium text-[var(--color-ink)] underline-offset-2 hover:underline"
                  >
                    Ouvrir
                  </SmartLink>
                  <button
                    type="button"
                    className="text-xs font-medium text-[var(--status-late)] underline-offset-2 hover:underline"
                    onClick={() => onDelete(b)}
                  >
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
