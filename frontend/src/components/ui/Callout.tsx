import type { ReactNode } from 'react';
import { cn } from './cn';

export type CalloutVariant = 'info' | 'success' | 'warning' | 'danger';

export type CalloutProps = {
  variant?: CalloutVariant;
  title?: string;
  children: ReactNode;
  className?: string;
};

const iconProps = {
  'aria-hidden': true,
  className: 'size-5 shrink-0',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const ICONS: Record<CalloutVariant, ReactNode> = {
  info: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  ),
  success: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9.5" />
    </svg>
  ),
  warning: (
    <svg {...iconProps}>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 10v4M12 17.2h.01" />
    </svg>
  ),
  danger: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  ),
};

const ACCENT: Record<CalloutVariant, { accent: string; background: string }> = {
  info: { accent: 'var(--color-brand-600)', background: 'var(--odoo-table-head-bg)' },
  success: { accent: 'var(--status-paid)', background: 'var(--status-paid-bg)' },
  warning: { accent: 'var(--status-pending)', background: 'var(--status-pending-bg)' },
  danger: { accent: 'var(--status-late)', background: 'var(--status-late-bg)' },
};

/** Encart d'information : icône + texte, jamais la couleur seule. */
export function Callout({ variant = 'info', title, children, className }: CalloutProps) {
  const { accent, background } = ACCENT[variant];
  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      style={{ borderLeftColor: accent, backgroundColor: background }}
      className={cn(
        'flex items-start gap-3 rounded-[var(--radius-card)] border border-l-4 border-[var(--odoo-border)] px-3 py-3 text-sm text-[var(--color-ink)] sm:px-4',
        className,
      )}
    >
      <span style={{ color: accent }} className="mt-0.5">
        {ICONS[variant]}
      </span>
      <div className="min-w-0 flex-1 leading-relaxed">
        {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
