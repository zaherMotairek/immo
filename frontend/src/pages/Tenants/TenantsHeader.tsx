import { AppPageTitle, PageHeaderKpi } from '@/components/AppPageTitle';
import { Button } from '@/components/ui/index';

type TenantsHeaderProps = {
  totalCount: number;
  /** Id de la fiche ouverte par lien direct (`?edit=`), sinon `null`. */
  editParam: string | null;
  onAddTenant: () => void;
  onCloseEdit: () => void;
};

/** Titre de page, total, bouton « Ajouter un locataire » et lien de fermeture de la fiche ouverte. */
export function TenantsHeader({ totalCount, editParam, onAddTenant, onCloseEdit }: TenantsHeaderProps) {
  return (
    <>
      {editParam ? (
        <p className="-mt-2 text-xs text-[var(--color-muted)]">
          <button
            type="button"
            className="font-medium text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
            onClick={onCloseEdit}
          >
            Fermer la fiche ouverte (lien direct)
          </button>
        </p>
      ) : null}
      <AppPageTitle
        iconTo="/locataires"
        title="Locataires"
        hintTitle="Création et modification des coordonnées. Les baux lient un locataire à une unité depuis la page Baux."
        subtitle="Coordonnées, pièces d’identité et occupation actuelle."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PageHeaderKpi label="Total" value={String(totalCount)} />
            <Button
              leftIcon={
                <span className="text-lg leading-none" aria-hidden>
                  +
                </span>
              }
              onClick={onAddTenant}
            >
              Ajouter un locataire
            </Button>
          </div>
        }
      />
    </>
  );
}
