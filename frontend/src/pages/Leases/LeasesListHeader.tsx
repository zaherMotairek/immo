import { HelpHint } from '@/components/ui';
import { Input } from '@/components/ui/index';

type LeasesListHeaderProps = {
  shownCount: number;
  filteredCount: number;
  search: string;
  onSearchChange: (v: string) => void;
};

/** En-tête de la liste : titre, compteur, recherche textuelle et compteur de lignes. */
export function LeasesListHeader({ shownCount, filteredCount, search, onSearchChange }: LeasesListHeaderProps) {
  const searching = search.trim().length > 0;
  return (
    <div className="border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-ink)]">Liste des baux</h2>
            <HelpHint
              className="shrink-0 align-middle"
              title="Une ligne par bail (locataire en premier). Fiche location, génération des échéances (année dans les filtres), pièce jointe du contrat, activation."
            />
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {searching
              ? `${shownCount} sur ${filteredCount} affiché${shownCount !== 1 ? 's' : ''}`
              : `${shownCount} bail${shownCount !== 1 ? 'x' : ''}`}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          {filteredCount > 0 ? (
            <div className="relative w-full min-w-0 sm:w-72">
              <span
                className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[var(--color-muted)]"
                aria-hidden
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" strokeLinecap="round" />
                </svg>
              </span>
              <Input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher (locataire, bien, unité…)"
                className="!pl-10 pr-10"
                aria-label="Filtrer la liste des baux"
                autoComplete="off"
              />
              {searching ? (
                <button
                  type="button"
                  className="absolute right-1.5 top-1/2 z-[1] flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-muted)] transition-colors hover:bg-[var(--odoo-row-hover)] hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
                  onClick={() => onSearchChange('')}
                  aria-label="Effacer la recherche"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="hidden shrink-0 rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-4 py-2 text-center sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Lignes</p>
            <p className="text-xl font-bold tabular-nums text-[var(--color-ink)]">{shownCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
