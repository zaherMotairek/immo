import { cn } from './cn';

export type SegmentedOption = { id: string; label: string; disabled?: boolean };

export type SegmentedControlProps = {
  options: SegmentedOption[];
  value: string;
  onChange: (id: string) => void;
  /** Nom accessible du groupe (français). */
  ariaLabel?: string;
  className?: string;
};

/** Sélecteur segmenté (2–4 choix exclusifs). Même rendu que `OdooViewToggle`. */
export function SegmentedControl({ options, value, onChange, ariaLabel, className }: SegmentedControlProps) {
  return (
    <div className={cn('odoo-segmented', className)} role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            disabled={o.disabled}
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            className={cn(
              'odoo-segmented__btn min-h-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50',
              active && 'odoo-segmented__btn--active',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
