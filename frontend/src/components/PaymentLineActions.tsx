import { Button } from '@/components/ui';
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
  const bp = zoomed
    ? 'py-3 text-sm min-h-[2.75rem]'
    : stacked
      ? 'shrink-0 justify-center whitespace-nowrap px-2.5 py-2 text-xs'
      : compact
        ? 'shrink-0 py-1.5 px-2.5 text-[11px] font-semibold leading-tight'
        : 'py-2 text-xs';
  const waBp = zoomed
    ? 'px-5 py-3 text-sm'
    : stacked
      ? 'shrink-0 justify-center whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold'
      : compact
        ? 'shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold leading-tight'
        : 'px-4 py-2 text-xs';

  const contactHint =
    'Ajoutez un e-mail ou un n° avec indicatif (ex. +225…) dans Locataires pour relancer.';

  const nodes = (
    <>
      {isOverduePayment(p) && p.lease.tenant.email && (
        <Button variant="secondary" className={bp} disabled={sendingId !== null} onClick={() => void onSendReminder(p)}>
          {sendingId === p.id ? 'Envoi…' : compact && !stacked ? 'Relance' : 'Relance e-mail'}
        </Button>
      )}
      {isOverduePayment(p) &&
        (() => {
          const waDigits = formatPhoneForWhatsApp(p.lease.tenant.phone);
          if (!waDigits) return null;
          const waHref = whatsAppWebUrl(
            waDigits,
            overdueReminderWhatsAppText({
              firstName: p.lease.tenant.firstName,
              periodLabel: `${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`,
              amountFcfa: paymentRemaining(p),
              dueDateStr: formatDateFr(p.dueDate),
              buildingName: p.lease.unit.building.name,
              unitLabel: p.lease.unit.label,
            }),
          );
          return (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center rounded-xl border border-emerald-600/90 bg-emerald-50 font-medium text-emerald-900 shadow-sm hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 ${waBp}`}
            >
              WhatsApp
            </a>
          );
        })()}
      {isOverduePayment(p) && !p.lease.tenant.email && !formatPhoneForWhatsApp(p.lease.tenant.phone) && (
        <span
          className={
            stacked
              ? 'shrink-0 rounded-md border border-amber-200/90 bg-amber-50/90 px-2 py-1.5 text-center text-[10px] font-medium text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200'
              : compact
                ? 'shrink-0 rounded-md border border-amber-200/90 bg-amber-50/90 px-1.5 py-1 text-[10px] font-medium text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200'
                : zoomed
                  ? 'w-full py-1 text-sm text-amber-800 dark:text-amber-200'
                  : 'max-w-[14rem] py-2 text-xs text-amber-800'
          }
          title={compact || stacked ? contactHint : undefined}
        >
          {compact && !stacked ? 'Coord.' : stacked ? 'Coordonnées manquantes' : contactHint}
        </span>
      )}
      {(p.status === 'PENDING' || p.status === 'LATE') && (
        <>
          <Button variant="primarySoft" className={bp} onClick={() => onOpenPartial(p)}>
            {compact && !stacked ? 'Partiel' : 'Versement partiel'}
          </Button>
          <Button className={bp} onClick={() => void onMarkPaid(p)}>
            {compact && !stacked ? 'Payé' : 'Marquer payé'}
          </Button>
        </>
      )}
      {(p.status === 'PAID' ||
        ((p.status === 'PENDING' || p.status === 'LATE') && Number(p.amountPaid ?? 0) > 0)) && (
        <>
          <Button variant="secondary" className={bp} onClick={() => downloadPaymentReceipt(p.id)}>
            {compact && !stacked ? 'PDF' : 'Reçu PDF'}
          </Button>
          {(() => {
            const waDigits = formatPhoneForWhatsApp(p.lease.tenant.phone);
            if (!waDigits) return null;
            return (
              <Button
                variant="ghost"
                className={bp}
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
                    .catch(() => alert('Lien de quittance indisponible.'));
                }}
              >
                {compact && !stacked ? 'WA reçu' : 'WhatsApp reçu'}
              </Button>
            );
          })()}
        </>
      )}
    </>
  );

  if (stacked) {
    return (
      <div className="flex w-full flex-row flex-wrap items-center justify-end gap-1.5">{nodes}</div>
    );
  }
  if (compact) {
    return <div className="flex min-w-0 flex-nowrap items-center gap-1">{nodes}</div>;
  }
  return nodes;
}
