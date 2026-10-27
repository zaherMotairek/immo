import type { ReactNode } from 'react';
import { cn } from './cn';

export type ToolbarProps = {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
};

/** Barre d'outils de liste : filtres à gauche, actions à droite (empilée sur mobile). */
export function Toolbar({ left, right, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        'mb-3 flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[var(--shadow-soft)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between dark:border-zinc-600 dark:bg-zinc-900',
        className,
      )}
    >
      {left ? <div className="min-w-0 sm:flex-1">{left}</div> : null}
      {right ? (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{right}</div>
      ) : null}
    </div>
  );
}
