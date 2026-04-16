import { openPrintablePdf } from '@/lib/api';

type PdfPrintButtonProps = {
  path: string;
  title?: string;
  className?: string;
  /** `labeled` : bouton rouge « PDF » (bien visible). `icon` : icône seule. */
  variant?: 'icon' | 'labeled';
};

export function PdfPrintButton({
  path,
  title = 'Ouvrir en PDF',
  className = '',
  variant = 'labeled',
}: PdfPrintButtonProps) {
  const icon = variant === 'icon';
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={() => openPrintablePdf(path)}
      className={
        icon
          ? `inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-300/90 bg-white text-slate-600 shadow-sm transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:bg-slate-700 ${className}`
          : `inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-400/90 bg-red-50 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-red-800 shadow-sm transition hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-red-500/45 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-950/60 ${className}`
      }
    >
      <svg
        className={icon ? 'size-5' : 'size-[1.05rem] shrink-0'}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden
      >
        <path
          d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 13h8M8 17h8" strokeLinecap="round" />
        <path d="M8 9h2" strokeLinecap="round" />
      </svg>
      {icon ? null : <span className="select-none">PDF</span>}
    </button>
  );
}
