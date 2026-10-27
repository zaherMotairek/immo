import { useLayoutEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { monthGroupKey } from '@/lib/paymentRow';
import type { PaymentRow } from '@/lib/paymentRow';

type PendingRestore = { paymentId: string; fallbackY: number };

function applyPaymentRowScrollRestore(pending: PendingRestore) {
  const maxScrollY = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const applyY = (top: number) => {
    const t = Math.max(0, Math.min(top, maxScrollY()));
    window.scrollTo({ top: t, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = t;
    document.body.scrollTop = t;
  };

  const row = document.getElementById(`payment-${pending.paymentId}`);
  if (row) {
    row.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    const details = row.querySelector('details');
    if (details) details.open = true;
  } else {
    applyY(pending.fallbackY);
  }
}

/**
 * Après versement partiel / marquer payé / relance / modale : éviter le retour en haut de page.
 * Renvoie `schedule(paymentId, fallbackY?)` à appeler juste avant de recharger la liste.
 */
export function usePaymentScrollRestore(options: {
  rows: PaymentRow[];
  paymentsReady: boolean;
  setCollapsedMonthKeys: Dispatch<SetStateAction<Set<string>>>;
}) {
  const { rows, paymentsReady, setCollapsedMonthKeys } = options;
  const pendingRef = useRef<PendingRestore | null>(null);

  function scheduleScrollRestoreBeforeLoad(paymentId: string, fallbackY?: number) {
    pendingRef.current = {
      paymentId,
      fallbackY: fallbackY ?? window.scrollY,
    };
  }

  useLayoutEffect(() => {
    if (!paymentsReady) return;
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;

    const p = rows.find((r) => r.id === pending.paymentId);
    if (p) {
      const mk = monthGroupKey(p);
      setCollapsedMonthKeys((prev) => {
        if (!prev.has(mk)) return prev;
        const next = new Set(prev);
        next.delete(mk);
        return next;
      });
    }

    const run = () => applyPaymentRowScrollRestore(pending);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        run();
        window.setTimeout(run, 0);
      });
    });
  }, [rows, paymentsReady, setCollapsedMonthKeys]);

  return scheduleScrollRestoreBeforeLoad;
}
