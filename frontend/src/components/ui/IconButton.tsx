import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type IconButtonVariant = 'ghost' | 'secondary' | 'danger';
export type IconButtonSize = 'sm' | 'md';

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> & {
  /** Obligatoire : nom accessible du bouton (français). */
  'aria-label': string;
  /** Icône (SVG) — décorative, masquée aux lecteurs d'écran. */
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
};

const variantClass: Record<IconButtonVariant, string> = {
  ghost: 'text-[var(--color-muted)] hover:bg-[var(--odoo-row-hover)] hover:text-[var(--color-ink)]',
  secondary:
    'border border-[var(--odoo-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--odoo-row-hover)]',
  danger:
    'text-[var(--status-late)] hover:bg-[var(--status-late-bg)] focus-visible:outline-[var(--status-late)]',
};

const sizeClass: Record<IconButtonSize, string> = {
  sm: 'size-9',
  md: 'size-11 sm:size-10',
};

/** Bouton carré icône seule — cible tactile ≥ 40 px. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant = 'ghost', size = 'md', type = 'button', className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[var(--radius-input)] transition-colors duration-[var(--duration-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      <span aria-hidden className="inline-flex size-5 items-center justify-center [&>svg]:size-5">
        {icon}
      </span>
    </button>
  );
});
