import type { ReactNode } from 'react';
import { cn } from './cn';
import { PAYMENT_STATUS_LABELS, getCollectionMethodLabel, normalizePaymentStatus } from './statusMaps';
import type { PaymentStatusKey } from './statusMaps';

export type StatusBadgeProps = {
  /** PAID | LATE | PENDING | WAIVED | CANCELLED (ou toute autre chaîne → rendu neutre). */
  status: PaymentStatusKey | (string & {});
  /** Remplace le libellé français par défaut. */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
};

const iconProps = {
  'aria-hidden': true,
  className: 'size-3.5 shrink-0',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.25,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const ICONS: Record<PaymentStatusKey | 'UNKNOWN', ReactNode> = {
  PAID: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9.5" />
    </svg>
  ),
  LATE: (
    <svg {...iconProps}>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 10v4" />
      <path d="M12 17.2h.01" />
    </svg>
  ),
  PENDING: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  WAIVED: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </svg>
  ),
  CANCELLED: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  ),
  UNKNOWN: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  ),
};

const COLORS: Record<PaymentStatusKey | 'UNKNOWN', { color: string; backgroundColor: string }> = {
  PAID: { color: 'var(--status-paid)', backgroundColor: 'var(--status-paid-bg)' },
  LATE: { color: 'var(--status-late)', backgroundColor: 'var(--status-late-bg)' },
  PENDING: { color: 'var(--status-pending)', backgroundColor: 'var(--status-pending-bg)' },
  WAIVED: { color: 'var(--status-waived)', backgroundColor: 'var(--status-waived-bg)' },
  CANCELLED: { color: 'var(--status-cancelled)', backgroundColor: 'var(--status-cancelled-bg)' },
  UNKNOWN: { color: 'var(--status-cancelled)', backgroundColor: 'var(--status-cancelled-bg)' },
};

/** Pastille de statut : couleur + icône + libellé français (jamais la couleur seule). */
export function StatusBadge({ status, label, size = 'md', className }: StatusBadgeProps) {
  const key = normalizePaymentStatus(status);
  const visual = key ?? 'UNKNOWN';
  const text = label ?? (key ? PAYMENT_STATUS_LABELS[key] : status);

  return (
    <span
      style={COLORS[visual]}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-current/25 font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-[13px]',
        className,
      )}
    >
      {ICONS[visual]}
      <span>{text}</span>
    </span>
  );
}

export type CollectionMethodBadgeProps = {
  /** CASH | TRANSFER | MOBILE_MONEY | CHECK | OTHER (autre → valeur brute). */
  method: string;
  className?: string;
};

/** Pastille neutre du mode d'encaissement (Espèces, Virement, Mobile money, Chèque, Autre). */
export function CollectionMethodBadge({ method, className }: CollectionMethodBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink)]',
        className,
      )}
    >
      {getCollectionMethodLabel(method)}
    </span>
  );
}
