import { forwardRef } from 'react';
import type {
  ButtonHTMLAttributes,
  ChangeEvent,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react';
import { formatAmountDigitsGrouped } from '@/lib/format';

export function Card({
  children,
  className = '',
  ...rest
}: { children: ReactNode; className?: string } & Omit<HTMLAttributes<HTMLDivElement>, 'className'>) {
  return (
    <div
      {...rest}
      className={`odoo-sheet p-3 text-[var(--color-ink)] sm:p-5 dark:text-zinc-100 ${className}`}
    >
      {children}
    </div>
  );
}

/** Bloc indicateur (KPI) — même gabarit partout (fiches bien, titres de page, etc.). */
export function StatTile({
  label,
  value,
  sub,
  emphasize,
  className = '',
}: {
  label: string;
  value: string;
  sub?: string;
  /** Met en avant (ex. unités encore à créer par rapport au total déclaré). */
  emphasize?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border px-3 py-2.5 ${
        emphasize
          ? 'border-amber-400/85 bg-amber-50/95 dark:border-amber-600/55 dark:bg-amber-950/35'
          : 'border-[var(--odoo-border)] bg-[var(--color-surface)] dark:border-zinc-600 dark:bg-zinc-800/50'
      } ${className}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          emphasize ? 'text-amber-950 dark:text-amber-100' : 'text-slate-900 dark:text-slate-50'
        }`}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{sub}</p> : null}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'primarySoft' | 'secondary' | 'ghost' | 'danger';
}) {
  const base =
    'inline-flex min-h-9 items-center justify-center gap-2 rounded-[var(--radius-input)] px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 sm:min-h-10 sm:px-4 sm:py-2.5';
  const styles = {
    primary:
      'odoo-btn-primary focus-visible:outline-brand-600',
    primarySoft:
      'border border-brand-600/35 bg-brand-50 text-brand-800 hover:bg-brand-100 dark:border-brand-500/45 dark:bg-brand-950/40 dark:text-brand-100',
    secondary:
      'odoo-btn-secondary dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
    ghost: 'text-[var(--color-ink)] hover:bg-[var(--odoo-row-hover)] dark:text-zinc-100 dark:hover:bg-zinc-700',
    danger: 'border border-red-700 bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
  };
  return (
    <button type={type} className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

const inputBaseClass =
  'w-full min-h-9 rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] shadow-none placeholder:text-[var(--color-muted)] transition focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600/30 sm:min-h-10 sm:px-3.5 sm:py-2.5 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...props },
  ref,
) {
  return <input ref={ref} className={`${inputBaseClass} ${className}`} {...props} />;
});

export type AmountFcfaInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Classe CSS sur le conteneur (ex. largeur max). */
  wrapperClassName?: string;
  /** Suffixe « FCFA » à droite (défaut : oui). */
  showSuffix?: boolean;
};

/**
 * Saisie de montants en FCFA : affichage avec espaces milliers (ex. 1 000 000), valeur contrôlée = chiffres seuls.
 * `min` / `max` / `step` sont ignorés par le DOM (type texte) ; la validation reste côté formulaire.
 */
export const AmountFcfaInput = forwardRef<HTMLInputElement, AmountFcfaInputProps>(function AmountFcfaInput(
  {
    className = '',
    wrapperClassName = '',
    showSuffix = true,
    min: _min,
    max: _max,
    step: _step,
    value,
    onChange,
    onBlur,
    ...rest
  },
  ref,
) {
  const amountClass =
    'tabular-nums text-[15px] font-semibold tracking-tight [font-variant-numeric:lining-nums_tabular-nums] sm:text-[1.0625rem]';
  const suffixPad = showSuffix ? 'pr-[4.25rem]' : '';

  const strVal = value === undefined || value === null ? '' : String(value);
  const digits = strVal.replace(/\D/g, '');
  const displayValue = formatAmountDigitsGrouped(digits);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const nextDigits = e.target.value.replace(/\D/g, '');
    if (onChange) {
      const ev = {
        ...e,
        target: { ...e.target, value: nextDigits },
        currentTarget: { ...e.currentTarget, value: nextDigits },
      } as ChangeEvent<HTMLInputElement>;
      onChange(ev);
    }
  }

  const inputEl = (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={displayValue}
      onChange={handleChange}
      onBlur={onBlur}
      className={`${inputBaseClass} ${amountClass} ${suffixPad} ${className}`}
      {...rest}
    />
  );

  if (!showSuffix) {
    return inputEl;
  }

  return (
    <div className={`relative min-w-[9rem] ${wrapperClassName}`}>
      {inputEl}
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-[10px] font-bold uppercase leading-none tracking-[0.2em] text-slate-600 dark:text-slate-300"
      >
        FCFA
      </span>
    </div>
  );
});

export function Label({
  children,
  htmlFor,
  className = '',
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`mb-1.5 block text-[13px] font-semibold leading-tight tracking-normal text-slate-700 dark:text-slate-300 ${className}`}
    >
      {children}
    </label>
  );
}

export { Select } from '@/components/Select';

/** Aide discrète : détail au survol / focus (title), sans alourdir la page. */
export function HelpHint({ title, className = '' }: { title: string; className?: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-slate-300/90 bg-white text-slate-600 transition hover:border-slate-400 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-400 dark:hover:text-slate-100 ${className}`}
    >
      <svg aria-hidden className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    </button>
  );
}
