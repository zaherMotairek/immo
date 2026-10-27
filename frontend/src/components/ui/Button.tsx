import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'primarySoft' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Désactive le bouton et affiche un indicateur de chargement. */
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

const baseClass =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-input)] font-medium transition-colors duration-[var(--duration-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const variantClass: Record<ButtonVariant, string> = {
  primary: 'odoo-btn-primary focus-visible:outline-brand-600',
  primarySoft:
    'border border-brand-600/35 bg-brand-50 text-brand-800 hover:bg-brand-100 focus-visible:outline-brand-600 dark:border-brand-500/45 dark:bg-brand-950/40 dark:text-brand-100',
  secondary:
    'odoo-btn-secondary focus-visible:outline-brand-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
  ghost:
    'text-[var(--color-ink)] hover:bg-[var(--odoo-row-hover)] focus-visible:outline-brand-600 dark:text-zinc-100 dark:hover:bg-zinc-700',
  danger:
    'border border-[var(--status-late)] bg-[var(--status-late)] text-white hover:brightness-90 focus-visible:outline-[var(--status-late)]',
};

/** Hauteurs tactiles : md ≥ 40 px, lg ≥ 44 px. */
const sizeClass: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-sm',
  md: 'min-h-10 px-4 py-2 text-sm',
  lg: 'min-h-11 px-5 py-2.5 text-base',
};

function Spinner() {
  return (
    <svg
      aria-hidden
      className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    loading = false,
    leftIcon,
    rightIcon,
    className,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(baseClass, variantClass[variant], sizeClass[size], className)}
      {...props}
    >
      {loading ? <Spinner /> : leftIcon}
      {children}
      {loading ? null : rightIcon}
    </button>
  );
});
