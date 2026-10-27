import { cn } from './cn';

export type SkeletonProps = {
  className?: string;
  /** Nombre de lignes de texte simulées (dernière ligne plus courte). Absent = un seul bloc. */
  lines?: number;
  /** Texte lu par les lecteurs d'écran. */
  label?: string;
};

const barClass = 'animate-pulse rounded-[var(--radius-control)] bg-[var(--odoo-border-subtle)] motion-reduce:animate-none';

/** Placeholder de chargement. */
export function Skeleton({ className, lines, label = 'Chargement…' }: SkeletonProps) {
  if (!lines || lines < 1) {
    return <div aria-hidden className={cn('h-4 w-full', barClass, className)} />;
  }
  return (
    <div role="status" className={cn('grid gap-2', className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} aria-hidden className={cn('h-4', barClass, i === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full')} />
      ))}
    </div>
  );
}
