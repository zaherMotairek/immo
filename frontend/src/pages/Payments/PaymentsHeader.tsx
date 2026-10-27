import { AppPageTitle, PageHeaderKpi } from '@/components/AppPageTitle';
import { PdfPrintButton } from '@/components/PdfPrintButton';
import { SmartLink } from '@/components/SmartLink';
import { Callout } from '@/components/ui/index';
import type { AppNavigateState } from '@/lib/navigation';
import type { LeaseFocusSummary } from './types';

type PaymentsHeaderProps = {
  totalCount: number;
  worksheetPdfPath: string;
  focusPaymentId: string | null;
  onClearFocus: () => void;
  leaseIdFilter: string;
  leaseFocusSummary: LeaseFocusSummary | null;
  onClearLease: () => void;
  locationSheetState: AppNavigateState;
};

const linkClass = 'font-semibold underline-offset-2 hover:underline';

/** Titre de page, total, export PDF, bandeau « ce bail uniquement » et lien de fin de surbrillance. */
export function PaymentsHeader({
  totalCount,
  worksheetPdfPath,
  focusPaymentId,
  onClearFocus,
  leaseIdFilter,
  leaseFocusSummary,
  onClearLease,
  locationSheetState,
}: PaymentsHeaderProps) {
  return (
    <>
      {focusPaymentId ? (
        <p className="-mt-2 text-xs text-[var(--color-muted)]">
          <button
            type="button"
            className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
            onClick={onClearFocus}
          >
            Fermer la surbrillance (lien direct)
          </button>
        </p>
      ) : null}
      <AppPageTitle
        iconTo="/paiements"
        title="Paiements"
        hintTitle="Double-cliquez une ligne pour le détail (bien, mode d’encaissement, fiche bail, actions). La liste ne montre que l’essentiel."
        subtitle={
          leaseIdFilter ? (
            <>
              <strong className="font-semibold text-[var(--color-ink)]">Ce bail uniquement</strong> — échéances
              filtrées. La caution se gère sur la fiche location.
            </>
          ) : (
            <>Échéances mensuelles, encaissements et relances.</>
          )
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PageHeaderKpi label="Total" value={String(totalCount)} />
            <PdfPrintButton
              path={worksheetPdfPath}
              title="Feuille de route PDF (mêmes filtres que la liste) : cases perçu, notes, puis saisie dans l’app"
            />
          </div>
        }
      >
        {leaseIdFilter ? (
          <Callout variant="info" title="Paiements / échéances — ce bail seulement" className="max-w-2xl">
            {leaseFocusSummary && (leaseFocusSummary.tenant || leaseFocusSummary.place) ? (
              <p className="leading-snug">
                <span className="font-semibold">{leaseFocusSummary.tenant || 'Locataire'}</span>
                {leaseFocusSummary.place ? (
                  <>
                    {' '}
                    · <span className="font-normal">{leaseFocusSummary.place}</span>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="text-[var(--color-muted)]">
                Les lignes listées correspondent uniquement à ce bail (identifiant interne). Si la liste est vide, elles ne
                sont peut-être pas encore générées pour la période choisie.
              </p>
            )}
            <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <SmartLink
                to={`/locations/${leaseIdFilter}`}
                state={locationSheetState}
                className={`${linkClass} text-brand-800 dark:text-brand-300`}
              >
                ← Fiche location de ce bail
              </SmartLink>
              <button type="button" className={`${linkClass} text-[var(--color-ink)]`} onClick={onClearLease}>
                Afficher tous les baux
              </button>
            </p>
          </Callout>
        ) : null}
      </AppPageTitle>
    </>
  );
}
