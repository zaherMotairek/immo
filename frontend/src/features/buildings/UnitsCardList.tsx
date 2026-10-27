import { CardList, Input, Select } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import { UNIT_KIND_OPTIONS } from '@/lib/unitKind';
import { floorLabel, unitIsOccupied, unitSlotCaption } from './buildingUtils';
import type { Building } from './types';
import { UnitOccupancyBadge } from './UnitOccupancyBadge';
import { UnitRowActions } from './UnitRowActions';
import type { UnitActions } from './useUnitActions';
import type { UnitsList } from './useUnitsList';

const KIND_OPTIONS = UNIT_KIND_OPTIONS.map((o) => ({ id: o.value as string, label: o.label }));

type UnitsCardListProps = {
  b: Building;
  list: UnitsList;
  actions: UnitActions;
};

/**
 * Vue mobile des unités : une carte par unité (identité, statut, locataire / loyer) avec les mêmes champs éditables
 * (nature, surface, pièces au blur) et actions que le tableau desktop.
 */
export function UnitsCardList({ b, list, actions }: UnitsCardListProps) {
  const { displayUnits, unitDrafts, setUnitDrafts } = list;
  return (
    <CardList ariaLabel="Liste des unités" className="rounded-none border-x-0 border-b-0">
      {displayUnits.map((u) => {
        const lease0 = u.leases?.[0];
        const tenant = lease0?.tenant;
        const rawRent = lease0?.monthlyRent;
        const rent = rawRent != null && rawRent !== '' ? Number(rawRent) : null;
        const fl = floorLabel(u.floor);
        return (
          <li key={u.id} id={`unit-row-${u.id}`} className="list-none scroll-mt-28 space-y-3 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                  {unitSlotCaption(u)}
                  {fl ? ` · ${fl}` : ''}
                </p>
                <p className="font-semibold leading-snug text-[var(--color-ink)]">{u.label}</p>
                {u.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">{u.description}</p>
                ) : null}
              </div>
              <UnitOccupancyBadge occupied={unitIsOccupied(u)} />
            </div>
            <p className="text-xs text-[var(--color-ink)]">
              {tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Aucun locataire'}
              {rent != null && Number.isFinite(rent) ? (
                <span className="tabular-nums text-[var(--color-muted)]"> · {fcfa(rent)}</span>
              ) : null}
            </p>
            <Select
              id={`unit-kind-${u.id}`}
              aria-label={`Nature du local — ${u.label}`}
              options={KIND_OPTIONS}
              value={u.kind ?? 'APARTMENT'}
              onValueChange={(v) => void actions.updateUnitKind(u.id, v)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                aria-label={`Surface (m²) — ${u.label}`}
                value={unitDrafts[u.id]?.surfaceM2 ?? ''}
                onChange={(e) =>
                  setUnitDrafts((prev) => ({
                    ...prev,
                    [u.id]: { surfaceM2: e.target.value, rooms: prev[u.id]?.rooms ?? (u.rooms != null ? String(u.rooms) : '') },
                  }))
                }
                onBlur={() => void actions.updateUnitMetrics(u)}
                type="number"
                step="0.01"
                min={0}
                placeholder="Surface m²"
              />
              <Input
                aria-label={`Nombre de pièces — ${u.label}`}
                value={unitDrafts[u.id]?.rooms ?? ''}
                onChange={(e) =>
                  setUnitDrafts((prev) => ({
                    ...prev,
                    [u.id]: { surfaceM2: prev[u.id]?.surfaceM2 ?? (u.surfaceM2 != null ? String(u.surfaceM2) : ''), rooms: e.target.value },
                  }))
                }
                onBlur={() => void actions.updateUnitMetrics(u)}
                type="number"
                min={0}
                step={1}
                placeholder="Pièces"
              />
            </div>
            <div className="flex justify-end">
              <UnitRowActions buildingId={b.id} unit={u} onRemove={(unitId) => void actions.removeUnit(unitId)} />
            </div>
          </li>
        );
      })}
    </CardList>
  );
}
