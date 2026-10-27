import type { ReactNode } from 'react';
import { cn } from './cn';

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

/** État vide : guide l'utilisateur (liste vide, première utilisation). */
export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-dashed border-[var(--odoo-border-strong)] bg-[var(--odoo-table-head-bg)] px-4 py-8 text-center sm:px-6',
        className,
      )}
    >
      {icon ? (
        <div
          aria-hidden
          className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border border-[var(--odoo-border)] bg-[var(--color-surface)] text-[var(--color-muted)] [&>svg]:size-6"
        >
          {icon}
        </div>
      ) : null}
      <h2 className="text-base font-semibold tracking-tight text-[var(--color-ink)]">{title}</h2>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-[var(--color-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
