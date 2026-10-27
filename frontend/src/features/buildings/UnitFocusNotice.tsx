import { SmartLink } from '@/components/SmartLink';
import { Callout } from '@/components/ui/index';

type UnitFocusNoticeProps = {
  focusUnitId: string;
  unitFocusTitle: string;
  returnLocation: string;
  onClear: () => void;
};

/** Encart « unité mise en avant » (arrivée depuis une fiche location via `?unitId=`). */
export function UnitFocusNotice({ focusUnitId, unitFocusTitle, returnLocation, onClear }: UnitFocusNoticeProps) {
  return (
    <Callout variant="info" title="Unité précise mise en avant">
      <p className="leading-snug">
        Cette fiche bien affiche <strong className="font-semibold">toutes les unités</strong> ; la liste ci-dessous a été
        défilée vers{' '}
        <strong className="font-semibold">{unitFocusTitle || `l’unité (${focusUnitId.slice(0, 8)}…)`}</strong>.
      </p>
      <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
        {returnLocation.startsWith('/locations/') ? (
          <SmartLink
            to={returnLocation}
            className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
          >
            ← Retour à la fiche location
          </SmartLink>
        ) : null}
        <button
          type="button"
          className="font-semibold text-[var(--color-ink)] underline-offset-2 hover:underline"
          onClick={onClear}
        >
          Afficher la fiche bien sans mise au point
        </button>
      </p>
    </Callout>
  );
}
