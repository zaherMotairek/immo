import { PdfPrintButton } from '@/components/PdfPrintButton';
import { Button } from '@/components/ui/index';

type BuildingHeroActionsProps = {
  buildingId: string;
  canAutoGenerateUnits: boolean;
  autoGenBusy: boolean;
  onAddUnit: () => void;
  onAutoGenerate: () => void;
  onDeleteBuilding: () => void;
};

/** Actions de l'en-tête de fiche : fiche PDF, ajouter une unité, générer les unités, supprimer le bien. */
export function BuildingHeroActions({
  buildingId,
  canAutoGenerateUnits,
  autoGenBusy,
  onAddUnit,
  onAutoGenerate,
  onDeleteBuilding,
}: BuildingHeroActionsProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      <PdfPrintButton
        path={`/buildings/${encodeURIComponent(buildingId)}/fiche.pdf`}
        title="Ouvrir la fiche PDF complète de ce bien (lieu, structure, unités, locataires, loyers)"
        className="sm:self-auto"
      />
      <Button
        variant="secondary"
        className="sm:self-auto"
        onClick={onAddUnit}
        leftIcon={
          <span className="text-base leading-none" aria-hidden>
            +
          </span>
        }
      >
        Ajouter une unité
      </Button>
      {canAutoGenerateUnits ? (
        <Button
          variant="secondary"
          className="sm:self-auto"
          disabled={autoGenBusy}
          onClick={onAutoGenerate}
          title="Créer automatiquement les unités manquantes selon l’organisation du bien"
        >
          {autoGenBusy ? 'Génération…' : 'Générer unités auto'}
        </Button>
      ) : null}
      <Button variant="danger" className="sm:self-auto" onClick={onDeleteBuilding}>
        Supprimer le bien
      </Button>
    </div>
  );
}
