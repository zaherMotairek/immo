import { forwardRef } from 'react';
import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { formatAmountDigitsGrouped } from '@/lib/format';
import { inputBaseClass } from './Input';
import { cn } from './cn';

export type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Classe CSS sur le conteneur (ex. largeur max). */
  wrapperClassName?: string;
  /** Suffixe « FCFA » à droite (défaut : oui). */
  showSuffix?: boolean;
};

/**
 * Saisie de montants en FCFA : affichage avec espaces milliers (ex. 1 000 000), valeur contrôlée = chiffres seuls.
 * `min` / `max` / `step` sont ignorés par le DOM (type texte) ; la validation reste côté formulaire.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  {
    className,
    wrapperClassName,
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
    'tabular-nums text-[15px]! font-semibold tracking-tight [font-variant-numeric:lining-nums_tabular-nums] sm:text-[1.0625rem]!';
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
      className={cn(inputBaseClass, amountClass, suffixPad, className)}
      {...rest}
    />
  );

  if (!showSuffix) {
    return inputEl;
  }

  return (
    <div className={cn('relative min-w-[9rem]', wrapperClassName)}>
      {inputEl}
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-xs font-bold uppercase leading-none tracking-[0.2em] text-[var(--color-muted)]"
      >
        F CFA
      </span>
    </div>
  );
});
