import type { ReactNode } from 'react';
import { cn } from './cn';

export type FieldProps = {
  label: ReactNode;
  /** `id` du contrÃ´le enfant. Sert aussi de base aux ids `${htmlFor}-hint` et `${htmlFor}-error`. */
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Enveloppe label + aide + erreur autour d'un contrÃ´le.
 * Le contrÃ´le enfant peut rÃ©fÃ©rencer `aria-describedby={`${htmlFor}-hint`}` / `${htmlFor}-error`.
 */
export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn('grid', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <>
            <span aria-hidden className="ml-0.5 text-[var(--status-late)]">
              *
            </span>
            <span className="sr-only"> (obligatoire)</span>
          </>
        ) : null}
      </Label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-[var(--color-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-xs font-medium text-[var(--status-late)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** LibellÃ© de champ (compatible avec l'ancien `Label` de `@/components/ui`). */
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
      className={cn(
        'mb-1.5 block text-[13px] font-semibold leading-tight tracking-normal text-[var(--color-ink)] dark:text-zinc-200',
        className,
      )}
    >
      {children}
    </label>
  );
}
