import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from './cn';

export type ListRowProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Information secondaire alignée à droite (ex. date, montant). */
  meta?: ReactNode;
  /** Élément final (badge, bouton). */
  trailing?: ReactNode;
  onClick?: () => void;
  /** Lien interne (React Router). Prioritaire sur `onClick`. */
  href?: string;
  className?: string;
};

const rowClass =
  'flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left sm:px-4';
const interactiveClass =
  'transition-colors duration-[var(--duration-fast)] hover:bg-[var(--odoo-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600';

function Chevron() {
  return (
    <svg
      aria-hidden
      className="size-4 shrink-0 text-[var(--color-muted)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/** Ligne de liste mobile. À placer dans un `CardList` (rend un `<li>`). */
export function ListRow({ title, subtitle, meta, trailing, onClick, href, className }: ListRowProps) {
  const interactive = Boolean(href || onClick);
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{title}</p>
        {subtitle ? <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">{subtitle}</p> : null}
      </div>
      {meta ? <div className="shrink-0 text-right text-sm tabular-nums text-[var(--color-ink)]">{meta}</div> : null}
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
      {interactive ? <Chevron /> : null}
    </>
  );

  return (
    <li className="list-none">
      {href ? (
        <Link to={href} className={cn(rowClass, interactiveClass, className)}>
          {content}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={cn(rowClass, interactiveClass, className)}>
          {content}
        </button>
      ) : (
        <div className={cn(rowClass, className)}>{content}</div>
      )}
    </li>
  );
}
