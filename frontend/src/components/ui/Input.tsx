import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';

/** Surface commune des champs (bordure, fond, focus) — partagée Input / Textarea / Select natif. */
export const inputSurfaceClass =
  'w-full rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-[var(--color-surface)] text-[var(--color-ink)] shadow-none placeholder:text-[var(--color-muted)] transition-colors duration-[var(--duration-fast)] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50';

/** Classe de base d'un champ sur une ligne : 16 px sur mobile (pas de zoom iOS), cible tactile ≥ 44 px. */
export const inputBaseClass = `${inputSurfaceClass} min-h-11 px-3 py-2 text-base sm:min-h-10 sm:px-3.5 sm:py-2.5 sm:text-sm`;

/** Classes d'état invalide (à ajouter lorsque `aria-invalid`). */
export const inputInvalidClass =
  'border-[var(--status-late)] focus:border-[var(--status-late)] focus:ring-[var(--status-late)]/25';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Affiche l'état d'erreur (bordure rouge + `aria-invalid`). */
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || props['aria-invalid'] || undefined}
      className={cn(inputBaseClass, invalid && inputInvalidClass, className)}
      {...props}
    />
  );
});
