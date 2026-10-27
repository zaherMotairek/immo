import { AppPageTitle, PageHeaderKpi } from '@/components/AppPageTitle';
import { PdfPrintButton } from '@/components/PdfPrintButton';
import { SmartLink } from '@/components/SmartLink';
import { Button, Callout } from '@/components/ui/index';
import type { AppNavigateState } from '@/lib/navigation';
import type { LeaseFocusSummary } from './types';

type LeasesHeaderProps = {
  totalCount: number;
  /** Au moins un bail est chargé (permet de distinguer « supprimé » de « chargement »). */
  hasLeases: boolean;
  leaseIdFocus: string;
  leaseFocusSummary: LeaseFocusSummary | null;
  locationSheetState: AppNavigateState;
  onNewLease: () => void;
  onClearFocus: () => void;
};

const linkClass = 'font-semibold underline-offset-2 hover:underline';

/** Titre de page, total, export PDF, bouton « Nouveau bail » et bandeau « vue guidée » d'un bail. */
export function LeasesHeader({
  totalCount,
  hasLeases,
  leaseIdFocus,
  leaseFocusSummary,
  locationSheetState,
  onNewLease,
  onClearFocus,
}: LeasesHeaderProps) {
  return (
    <AppPageTitle
      iconTo="/baux"
      title="Baux & locations"
      hintTitle="À la création, la fin de bail est fixée à un an après la date de début (même jour). Les loyers commencent le mois suivant l’enregistrement du bail (ex. contrat en avril → 1ᵉʳ loyer en mai) ; l’échéance est ce jour dans le mois facturé. Génération jusqu’à la fin de contrat (sauf bail inactif). Le bouton « Générer les échéances » ajoute une autre année civile si besoin. Les filtres ne font que masquer des lignes à l’écran."
      subtitle={
        leaseIdFocus ? (
          <>
            <strong className="font-semibold text-[var(--color-ink)]">Vue guidée :</strong> un bail précis est mis en
            avant ci-dessous (groupe ouvert, ligne surlignée). Les autres baux restent visibles dans la liste.
          </>
        ) : (
          <>Gestion des contrats de location et génération des échéances de loyer.</>
        )
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <PageHeaderKpi label="Total" value={String(totalCount)} />
          <PdfPrintButton path="/reports/table-baux.pdf" title="Liste de tous les baux en PDF (aperçu comme le tableau)" />
          <Button
            leftIcon={
              <span className="text-lg leading-none" aria-hidden>
                +
              </span>
            }
            onClick={onNewLease}
          >
            Nouveau bail
          </Button>
        </div>
      }
    >
      {leaseIdFocus ? (
        <Callout variant="info" title="Baux & échéances — ce bail est sélectionné" className="max-w-2xl">
          {leaseFocusSummary && (leaseFocusSummary.tenant || leaseFocusSummary.place) ? (
            <p className="leading-snug">
              <span className="font-semibold">{leaseFocusSummary.tenant}</span>
              {leaseFocusSummary.place ? (
                <>
                  {' '}
                  · <span className="font-normal">{leaseFocusSummary.place}</span>
                </>
              ) : null}
            </p>
          ) : hasLeases ? (
            <p className="text-[var(--status-pending)]">
              Aucun bail avec cet identifiant dans la liste chargée — il a peut-être été supprimé. Vérifiez l’URL ou ouvrez
              la fiche location.
            </p>
          ) : (
            <p className="text-[var(--color-muted)]">Chargement du contexte…</p>
          )}
          <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <SmartLink
              to={`/locations/${leaseIdFocus}`}
              state={locationSheetState}
              returnFocusId={leaseIdFocus}
              className={`${linkClass} text-brand-800 dark:text-brand-300`}
            >
              ← Fiche location de ce bail
            </SmartLink>
            <button type="button" className={`${linkClass} text-[var(--color-ink)]`} onClick={onClearFocus}>
              Afficher la page sans sélection
            </button>
          </p>
        </Callout>
      ) : null}
    </AppPageTitle>
  );
}
