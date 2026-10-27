import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/ui/index';
import { fcfa, formatDateFr } from '@/lib/format';
import { paymentRemaining } from '@/lib/paymentRow';
import type { PaymentRow } from '@/lib/paymentRow';
import { statusLabel } from '@/lib/paymentStatusUi';
import { unitKindLabel } from '@/lib/unitKind';

const sectionTitle = 'text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]';

function MoneyTile({
  label,
  children,
  accent,
  className = '',
}: {
  label: string;
  children: ReactNode;
  /** Variable CSS de statut (`--status-paid`, `--status-pending`…) — couleur du libellé et du filet. */
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-3 py-3 ${className}`}
      style={
        accent
          ? {
              borderColor: `color-mix(in srgb, var(${accent}) 35%, transparent)`,
              backgroundColor: `var(${accent}-bg)`,
            }
          : undefined
      }
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]"
        style={accent ? { color: `var(${accent})` } : undefined}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

/** En-tête, bien & lot, montants / dates d'une échéance (panneau de détail). */
export function PaymentZoomSummary({ p }: { p: PaymentRow }) {
  const rem = paymentRemaining(p);
  const paid = Number(p.amountPaid ?? 0);
  const showPartiel = (p.status === 'PENDING' || p.status === 'LATE') && paid > 0;
  const amountClass = 'mt-1 text-2xl font-bold tabular-nums tracking-tight text-[var(--color-ink)]';

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className={sectionTitle}>Locataire</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-xl font-bold tracking-tight text-[var(--color-ink)]">
              {p.lease.tenant.firstName} {p.lease.tenant.lastName}
            </p>
            <StatusBadge status={p.status} label={statusLabel(p.status)} />
          </div>
        </div>
        <p className="shrink-0 rounded-lg border border-[var(--odoo-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[var(--color-ink)]">
          {String(p.periodMonth).padStart(2, '0')}/{p.periodYear}
        </p>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <p className={sectionTitle}>Bien & lot</p>
        <div className="mt-2 space-y-1.5 rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-3 py-3 text-sm leading-snug text-[var(--color-ink)]">
          <p>
            <span className="font-semibold text-[var(--color-muted)]">Adresse · </span>
            {p.lease.unit.building.commune}, {p.lease.unit.building.city}
          </p>
          <p>
            <span className="font-semibold text-[var(--color-muted)]">Site · </span>
            {p.lease.unit.building.name}
          </p>
          <p>
            <span className="font-semibold text-[var(--color-muted)]">Lot · </span>
            {unitKindLabel(p.lease.unit.kind)} — {p.lease.unit.label}
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--odoo-border)] px-4 py-4 sm:px-5">
        <p className={sectionTitle}>Montants & dates</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <MoneyTile label="Loyer dû">
            <p className={amountClass}>{fcfa(Number(p.amountDue))}</p>
          </MoneyTile>
          <MoneyTile label="Date d'échéance">
            <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-ink)]">{formatDateFr(p.dueDate)}</p>
          </MoneyTile>
          {showPartiel ? (
            <>
              <MoneyTile label="Encaissé" accent="--status-paid">
                <p className={amountClass}>{fcfa(paid)}</p>
              </MoneyTile>
              <MoneyTile label="Reste à payer" accent="--status-pending">
                <p className={amountClass}>{fcfa(rem)}</p>
              </MoneyTile>
            </>
          ) : null}
          {p.status === 'PAID' && p.paidAt ? (
            <MoneyTile label="Paiement enregistré" accent="--status-paid" className="sm:col-span-2">
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">Payé le {formatDateFr(p.paidAt)}</p>
            </MoneyTile>
          ) : null}
          {p.status === 'WAIVED' ? (
            <MoneyTile label="Gratuité de loyer" accent="--status-waived" className="sm:col-span-2">
              {p.waivedAt ? (
                <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">Enregistrée le {formatDateFr(p.waivedAt)}</p>
              ) : null}
              {p.waiveReason?.trim() ? (
                <p className="mt-2 text-sm font-medium leading-snug text-[var(--color-ink)]">{p.waiveReason}</p>
              ) : null}
            </MoneyTile>
          ) : null}
        </div>
      </div>
    </>
  );
}
