import { AppPageTitle, PageHeaderKpi } from '@/components/AppPageTitle';
import { PdfPrintButton } from '@/components/PdfPrintButton';
import { Button } from '@/components/ui/index';

type LocationsHeaderProps = {
  totalCount: number;
  showAll: boolean;
  onToggleShowAll: () => void;
};

/** Titre Locations, total, export PDF et filtre actives / inactives. */
export function LocationsHeader({ totalCount, showAll, onToggleShowAll }: LocationsHeaderProps) {
  return (
    <AppPageTitle
      iconTo="/locations"
      title="Locations"
      hintTitle="Pour chaque bail : localisation, locataire, loyer, statut du mois. Fiche = détail. Supprimer = supprime le bail et les paiements (pas le bien ni le locataire)."
      actions={
        <>
          <PageHeaderKpi label="Total" value={String(totalCount)} />
          <PdfPrintButton
            path={`/reports/table-locations.pdf${showAll ? '?all=1' : ''}`}
            title={
              showAll
                ? 'Liste des locations en PDF (actives et inactives)'
                : 'Liste des locations en PDF (baux actifs — comme le filtre ci-dessous)'
            }
          />
          <Button variant={showAll ? 'primary' : 'secondary'} className="py-2 text-xs" onClick={onToggleShowAll}>
            {showAll ? 'Actives seulement' : 'Voir aussi inactives'}
          </Button>
        </>
      }
    />
  );
}
