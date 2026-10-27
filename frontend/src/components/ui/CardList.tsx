import type { ReactNode } from 'react';
import { cn } from './cn';

export type CardListProps = {
  /** Des `ListRow`. */
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
};

/** Conteneur de `ListRow` : carte avec séparateurs fins (vue mobile des tableaux). */
export function CardList({ children, ariaLabel, className }: CardListProps) {
  return (
    <ul
      aria-label={ariaLabel}
      className={cn(
        'm-0 divide-y divide-[var(--odoo-border)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] p-0',
        className,
      )}
    >
      {children}
    </ul>
  );
}
