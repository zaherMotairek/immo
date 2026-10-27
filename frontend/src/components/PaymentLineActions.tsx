import { Button, cn } from '@/components/ui/index';
import type { ButtonSize } from '@/components/ui/index';
import { toast } from '@/components/ui/Toast';
import { createPaymentReceiptShareLink, downloadPaymentReceipt } from '@/lib/api';
import { formatDateFr } from '@/lib/format';
import { isOverduePayment, paymentRemaining, type PaymentRow } from '@/lib/paymentRow';
import {
  formatPhoneForWhatsApp,
  overdueReminderWhatsAppText,
  whatsAppWebUrl,
} from '@/lib/whatsappReminder';

export type PaymentLineActionsProps = {
  p: PaymentRow;
  zoomed: boolean;
  /** Une seule rangée, boutons plus compacts (liste Paiements). */
  compact?: boolean;
  /** Boutons empilés pleine largeur (menu Actions du tableau Paiements). */
  stacked?: boolean;
  sendingId: string | null;
  onSendReminder: (p: PaymentRow) => void | Promise<void>;
  onOpenPartial: (p: PaymentRow) => void;
  onMarkPaid: (p: PaymentRow) => void | Promise<void>;
};

const CONTACT_HINT = 'Ajoutez un e-mail ou un n° avec indicatif (ex. +225…) dans Locataires pour relancer.';

export function PaymentLineActions({
  p,
  zoomed,
  compact = false,
  stacked = false,
  sendingId,
  onSendReminder,
  onOpenPartial,
  onMarkPaid,
}: PaymentLineActionsProps) {
  const short = compact && !stacked;
  const size: ButtonSize = zoomed ? 'lg' : 'sm';
  const btnCls = !zoomed && (stacked || compact) ? 'shrink-0 whitespace-nowrap' : undefined;
  const waCls = cn(
    'inline-flex items-center justify-center rounded-[var(--radius-input)] border border-[var(--status-paid)] bg-[var(--status-paid-bg)] font-medium text-[var(--status-paid)] transition-colors hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--status-paid)]',
    zoomed ? 'min-h-11 px-5 text-base' : cn('min-h-9 px-3 text-sm', btnCls),
  );
  const overdue = isOverduePayment(p);
  const waDigits = formatPhoneForWhatsApp(p.lease.tenant.phone);
  const canRemind = overdue && Boolean(p.lease.tenant.email);
  const hasPartialReceipt =
    p.status === 'PAID' || ((p.status === 'PENDING' || p.status === 'LATE') && Number(p.amountPaid ?? 0) > 0);

  const nodes = (
    <>
      {canRemind && (
        <Button variant="secondary" size={size} className={btnCls} disabled={sendingId !== null} onClick={() => void onSendReminder(p)}>
          {sendingId === p.id ? 'Envoi…' : short ? 'Relance' : 'Relance e-mail'}
        </Button>
      )}
      {overdue && waDigits ? (
        <a
          href={whatsAppWebUrl(
            waDigits,
            overdueReminderWhatsAppText({
              firstName: p.lease.tenant.firstName,
              periodLabel: `${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`,
              amountFcfa: paymentRemaining(p),
              dueDateStr: formatDateFr(p.dueDate),
              buildingName: p.lease.unit.building.name,
              unitLabel: p.lease.unit.label,
            }),
          )}
          target="_blank"
          rel="noopener noreferrer"
          className={waCls}
        >
          WhatsApp
        </a>
      ) : null}
      {overdue && !p.lease.tenant.email && !waDigits && (
        <span
          className={cn(
            'text-[var(--status-pending)]',
            stacked || compact
              ? 'shrink-0 rounded-md border border-[var(--status-pending)]/40 bg-[var(--status-pending-bg)] px-2 py-1 text-center text-[10px] font-medium'
              : zoomed
                ? 'w-full py-1 text-sm'
                : 'max-w-[14rem] py-2 text-xs',
          )}
          title={compact || stacked ? CONTACT_HINT : undefined}
        >
          {short ? 'Coord.' : stacked ? 'Coordonnées manquantes' : CONTACT_HINT}
        </span>
      )}
      {(p.status === 'PENDING' || p.status === 'LATE') && (
        <>
          <Button variant="primarySoft" size={size} className={btnCls} onClick={() => onOpenPartial(p)}>
            {short ? 'Partiel' : 'Versement partiel'}
          </Button>
          <Button size={size} className={btnCls} onClick={() => void onMarkPaid(p)}>
            {short ? 'Payé' : 'Marquer payé'}
          </Button>
        </>
      )}
      {hasPartialReceipt && (
        <>
          <Button variant="secondary" size={size} className={btnCls} onClick={() => downloadPaymentReceipt(p.id)}>
            {short ? 'PDF' : 'Reçu PDF'}
          </Button>
          {waDigits ? (
            <Button
              variant="ghost"
              size={size}
              className={btnCls}
              onClick={() => {
                void createPaymentReceiptShareLink(p.id)
                  .then((r) => {
                    const msg = [
                      `Bonjour ${p.lease.tenant.firstName},`,
                      `Voici votre quittance de loyer (${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}).`,
                      r.shareUrl,
                    ].join('\n');
                    window.open(whatsAppWebUrl(waDigits, msg), '_blank', 'noopener,noreferrer');
                  })
                  .catch(() => toast('Lien de quittance indisponible.', { variant: 'error' }));
              }}
            >
              {short ? 'WA reçu' : 'WhatsApp reçu'}
            </Button>
          ) : null}
        </>
      )}
    </>
  );

  if (stacked) {
    return <div className="flex w-full flex-row flex-wrap items-center justify-end gap-1.5">{nodes}</div>;
  }
  if (compact) {
    return <div className="flex min-w-0 flex-wrap items-center gap-1 sm:flex-nowrap">{nodes}</div>;
  }
  return nodes;
}
