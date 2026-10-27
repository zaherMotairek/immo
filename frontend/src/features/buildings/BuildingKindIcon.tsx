import { cn } from '@/components/ui/index';
import type { BuildingStructureValue } from '@/lib/buildingStructure';

type BuildingKindIconProps = {
  structureKind?: BuildingStructureValue | string | null;
  /** `sm` = liste (36 px), `lg` = en-tête de fiche (56 px). */
  size?: 'sm' | 'lg';
  className?: string;
};

const wrapClass: Record<NonNullable<BuildingKindIconProps['size']>, string> = {
  sm: 'size-9 rounded-lg',
  lg: 'size-14 rounded-2xl',
};

const svgClass: Record<NonNullable<BuildingKindIconProps['size']>, string> = {
  sm: 'size-5',
  lg: 'size-8',
};

/** Pictogramme du genre de bien (immeuble, terrain en lots, un seul lot) — teinte de marque, forme distincte. */
export function BuildingKindIcon({ structureKind, size = 'sm', className }: BuildingKindIconProps) {
  const strokeWidth = size === 'lg' ? 1.7 : 1.8;
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center bg-brand-600/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
        wrapClass[size],
        className,
      )}
    >
      <svg className={svgClass[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden>
        {structureKind === 'IMMEUBLE' ? (
          <path d="M3 21h18M6 21V10l6-3.5L18 10v11M10 21v-5h4v5" strokeLinecap="round" strokeLinejoin="round" />
        ) : structureKind === 'TERRAIN_LOTS' ? (
          <>
            <path d="M4 20h16M6 20V10l4-6 4 4 4-4v16" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 14h2M12 12h2M16 14h2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </div>
  );
}
