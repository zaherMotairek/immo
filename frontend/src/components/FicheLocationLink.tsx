import { SmartLink } from '@/components/SmartLink';
import { useLocation } from 'react-router-dom';

type Props = {
  leaseId: string;
  className?: string;
  title?: string;
  /** Id de ligne sur la liste d’origine (ex. locataire) si différent du bail. */
  returnFocusRowId?: string;
};

/** Lien texte sobre vers la fiche location (listes). */
export function FicheLocationLink({
  leaseId,
  className,
  title = 'Fiche du bail (location)',
  returnFocusRowId,
}: Props) {
  const loc = useLocation();
  return (
    <SmartLink
      to={`/locations/${leaseId}`}
      state={{ backgroundLocation: loc }}
      returnFocusId={returnFocusRowId ?? leaseId}
      className={['text-xs font-medium text-slate-700 underline-offset-2 hover:text-brand-700 hover:underline dark:text-slate-300 dark:hover:text-brand-300', className]
        .filter(Boolean)
        .join(' ')}
      title={title}
    >
      Fiche
    </SmartLink>
  );
}
