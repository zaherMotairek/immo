import type { ReactNode } from 'react';

function IconBuilding({ className = 'size-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9v0M9 13v0M9 17v0M15 9v0M15 13v0M15 17v0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUnit({ className = 'size-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 21V8l8-5 8 5v13M9 21v-4h6v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Pastille discrète « Bien » (sans fond coloré). */
export function BuildingScopeBadge({
  className = '',
  title = 'Niveau bien : le patrimoine (immeuble, terrain, villa…)',
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)] ${className}`}
      title={title}
    >
      <IconBuilding className="size-3 opacity-70" />
      Bien
    </span>
  );
}

/** Pastille discrète « Unité » (sans fond coloré). */
export function UnitScopeBadge({
  className = '',
  title = 'Niveau unité : un lot ou local précis',
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)] ${className}`}
      title={title}
    >
      <IconUnit className="size-3 opacity-70" />
      Unité
    </span>
  );
}

/**
 * Bloc lieu compact : nom du bien + unité en texte simple (listes).
 */
export function BuildingUnitStack({
  buildingName,
  buildingSubline,
  unitKindLabel,
  unitLabel,
  buildingClassName = '',
  unitClassName = '',
}: {
  buildingName: ReactNode;
  buildingSubline?: ReactNode;
  unitKindLabel: string;
  unitLabel: string;
  buildingClassName?: string;
  unitClassName?: string;
}) {
  return (
    <div className={`min-w-0 space-y-0.5 ${buildingClassName}`}>
      <div className="truncate text-sm font-medium text-[var(--color-ink)]">{buildingName}</div>
      {buildingSubline ? (
        <p className="truncate text-[11px] text-[var(--color-muted)]">{buildingSubline}</p>
      ) : null}
      <p className={`truncate text-[12px] text-[var(--color-ink)] ${unitClassName}`}>
        {unitKindLabel} · {unitLabel}
      </p>
    </div>
  );
}
