import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { OdooViewMode } from '@/components/OdooKit';
import type { BuildingStructureValue } from '@/lib/buildingStructure';
import { filterBuildingRows, normalizeGenreParam, type BuildingRow } from './buildingListUtils';

/** Filtre « genre » de bien, porté par l'URL (?genre=). */
export function useGenreFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const genreFilter = useMemo(() => normalizeGenreParam(searchParams.get('genre')), [searchParams]);

  function selectGenreFilter(next: BuildingStructureValue) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('kind');
        p.set('genre', next);
        return p;
      },
      { replace: true },
    );
  }

  function clearGenreFilter() {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('genre');
        p.delete('kind');
        return p;
      },
      { replace: true },
    );
  }

  return { genreFilter, selectGenreFilter, clearGenreFilter };
}

export type GenreFilter = ReturnType<typeof useGenreFilter>;

/** Recherche locale, mode d'affichage et dérivés (totaux, kanban, chemin PDF) de la liste des biens. */
export function useBuildingsFilters(rows: BuildingRow[], genre: GenreFilter) {
  const { genreFilter, selectGenreFilter, clearGenreFilter } = genre;
  const [listSearch, setListSearch] = useState('');
  const [viewMode, setViewMode] = useState<OdooViewMode>('list');

  const filteredRows = useMemo(() => filterBuildingRows(rows, listSearch), [rows, listSearch]);
  const totalUnits = useMemo(() => rows.reduce((s, b) => s + b._count.units, 0), [rows]);
  const totalUnitsFiltered = useMemo(
    () => filteredRows.reduce((s, b) => s + b._count.units, 0),
    [filteredRows],
  );

  const worksheetPdfPath = useMemo(() => {
    const q = new URLSearchParams();
    if (genreFilter) q.set('structureKind', genreFilter);
    const s = listSearch.trim();
    if (s) q.set('q', s);
    const qs = q.toString();
    return `/buildings/worksheet.pdf${qs ? `?${qs}` : ''}`;
  }, [genreFilter, listSearch]);

  const kanbanColumns = useMemo(() => {
    const groups: Record<BuildingStructureValue, BuildingRow[]> = {
      IMMEUBLE: [],
      TERRAIN_LOTS: [],
      MONO_LOT: [],
    };
    for (const row of filteredRows) {
      const kind = row.structureKind ?? 'MONO_LOT';
      groups[kind].push(row);
    }
    return groups;
  }, [filteredRows]);

  return {
    genreFilter,
    selectGenreFilter,
    clearGenreFilter,
    listSearch,
    setListSearch,
    viewMode,
    setViewMode,
    filteredRows,
    totalUnits,
    totalUnitsFiltered,
    worksheetPdfPath,
    kanbanColumns,
  };
}

export type BuildingsFilters = ReturnType<typeof useBuildingsFilters>;
