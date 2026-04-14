import type { ReactNode } from 'react';
import { SmartLink } from '@/components/SmartLink';
import { Card } from '@/components/ui';

export function ChevronLeftIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const backLinkClassName =
  'group inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-slate-50/95 px-2.5 py-1 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-brand-200 hover:bg-brand-50/80 hover:text-brand-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:ring-white/10 dark:hover:border-brand-500 dark:hover:bg-slate-700 dark:hover:text-white';

type PageDetailHeroProps = {
  backHref: string;
  backLabel: string;
  breadcrumbCurrent: string;
  breadcrumbTitle?: string;
  headerEnd?: ReactNode;
  children: ReactNode;
};

/** En-tête détail : fil d’Ariane + zone titre (même pattern que la fiche bien). */
export function PageDetailHero({
  backHref,
  backLabel,
  breadcrumbCurrent,
  breadcrumbTitle,
  headerEnd,
  children,
}: PageDetailHeroProps) {
  return (
    <Card className="overflow-hidden p-0 sm:p-0">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <nav aria-label="Fil d'Ariane" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <li className="shrink-0">
              <SmartLink to={backHref} className={backLinkClassName}>
                <ChevronLeftIcon className="size-4 shrink-0 text-slate-400 transition group-hover:text-brand-600" />
                {backLabel}
              </SmartLink>
            </li>
            <li className="shrink-0 text-slate-300 dark:text-slate-600" aria-hidden>
              /
            </li>
            <li
              className="min-w-0 truncate font-semibold text-slate-950 dark:text-slate-50"
              title={breadcrumbTitle ?? breadcrumbCurrent}
            >
              {breadcrumbCurrent}
            </li>
          </ol>
        </nav>
        {headerEnd ? <div className="shrink-0 sm:ml-2">{headerEnd}</div> : null}
      </div>
      <div className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </Card>
  );
}

export function PageDetailBackLink({
  to,
  children,
  className = '',
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <SmartLink
      to={to}
      className={`group mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200/90 bg-slate-50/95 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-brand-200 hover:bg-brand-50/80 hover:text-brand-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:ring-white/10 dark:hover:border-brand-500 dark:hover:bg-slate-700 dark:hover:text-white ${className}`}
    >
      <ChevronLeftIcon className="size-4 shrink-0 text-slate-400 transition group-hover:text-brand-600" />
      {children}
    </SmartLink>
  );
}
