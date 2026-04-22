import type { ReactNode } from 'react';
import { Card } from '@/components/ui';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Bloc vide standardisé pour guider l’utilisateur (liste vide, première utilisation). */
export function EmptyState({ title, description, icon, action, className = '' }: EmptyStateProps) {
  return (
    <Card
      className={`border-dashed border-slate-300/80 bg-slate-50/65 dark:border-slate-600/85 dark:bg-slate-900/45 ${className}`}
    >
      <div className="flex flex-col items-center gap-4 py-1 text-center sm:flex-row sm:items-start sm:gap-5 sm:text-left">
        {icon ? (
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-card)] border border-slate-200/90 bg-white text-slate-500 shadow-[0_1px_2px_rgb(15_23_42/0.05)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
            aria-hidden
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
          ) : null}
          {action ? <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">{action}</div> : null}
        </div>
      </div>
    </Card>
  );
}
