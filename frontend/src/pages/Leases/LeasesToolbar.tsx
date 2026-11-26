import { Toolbar } from '@/components/ui/index';
import { pluralFr } from '@/lib/format';

type LeasesToolbarProps = {
  visibleCount: number;
  filterSummary: string;
};

/** Barre d'outils : rappel du nombre de baux visibles et des filtres actifs. */
export function LeasesToolbar({ visibleCount, filterSummary }: LeasesToolbarProps) {
  return (
    <Toolbar
      className="mb-0 hidden sm:flex"
      left={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
          <span className="font-semibold text-[var(--color-ink)]">Vue</span>
          <span>{pluralFr(visibleCount, 'bail', 'baux')}</span>
          <span>· {filterSummary}</span>
        </div>
      }
    />
  );
}
