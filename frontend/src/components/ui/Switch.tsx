import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn';

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
};

/** Interrupteur accessible (`role="switch"`), contrôlé. */
export function Switch({ checked, onChange, label, description, disabled, id, className }: SwitchProps) {
  const autoId = useId();
  const switchId = id ?? autoId;
  const labelId = `${switchId}-label`;
  const descId = description ? `${switchId}-desc` : undefined;

  return (
    <div className={cn('flex min-h-11 items-center justify-between gap-3 py-1.5 sm:min-h-10', className)}>
      <div className="min-w-0">
        <span id={labelId} className="block text-sm font-medium text-[var(--color-ink)]">
          {label}
        </span>
        {description ? (
          <span id={descId} className="mt-0.5 block text-xs text-[var(--color-muted)]">
            {description}
          </span>
        ) : null}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent transition-colors duration-[var(--duration-base)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-brand-600' : 'bg-[var(--odoo-border-strong)]',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-[var(--duration-base)]',
            checked ? 'translate-x-[1.35rem]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
