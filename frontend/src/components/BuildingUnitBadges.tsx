import type { ReactNode } from 'react';

function IconBuilding({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9v0M9 13v0M9 17v0M15 9v0M15 13v0M15 17v0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUnit({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 21V8l8-5 8 5v13M9 21v-4h6v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const buildingPill =
  'inline-flex items-center gap-1 rounded-md border border-sky-400/80 bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-950 shadow-sm dark:border-sky-500/70 dark:bg-sky-950/70 dark:text-sky-50';

const unitPill =
  'inline-flex items-center gap-1 rounded-md border border-amber-400/85 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-sm dark:border-amber-500/70 dark:bg-amber-950/60 dark:text-amber-50';

/** Pastille « Bien » (immeuble, terrain, patrimoine) — bleu / icône bâtiment */
export function BuildingScopeBadge({ className = '', title = 'Niveau bien : le patrimoine (immeuble, terrain, villa…)' }: { className?: string; title?: string }) {
  return (
    <span className={`${buildingPill} ${className}`} title={title}>
      <IconBuilding />
      Bien
    </span>
  );
}

/** Pastille « Unité » (lot, appartement, local) — ambre / icône porte */
export function UnitScopeBadge({ className = '', title = 'Niveau unité : un lot ou local précis' }: { className?: string; title?: string }) {
  return (
    <span className={`${unitPill} ${className}`} title={title}>
      <IconUnit />
      Unité
    </span>
  );
}

/**
 * Bloc lieu : une ligne « Bien » + nom, puis « Unité » + détail (utilisé dans tableaux Paiements, Locataires, etc.).
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
    <div className={`space-y-2 ${buildingClassName}`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <BuildingScopeBadge />
          <span className="font-semibold text-slate-900 dark:text-slate-100">{buildingName}</span>
        </div>
        {buildingSubline ? <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{buildingSubline}</p> : null}
      </div>
      <div className="flex flex-wrap items-start gap-2 border-l-2 border-amber-400/70 pl-2 dark:border-amber-500/60">
        <UnitScopeBadge className="shrink-0" />
        <span className={`text-sm font-medium text-slate-800 dark:text-slate-200 ${unitClassName}`}>
          {unitKindLabel} — {unitLabel}
        </span>
      </div>
    </div>
  );
}
