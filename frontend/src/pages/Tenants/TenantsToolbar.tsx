import { OdooListToolbar, type OdooViewMode } from '@/components/OdooKit';
import { PdfPrintButton } from '@/components/PdfPrintButton';
import { Toolbar } from '@/components/ui/index';

type TenantsToolbarProps = {
  shownCount: number;
  totalCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  viewMode: OdooViewMode;
  onViewModeChange: (v: OdooViewMode) => void;
};

/** Barre d'outils : compteur, recherche, bascule liste / kanban et export PDF. */
export function TenantsToolbar({
  shownCount,
  totalCount,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: TenantsToolbarProps) {
  return (
    <Toolbar
      className="mb-0"
      left={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
          <span className="font-semibold text-[var(--color-ink)]">Liste</span>
          <span>
            {shownCount} / {totalCount} locataire(s) affiché(s)
          </span>
        </div>
      }
      right={
        totalCount > 0 ? (
          <OdooListToolbar
            search={search}
            onSearchChange={onSearchChange}
            searchPlaceholder="Rechercher (nom, bien, ville…)"
            searchAriaLabel="Filtrer la liste des locataires"
            showViewToggle
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            exports={
              <PdfPrintButton
                path="/reports/table-locataires.pdf"
                title="Liste de tous les locataires en PDF"
                variant="labeled"
              />
            }
          />
        ) : null
      }
    />
  );
}
