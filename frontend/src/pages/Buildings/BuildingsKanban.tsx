import { useNavigate } from 'react-router-dom';
import { OdooKanbanBoard, OdooKanbanCard, OdooKanbanColumn } from '@/components/OdooKit';
import { BUILDING_STRUCTURE_OPTIONS, type BuildingStructureValue } from '@/lib/buildingStructure';
import type { BuildingRow } from './buildingListUtils';

type BuildingsKanbanProps = {
  columns: Record<BuildingStructureValue, BuildingRow[]>;
};

/** Vue Kanban : une colonne par genre de bien ; un clic ouvre la fiche. */
export function BuildingsKanban({ columns }: BuildingsKanbanProps) {
  const navigate = useNavigate();
  return (
    <div className="p-4">
      <OdooKanbanBoard>
        {BUILDING_STRUCTURE_OPTIONS.map((opt) => (
          <OdooKanbanColumn key={opt.value} title={opt.cardTitle} count={columns[opt.value].length}>
            {columns[opt.value].map((b) => (
              <OdooKanbanCard key={b.id} onClick={() => navigate(`/biens/${b.id}`)}>
                <p className="text-sm font-semibold text-[var(--color-ink)]">{b.name}</p>
                <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                  {[b.commune ?? '—', b.city].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-1 text-[10px] font-bold tabular-nums text-brand-700 dark:text-brand-300">
                  {b._count.units} unité{b._count.units !== 1 ? 's' : ''}
                </p>
              </OdooKanbanCard>
            ))}
          </OdooKanbanColumn>
        ))}
      </OdooKanbanBoard>
    </div>
  );
}
