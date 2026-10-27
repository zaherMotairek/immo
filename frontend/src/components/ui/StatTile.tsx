import type { ReactNode } from 'react';
import { cn } from './cn';

export type StatTileProps = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Met en avant (ex. unités encore à créer par rapport au total déclaré). */
  emphasize?: boolean;
  className?: string;
};

/** Bloc indicateur (KPI) — chiffres tabulaires, valeur en vedette. */
export function StatTile({ label, value, sub, emphasize, className }: StatTileProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border px-3 py-2.5',
        emphasize
          ? 'border-[var(--status-pending)] bg-[var(--status-pending-bg)]'
          : 'border-[var(--odoo-border)] bg-[var(--color-surface)] dark:border-zinc-600 dark:bg-zinc-800/50',
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-lg font-semibold tabular-nums sm:text-xl',
          emphasize ? 'text-[var(--status-pending)]' : 'text-[var(--color-ink)]',
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-[var(--color-muted)]">{sub}</p> : null}
    </div>
  );
}
