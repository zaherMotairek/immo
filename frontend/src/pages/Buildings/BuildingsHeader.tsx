import { AppPageTitle, PageHeaderKpi } from '@/components/AppPageTitle';
import { Button } from '@/components/ui/index';

type BuildingsHeaderProps = {
  totalCount: number;
  onAddBuilding: () => void;
};

/** Titre de page « Biens immobiliers », total et bouton « Ajouter un bien ». */
export function BuildingsHeader({ totalCount, onAddBuilding }: BuildingsHeaderProps) {
  return (
    <AppPageTitle
      iconTo="/biens"
      title="Biens immobiliers"
      hintTitle="Immeuble collectif, villa, entrepôt, terrain… même principe : nom du site + localisation (Côte d’Ivoire). Supprimer un bien : bouton en bas de carte (supprime aussi unités, baux et loyers liés)."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <PageHeaderKpi label="Total" value={String(totalCount)} />
          <Button
            leftIcon={
              <span className="text-lg leading-none" aria-hidden>
                +
              </span>
            }
            onClick={onAddBuilding}
          >
            Ajouter un bien
          </Button>
        </div>
      }
    />
  );
}
