import { SmartLink } from '@/components/SmartLink';

const pillClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-brand-200/90 bg-brand-50/90 px-2.5 py-1.5 text-xs font-semibold text-brand-800 shadow-sm transition hover:bg-brand-100 dark:border-brand-600/40 dark:bg-brand-950/40 dark:text-brand-200 dark:hover:bg-brand-900/50';

type Props = {
  leaseId: string;
  className?: string;
  title?: string;
  /** Id de ligne sur la liste d’origine (ex. locataire) si différent du bail. */
  returnFocusRowId?: string;
};

export function FicheLocationLink({ leaseId, className, title = 'Fiche du bail (location)', returnFocusRowId }: Props) {
  return (
    <SmartLink
      to={`/locations/${leaseId}`}
      returnFocusId={returnFocusRowId ?? leaseId}
      className={[pillClass, className].filter(Boolean).join(' ')}
      title={title}
    >
      <svg className="size-3.5 shrink-0 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Fiche location
    </SmartLink>
  );
}
