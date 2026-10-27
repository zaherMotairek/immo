import { HelpHint } from '@/components/ui';
import { Card, Input, Tabs, cn } from '@/components/ui/index';
import { UNIT_KIND_OPTIONS } from '@/lib/unitKind';
import type { LeasesFilters as Filters } from './useLeasesFilters';
import type { StatusTab, WellViewFilter } from './types';

type LeasesFiltersProps = {
  f: Filters;
  stats: { active: number; inactive: number; total: number };
};

const eyebrow = 'text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]';
const hintClass = 'shrink-0 [&_button]:size-5 [&_button]:opacity-70';

/** Filtres repliables : statut du bail, nature du local et année cible pour la génération des échéances. */
export function LeasesFilters({ f, stats }: LeasesFiltersProps) {
  const open = f.leasesFiltersOpen;
  return (
    <Card id="filtres-baux" padding="none" className="scroll-mt-24 overflow-hidden">
      <button
        type="button"
        className="flex min-h-11 w-full items-center gap-2 border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-3 py-2 text-left transition-colors duration-[var(--duration-fast)] hover:bg-[var(--odoo-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600 sm:px-4"
        aria-expanded={open}
        aria-controls="leases-filters-panel"
        onClick={() => f.setLeasesFiltersOpen((o) => !o)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Filtres</span>
            {!open ? <span className="truncate text-xs text-[var(--color-muted)]">{f.filterSummaryShort}</span> : null}
          </div>
        </div>
        <span className="shrink-0 text-xs font-medium text-brand-700 dark:text-brand-300">{open ? 'Réduire' : 'Afficher'}</span>
        <svg
          className={cn('size-4 shrink-0 text-[var(--color-muted)] transition-transform', open && 'rotate-180')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        id="leases-filters-panel"
        className="grid gap-3 px-3 pb-3 pt-3 sm:px-4 lg:grid-cols-12 lg:items-start lg:gap-x-4 lg:gap-y-2"
        hidden={!open}
      >
        <fieldset className="border-0 p-0 lg:col-span-3">
          <legend className="sr-only">Filtrer par statut du bail</legend>
          <p className={cn('mb-1.5', eyebrow)}>Statut</p>
          <Tabs
            variant="chip"
            activeId={f.statusTab}
            onChange={(id) => f.setStatusTab(id as StatusTab)}
            ariaLabel="Statut du bail"
            tabs={[
              { id: 'active', label: 'Actifs', count: stats.active },
              { id: 'inactive', label: 'Inactifs', count: stats.inactive },
              { id: 'all', label: 'Tous', count: stats.total },
            ]}
          />
        </fieldset>

        <fieldset className="min-w-0 border-0 p-0 lg:col-span-6">
          <legend className="sr-only">Filtrer par nature du local</legend>
          <div className="mb-1.5 flex flex-wrap items-center gap-1">
            <p className={eyebrow}>Nature du local</p>
            <HelpHint
              className={hintClass}
              title="Chaque bail est relié à une unité déclarée sur la fiche Bien. Filtrez par type (appartement, maison, bureau…)."
            />
          </div>
          <Tabs
            variant="chip"
            activeId={f.wellViewFilter}
            onChange={(id) => f.setWellViewFilter(id as WellViewFilter)}
            ariaLabel="Nature du local"
            tabs={[
              { id: 'all', label: 'Tous types', count: f.wellViewCounts.all },
              ...UNIT_KIND_OPTIONS.map((o) => ({ id: o.value, label: o.label, count: f.wellViewCounts[o.value] ?? 0 })),
            ]}
          />
        </fieldset>

        <div className="flex flex-col gap-2 border-t border-[var(--odoo-border-subtle)] pt-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between lg:col-span-3 lg:border-t-0 lg:pt-0">
          <div className="min-w-0 sm:flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1">
              <label htmlFor="leases-gen-year" className={eyebrow}>
                Année des échéances
              </label>
              <HelpHint
                className={hintClass}
                title="Année cible pour le bouton « Générer les échéances » sur chaque ligne du tableau (création des lignes de loyer / paiements attendus)."
              />
            </div>
            <Input
              id="leases-gen-year"
              className="max-w-[7rem]"
              value={f.genYear}
              onChange={(e) => f.setGenYear(e.target.value)}
              inputMode="numeric"
              aria-label="Année pour la génération des échéances"
            />
          </div>
          <a
            href="#liste-des-baux"
            className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-3 text-xs font-medium text-[var(--color-ink)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--odoo-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            Liste
            <span aria-hidden className="text-[var(--color-muted)]">
              ↓
            </span>
          </a>
        </div>
      </div>
    </Card>
  );
}
