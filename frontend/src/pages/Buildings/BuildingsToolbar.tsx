import { OdooListToolbar } from '@/components/OdooKit';
import { PdfPrintButton } from '@/components/PdfPrintButton';
import { HelpHint } from '@/components/ui';
import { SegmentedControl, Toolbar } from '@/components/ui/index';
import { BUILDING_STRUCTURE_OPTIONS, type BuildingStructureValue } from '@/lib/buildingStructure';
import type { BuildingsFilters } from './useBuildingsFilters';

const ALL_GENRES = 'ALL';

const GENRE_OPTIONS = [
  { id: ALL_GENRES, label: 'Tous les biens' },
  ...BUILDING_STRUCTURE_OPTIONS.map((o) => ({ id: o.value as string, label: o.cardTitle })),
];

type BuildingsToolbarProps = {
  filters: BuildingsFilters;
  totalCount: number;
};

/** Barre d'outils : compteurs, recherche, bascule liste / kanban, exports PDF, et filtre par genre de bien. */
export function BuildingsToolbar({ filters, totalCount }: BuildingsToolbarProps) {
  const { genreFilter, filteredRows, totalUnitsFiltered, listSearch, setListSearch, viewMode, setViewMode } = filters;

  const filterHint = genreFilter
    ? 'Filtre par genre de bien (structure) : immeuble multi locataires, terrain avec plusieurs locataires ou un seul lot — comme dans « Nouveau bien ».'
    : '« Tous les biens » : aucun filtre. Choisissez un genre pour restreindre la liste.';

  return (
    <div className="space-y-3">
      <Toolbar
        className="mb-0"
        left={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
            <span className="font-semibold text-[var(--color-ink)]">Affichage</span>
            <span>{filteredRows.length} bien(s)</span>
            <span>· {totalUnitsFiltered} unité(s)</span>
            {genreFilter ? (
              <span className="font-semibold text-brand-700 dark:text-brand-300">Filtre genre actif</span>
            ) : null}
          </div>
        }
        right={
          totalCount > 0 ? (
            <OdooListToolbar
              search={listSearch}
              onSearchChange={setListSearch}
              searchPlaceholder="Rechercher (nom, ville, commune…)"
              searchAriaLabel="Filtrer les biens"
              showViewToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              exports={
                <>
                  <PdfPrintButton
                    path={filters.worksheetPdfPath}
                    title="Feuille de route PDF (filtres actifs)"
                    variant="labeled"
                  />
                  <PdfPrintButton path="/reports/table-biens.pdf" title="Tableau PDF complet" variant="icon" />
                </>
              }
            />
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Afficher</p>
          <HelpHint className="align-middle" title={filterHint} />
        </div>
        <div className="max-w-full overflow-x-auto">
          <SegmentedControl
            ariaLabel="Filtrer par genre de bien"
            options={GENRE_OPTIONS}
            value={genreFilter ?? ALL_GENRES}
            onChange={(id) => {
              if (id === ALL_GENRES) filters.clearGenreFilter();
              else filters.selectGenreFilter(id as BuildingStructureValue);
            }}
          />
        </div>
      </div>
    </div>
  );
}
