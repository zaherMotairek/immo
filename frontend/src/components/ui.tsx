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
      className={`rounded-2xl border border-slate-200/95 bg-white p-4 text-slate-900 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_4px_16px_rgb(15_23_42/0.05)] ring-1 ring-slate-900/[0.025] sm:p-5 dark:border-slate-700/75 dark:bg-slate-900/92 dark:text-slate-100 dark:shadow-[0_2px_8px_rgb(0_0_0/0.25)] dark:ring-white/[0.05] ${className}`}
    >
      {children}
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
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 active:scale-[0.98]';
  const styles = {
    primary: 'bg-brand-600 text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 focus-visible:outline-brand-600',
    /** Même famille que le primaire, ton plus clair (ex. acompte à côté de « Marquer payé »). */
    primarySoft:
      'border border-brand-500/40 bg-brand-100 text-brand-700 shadow-sm shadow-brand-600/10 hover:border-brand-600/50 hover:bg-brand-50 dark:border-brand-500/45 dark:bg-brand-600/28 dark:text-white dark:shadow-black/20 dark:hover:bg-brand-600/40',
    secondary:
      'border border-slate-300/90 bg-slate-100/85 text-slate-800 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
    ghost: 'text-slate-800 hover:bg-slate-200/80 dark:text-slate-100 dark:hover:bg-slate-700',
    danger: 'bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-700 focus-visible:outline-red-600',
  };
  return (
    <button type={type} className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

const inputBaseClass =
  'w-full min-h-10 rounded-xl border border-slate-200/95 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm placeholder:font-normal placeholder:text-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/18 dark:border-slate-600 dark:bg-slate-950/50 dark:text-slate-50 dark:placeholder:text-slate-400 dark:focus:bg-slate-950 dark:focus:ring-brand-500/22';

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

const selectBaseClass =
  'w-full min-h-10 rounded-xl border border-slate-200/95 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/18 dark:border-slate-600 dark:bg-slate-950/50 dark:text-slate-50 dark:focus:bg-slate-950';

export function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${selectBaseClass} ${className}`} {...props} />;
}

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
