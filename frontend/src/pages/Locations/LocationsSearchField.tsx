import { Input } from '@/components/ui/index';

type LocationsSearchFieldProps = {
  id: string;
  value: string;
  onChange: (next: string) => void;
  wrapperClassName?: string;
};

/** Barre de recherche de la liste principale des locations. */
export function LocationsSearchField({
  id,
  value,
  onChange,
  wrapperClassName = '',
}: LocationsSearchFieldProps) {
  const hasQuery = Boolean(value.trim());

  return (
    <div className={`relative ${wrapperClassName}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[var(--color-muted)]" aria-hidden>
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
      </span>
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Locataire, bien, unité, ville, statut…"
        className="w-full py-2.5 !pl-11 pr-10 text-sm"
        aria-label="Filtrer la liste des locations"
        autoComplete="off"
      />
      {/* Espace fixe à droite : le bouton reste dans le flux visuel (invisible si vide) pour éviter tout saut de mise en page */}
      <button
        type="button"
        className={`absolute right-1.5 top-1/2 z-[1] flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-muted)] transition-opacity hover:bg-[var(--odoo-table-head-bg)] hover:text-[var(--color-ink)] ${
          hasQuery ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => onChange('')}
        aria-label="Effacer la recherche"
        tabIndex={hasQuery ? 0 : -1}
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
