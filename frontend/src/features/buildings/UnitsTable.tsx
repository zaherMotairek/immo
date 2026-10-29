import { UnitScopeBadge } from '@/components/BuildingUnitBadges';
import { SortableTh } from '@/components/SortableTh';
import { Input, Select } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import { listTableCellClass, listTableDataRowClass, listTableFirstCellClass } from '@/lib/listTableStyles';
import { UNIT_KIND_OPTIONS } from '@/lib/unitKind';
import { floorLabel, unitIsOccupied, unitSlotCaption } from './buildingUtils';
import type { Building } from './types';
import { UnitOccupancyBadge } from './UnitOccupancyBadge';
import { UnitRowActions } from './UnitRowActions';
import type { UnitActions } from './useUnitActions';
import type { UnitsList } from './useUnitsList';

const KIND_OPTIONS = UNIT_KIND_OPTIONS.map((o) => ({ id: o.value as string, label: o.label }));

type UnitsTableProps = {
  b: Building;
  list: UnitsList;
  actions: UnitActions;
};

/** Tableau desktop des unités : tri, nature, surnom éditable, locataire, loyer, statut. */
export function UnitsTable({ b, list, actions }: UnitsTableProps) {
  const { displayUnits, unitDrafts, setUnitDrafts, unitSortKey, unitSortDir, toggleUnitSort } = list;
  const sortProps = { activeKey: unitSortKey, dir: unitSortDir, onSort: toggleUnitSort };

  return (
    <div className="table-scroll overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)]">
            <SortableTh label="Unité" columnKey="label" {...sortProps} />
            <SortableTh
              label="Nature du local"
              columnKey="kind"
              thClassName="min-w-[11rem] whitespace-nowrap px-4 py-2.5 sm:px-5"
              {...sortProps}
            />
            <SortableTh label="Étage" columnKey="floor" {...sortProps} />
            <SortableTh
              label="Locataire"
              columnKey="tenant"
              thClassName="min-w-[10rem] whitespace-nowrap px-4 py-2.5 sm:px-5"
              {...sortProps}
            />
            <SortableTh label="Loyer" columnKey="rent" {...sortProps} />
            <SortableTh label="Statut" columnKey="status" {...sortProps} />
            <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-right sm:px-5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {displayUnits.map((u, rowIndex) => {
            const lease0 = u.leases?.[0];
            const tenant = lease0?.tenant;
            const rawRent = lease0?.monthlyRent;
            const rent = rawRent != null && rawRent !== '' ? Number(rawRent) : null;
            const fl = floorLabel(u.floor);
            return (
              <tr key={u.id} id={`unit-row-${u.id}`} className={listTableDataRowClass(rowIndex)}>
                <td className={listTableFirstCellClass}>
                  <div className="flex min-w-0 max-w-[18rem] items-start gap-2">
                    <UnitScopeBadge className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                        {unitSlotCaption(u)}
                      </p>
                      <Input
                        aria-label={`Surnom de l’unité — ${unitSlotCaption(u)}`}
                        value={unitDrafts[u.id]?.label ?? u.label}
                        onChange={(e) =>
                          setUnitDrafts((prev) => ({
                            ...prev,
                            [u.id]: {
                              label: e.target.value,
                              surfaceM2:
                                prev[u.id]?.surfaceM2 ?? (u.surfaceM2 != null ? String(u.surfaceM2) : ''),
                              rooms: prev[u.id]?.rooms ?? (u.rooms != null ? String(u.rooms) : ''),
                            },
                          }))
                        }
                        onBlur={() => void actions.updateUnitMetrics(u)}
                        className="mt-0.5 font-semibold"
                        placeholder="Surnom libre…"
                      />
                      {u.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">{u.description}</p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className={listTableCellClass}>
                  <Select
                    id={`unit-kind-${u.id}`}
                    aria-label={`Nature du local — ${u.label}`}
                    options={KIND_OPTIONS}
                    value={u.kind ?? 'APARTMENT'}
                    onValueChange={(v) => void actions.updateUnitKind(u.id, v)}
                    className="min-w-[10rem]"
                  />
                </td>
                <td className={`whitespace-nowrap text-[var(--color-ink)] ${listTableCellClass}`}>{fl ?? '—'}</td>
                <td className={`text-[var(--color-ink)] ${listTableCellClass}`}>
                  {tenant ? (
                    <span className="font-medium">
                      {tenant.firstName} {tenant.lastName}
                    </span>
                  ) : (
                    <span className="text-[var(--color-muted)]">—</span>
                  )}
                </td>
                <td className={`whitespace-nowrap tabular-nums text-[var(--color-ink)] ${listTableCellClass}`}>
                  {rent != null && Number.isFinite(rent) ? fcfa(rent) : '—'}
                </td>
                <td className={listTableCellClass}>
                  <UnitOccupancyBadge occupied={unitIsOccupied(u)} />
                </td>
                <td className={`whitespace-nowrap text-right ${listTableCellClass}`}>
                  <UnitRowActions buildingId={b.id} unit={u} onRemove={(unitId) => void actions.removeUnit(unitId)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
