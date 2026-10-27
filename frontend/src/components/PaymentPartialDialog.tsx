import { useEffect } from 'react';
import { Button, Card, Field, MoneyInput } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import { paymentRemaining } from '@/lib/paymentRow';
import { shouldDeferEscapeCancel } from '@/lib/useEscapeCancel';
import type { PartialPaymentState } from '@/components/usePartialPayment';

type PaymentPartialDialogProps = {
  state: PartialPaymentState;
  /** Préfixe des ids DOM (titre + champ) pour éviter les doublons entre pages. */
  idPrefix: string;
  /**
   * `true` : Échap ferme le dialogue (liste Paiements).
   * `false` : le dialogue se déclare `data-escape-modal` et Échap est ignoré (au-dessus du panneau de détail).
   */
  closeOnEscape?: boolean;
};

/** Dialogue « Versement partiel » (au-dessus d'un panneau ou de la liste, d'où son z-index propre). */
export function PaymentPartialDialog({ state, idPrefix, closeOnEscape = false }: PaymentPartialDialogProps) {
  const { partialFor, partialAmount, setPartialAmount, partialErr, partialSubmitting, closePartial, submitPartial } = state;

  useEffect(() => {
    if (!closeOnEscape || !partialFor || partialSubmitting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (shouldDeferEscapeCancel()) return;
      e.preventDefault();
      closePartial();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeOnEscape, partialFor, partialSubmitting, closePartial]);

  if (!partialFor) return null;
  const titleId = `${idPrefix}-title`;
  const amountId = `${idPrefix}-amount`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-escape-modal={closeOnEscape ? undefined : 'true'}
      onClick={(e) => {
        if (e.target === e.currentTarget && !partialSubmitting) closePartial();
      }}
    >
      <Card padding="lg" className="w-full max-w-md shadow-[var(--shadow-lift)]">
        <h2 id={titleId} className="text-base font-semibold text-[var(--color-ink)]">
          Versement partiel
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {partialFor.lease.tenant.firstName} {partialFor.lease.tenant.lastName} —{' '}
          {String(partialFor.periodMonth).padStart(2, '0')}/{partialFor.periodYear}
        </p>
        <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--status-pending)]/30 bg-[var(--status-pending-bg)] px-3 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--status-pending)]">Reste à payer</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-[var(--color-ink)]">
            {fcfa(paymentRemaining(partialFor))}
          </p>
        </div>
        <Field label="Montant du versement" htmlFor={amountId} error={partialErr || undefined} className="mt-4">
          <MoneyInput
            id={amountId}
            autoFocus
            value={partialAmount}
            onChange={(e) => setPartialAmount(e.target.value)}
            min={1}
            max={Math.max(1, Math.ceil(paymentRemaining(partialFor)))}
            step={1}
            aria-describedby={partialErr ? `${amountId}-error` : undefined}
            aria-invalid={partialErr ? true : undefined}
          />
        </Field>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={partialSubmitting} onClick={closePartial}>
            Annuler
          </Button>
          <Button loading={partialSubmitting} onClick={() => void submitPartial()}>
            {partialSubmitting ? 'Enregistrement…' : 'Enregistrer le versement'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
