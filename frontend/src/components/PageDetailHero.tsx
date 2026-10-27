import type { ReactNode } from 'react';
import { SmartLink } from '@/components/SmartLink';
import { Card } from '@/components/ui/index';

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

const backLinkBase =
  'group inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-ink)] transition-colors duration-[var(--duration-fast)] hover:border-brand-300 hover:bg-brand-50/80 hover:text-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-zinc-600 dark:hover:border-brand-500 dark:hover:bg-zinc-800 dark:hover:text-white';

const backLinkClassName = `${backLinkBase} px-2.5 py-1`;

type PageDetailHeroProps = {
  backHref: string;
  backLabel: string;
  breadcrumbCurrent: string;
  breadcrumbTitle?: string;
  headerEnd?: ReactNode;
  children: ReactNode;
  /** Panneau latéral : masque le fil d’Ariane (le bandeau Fermer est dans la coquille). */
  omitTopNav?: boolean;
};

/** En-tête détail : fil d’Ariane + zone titre (même pattern que la fiche bien). */
export function PageDetailHero({
  backHref,
  backLabel,
  breadcrumbCurrent,
  breadcrumbTitle,
  headerEnd,
  children,
  omitTopNav = false,
}: PageDetailHeroProps) {
  return (
    <Card padding="none" className="overflow-hidden">
      {!omitTopNav ? (
        <div className="flex flex-col gap-3 border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <nav aria-label="Fil d'Ariane" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--color-ink)]">
              <li className="shrink-0">
                <SmartLink to={backHref} className={backLinkClassName}>
                  <ChevronLeftIcon className="size-4 shrink-0 text-[var(--color-muted)] transition group-hover:text-brand-600" />
                  {backLabel}
                </SmartLink>
              </li>
              <li className="shrink-0 text-[var(--odoo-border-strong)]" aria-hidden>
                /
              </li>
              <li
                className="min-w-0 truncate font-semibold text-[var(--color-ink)]"
                title={breadcrumbTitle ?? breadcrumbCurrent}
              >
                {breadcrumbCurrent}
              </li>
            </ol>
          </nav>
          {headerEnd ? <div className="shrink-0 sm:ml-2">{headerEnd}</div> : null}
        </div>
      ) : headerEnd ? (
        <div className="flex justify-end border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 py-3 sm:px-5">
          {headerEnd}
        </div>
      ) : null}
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
    <SmartLink to={to} className={`mt-4 w-fit px-3 py-1.5 ${backLinkBase} ${className}`}>
      <ChevronLeftIcon className="size-4 shrink-0 text-[var(--color-muted)] transition group-hover:text-brand-600" />
      {children}
    </SmartLink>
  );
}
