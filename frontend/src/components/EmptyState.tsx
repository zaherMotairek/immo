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
    <Card className={`border-dashed border-slate-300/90 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-900/40 ${className}`}>
      <div className="flex flex-col items-center gap-3 py-2 text-center sm:flex-row sm:items-start sm:text-left">
        {icon ? (
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-white text-slate-500 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
            aria-hidden
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          {description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
          ) : null}
          {action ? <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">{action}</div> : null}
        </div>
      </div>
    </Card>
  );
}
