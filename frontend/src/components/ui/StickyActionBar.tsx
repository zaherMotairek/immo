import type { ReactNode } from 'react';
import { cn } from './cn';

export type StickyActionBarProps = {
  children: ReactNode;
  className?: string;
};

/** Barre d'actions collée en bas de l'écran (formulaires longs) — respecte la safe-area iOS. */
export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-[var(--z-sticky)] -mx-3 flex flex-col-reverse gap-2 border-t border-[var(--odoo-border)] bg-[var(--color-surface)] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgb(28_25_23/0.05)] sm:mx-0 sm:flex-row sm:items-center sm:justify-end sm:rounded-b-[var(--radius-card)]',
        className,
      )}
    >
      {children}
    </div>
  );
}
