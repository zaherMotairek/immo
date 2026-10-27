import { useState } from 'react';
import { api } from '@/lib/api';
import { paymentRemaining } from '@/lib/paymentRow';
import type { PaymentRow } from '@/lib/paymentRow';

/**
 * État + envoi du versement partiel (PATCH `addAmountPaid`).
 * `onSaved` est appelé après fermeture du dialogue (rafraîchir la ligne / la liste).
 */
export function usePartialPayment(onSaved: (paymentId: string) => void | Promise<void>) {
  const [partialFor, setPartialFor] = useState<PaymentRow | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialErr, setPartialErr] = useState('');
  const [partialSubmitting, setPartialSubmitting] = useState(false);

  function openPartial(p: PaymentRow) {
    const remaining = paymentRemaining(p);
    if (remaining <= 0) return;
    setPartialFor(p);
    setPartialAmount(String(Math.max(1, Math.round(remaining))));
    setPartialErr('');
  }

  function closePartial() {
    setPartialFor(null);
  }

  async function submitPartial() {
    if (!partialFor) return;
    const remaining = paymentRemaining(partialFor);
    const n = Number(partialAmount.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(n) || n < 1) {
      setPartialErr('Indiquez un montant valide (minimum 1 FCFA).');
      return;
    }
    if (n > remaining + 0.01) {
      setPartialErr(`Maximum : ${Math.round(remaining).toLocaleString('fr-FR')} FCFA.`);
      return;
    }
    const id = partialFor.id;
    setPartialSubmitting(true);
    setPartialErr('');
    try {
      await api(`/payments/${id}`, {
        method: 'PATCH',
        json: { addAmountPaid: n },
      });
      setPartialFor(null);
      await onSaved(id);
    } catch (e) {
      setPartialErr(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setPartialSubmitting(false);
    }
  }

  return {
    partialFor,
    partialAmount,
    setPartialAmount,
    partialErr,
    partialSubmitting,
    openPartial,
    closePartial,
    submitPartial,
  };
}

export type PartialPaymentState = ReturnType<typeof usePartialPayment>;
