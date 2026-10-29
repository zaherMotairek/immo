import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';
import { toggleTableSortColumn, type TableSortDir } from '@/lib/tableSort';
import { unitKindLabel } from '@/lib/unitKind';
import { compareUnitTableRows, floorLabel, unitIsOccupied } from './buildingUtils';
import type { Building, UnitDraft, UnitListFilter, UnitTableSortKey } from './types';

type Options = {
  id: string | undefined;
  b: Building | null;
  focusUnitId: string;
  hintUnitLabel: string;
  setParams: SetURLSearchParams;
  setBuildingTab: (id: string) => void;
};

/** Onglet « Unités » : filtre libres / louées, recherche, tri, brouillons surface / pièces et mise en avant d'une unité (`?unitId=`). */
export function useUnitsList({ id, b, focusUnitId, hintUnitLabel, setParams, setBuildingTab }: Options) {
  const [unitListFilter, setUnitListFilter] = useState<UnitListFilter>('all');
  const [unitListSearch, setUnitListSearch] = useState('');
  const [unitSortKey, setUnitSortKey] = useState<UnitTableSortKey>('floor');
  const [unitSortDir, setUnitSortDir] = useState<TableSortDir>('asc');
  const [unitDrafts, setUnitDrafts] = useState<Record<string, UnitDraft>>({});

  const sortedUnits = useMemo(() => {
    if (!b?.units?.length) return [];
    return [...b.units].sort((a, c) => {
      const fa = a.floor ?? 10_000;
      const fc = c.floor ?? 10_000;
      if (fa !== fc) return fa - fc;
      const sa = (a.apartmentSlot ?? a.locauxSlot) ?? 10_000;
      const sc = (c.apartmentSlot ?? c.locauxSlot) ?? 10_000;
      if (sa !== sc) return sa - sc;
      return a.label.localeCompare(c.label, 'fr', { numeric: true, sensitivity: 'base' });
    });
  }, [b?.units]);

  const filteredUnits = useMemo(() => {
    if (unitListFilter === 'vacant') return sortedUnits.filter((u) => !unitIsOccupied(u));
    if (unitListFilter === 'occupied') return sortedUnits.filter((u) => unitIsOccupied(u));
    return sortedUnits;
  }, [sortedUnits, unitListFilter]);

  const tableUnits = useMemo(() => {
    const q = unitListSearch.trim().toLowerCase();
    if (!q) return filteredUnits;
    return filteredUnits.filter((u) => {
      const lease0 = u.leases?.[0];
      const tenant = lease0?.tenant;
      const tenantLine = tenant ? `${tenant.firstName} ${tenant.lastName}`.toLowerCase() : '';
      const hay = [
        u.label,
        u.apartmentSlot != null
          ? String(u.apartmentSlot)
          : u.locauxSlot != null
            ? String(u.locauxSlot)
            : '',
        unitKindLabel(u.kind),
        u.description ?? '',
        tenantLine,
        floorLabel(u.floor) ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [filteredUnits, unitListSearch]);

  useEffect(() => {
    if (!b?.units?.length) {
      setUnitDrafts({});
      return;
    }
    setUnitDrafts((prev) => {
      const next: Record<string, UnitDraft> = {};
      for (const u of b.units) {
        next[u.id] = prev[u.id] ?? {
          label: u.label,
          surfaceM2: u.surfaceM2 != null ? String(u.surfaceM2) : '',
          rooms: u.rooms != null ? String(u.rooms) : '',
        };
      }
      return next;
    });
  }, [b?.units]);

  const displayUnits = useMemo(() => {
    const copy = [...tableUnits];
    copy.sort((a, c) => compareUnitTableRows(a, c, unitSortKey, unitSortDir));
    return copy;
  }, [tableUnits, unitSortKey, unitSortDir]);

  function toggleUnitSort(key: UnitTableSortKey) {
    const n = toggleTableSortColumn(unitSortKey, unitSortDir, key);
    setUnitSortKey(n.key);
    setUnitSortDir(n.dir);
  }

  const unitFocusTitle = useMemo(() => {
    if (!focusUnitId || !b?.units?.length) return hintUnitLabel || '';
    const u = b.units.find((x) => x.id === focusUnitId);
    return u?.label ?? hintUnitLabel ?? focusUnitId;
  }, [b?.units, focusUnitId, hintUnitLabel]);

  function clearUnitFocus() {
    setParams(
      (prev) => {
        const q = new URLSearchParams(prev);
        q.delete('unitId');
        q.delete('hintUnitLabel');
        q.delete('returnLocation');
        return q;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    if (!focusUnitId) return;
    setBuildingTab('unites');
    setUnitListFilter('all');
    setUnitListSearch('');
  }, [focusUnitId, setBuildingTab]);

  useLayoutEffect(() => {
    if (!id || !focusUnitId || !b?.units?.length || b.id !== id) return;
    const unit = b.units.find((u) => u.id === focusUnitId);
    if (!unit) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(`unit-row-${focusUnitId}`);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('ring-2', 'ring-brand-500', 'ring-offset-2', 'rounded-2xl', 'dark:ring-offset-slate-900');
      window.setTimeout(
        () =>
          el.classList.remove(
            'ring-2',
            'ring-brand-500',
            'ring-offset-2',
            'rounded-2xl',
            'dark:ring-offset-slate-900',
          ),
        2600,
      );
    }, 200);
    return () => clearTimeout(t);
  }, [id, b?.id, b?.units, focusUnitId, filteredUnits, tableUnits]);

  return {
    unitListFilter,
    setUnitListFilter,
    unitListSearch,
    setUnitListSearch,
    unitSortKey,
    unitSortDir,
    toggleUnitSort,
    unitDrafts,
    setUnitDrafts,
    filteredUnits,
    tableUnits,
    displayUnits,
    unitFocusTitle,
    clearUnitFocus,
  };
}

export type UnitsList = ReturnType<typeof useUnitsList>;
