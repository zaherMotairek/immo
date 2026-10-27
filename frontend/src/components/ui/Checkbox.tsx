import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & {
  label: ReactNode;
  description?: ReactNode;
};

/** Case à cocher avec libellé cliquable (zone tactile ≥ 44 px). */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, id, className, disabled, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = description ? `${inputId}-desc` : undefined;

  return (
    <div className={cn('flex min-h-11 items-start gap-3 py-1.5 sm:min-h-10', disabled && 'opacity-60', className)}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        disabled={disabled}
        aria-describedby={descId}
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-[var(--radius-control)] accent-[var(--color-brand-600)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed"
        {...props}
      />
      <label htmlFor={inputId} className={cn('min-w-0 text-sm text-[var(--color-ink)]', !disabled && 'cursor-pointer')}>
        <span className="font-medium">{label}</span>
        {description ? (
          <span id={descId} className="mt-0.5 block text-xs text-[var(--color-muted)]">
            {description}
          </span>
        ) : null}
      </label>
    </div>
  );
});
