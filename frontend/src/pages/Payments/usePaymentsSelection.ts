import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { paymentRemaining } from '@/lib/paymentRow';
import type { PaymentRow } from '@/lib/paymentRow';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';

/** Sélection de lignes + action groupée « Marquer payé ». */
export function usePaymentsSelection(options: {
  rows: PaymentRow[];
  visibleRows: PaymentRow[];
  methodFilter: string;
  load: () => void;
}) {
  const { rows, visibleRows, methodFilter, load } = options;
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  useEffect(() => {
    const visibleIds = new Set(
      rows
        .filter((r) => (methodFilter === 'all' ? true : (r.collectionMethod ?? 'CASH') === methodFilter))
        .map((r) => r.id),
    );
    setSelectedPaymentIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [rows, methodFilter]);

  const selectedRows = useMemo(() => {
    if (selectedPaymentIds.length === 0) return [];
    const selected = new Set(selectedPaymentIds);
    return visibleRows.filter((r) => selected.has(r.id));
  }, [visibleRows, selectedPaymentIds]);

  const selectableRows = useMemo(
    () =>
      selectedRows.filter(
        (p) => (p.status === 'PENDING' || p.status === 'LATE') && paymentRemaining(p) > 0,
      ),
    [selectedRows],
  );

  function togglePaymentSelection(paymentId: string) {
    setSelectedPaymentIds((prev) =>
      prev.includes(paymentId) ? prev.filter((id) => id !== paymentId) : [...prev, paymentId],
    );
  }

  function toggleAllInMonth(items: PaymentRow[], checked: boolean) {
    const ids = items.map((p) => p.id);
    setSelectedPaymentIds((prev) => {
      if (checked) {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return [...next];
      }
      return prev.filter((id) => !ids.includes(id));
    });
  }

  async function markSelectedPaid() {
    if (selectableRows.length === 0) {
      toast('Aucune ligne sélectionnée payable (en attente / en retard).', { variant: 'warning' });
      return;
    }
    const count = selectableRows.length;
    const ok = await confirmDialog({
      title: 'Marquer comme payé',
      message: `Marquer ${count} paiement${count > 1 ? 's' : ''} comme payé${count > 1 ? 's' : ''} ?`,
      confirmLabel: 'Marquer payé',
    });
    if (!ok) return;
    setBulkSubmitting(true);
    try {
      await Promise.all(
        selectableRows.map((p) =>
          api(`/payments/${p.id}`, {
            method: 'PATCH',
            json: {
              status: 'PAID',
              amountPaid: Number(p.amountDue),
              paidAt: new Date().toISOString().slice(0, 10),
            },
          }),
        ),
      );
      setSelectedPaymentIds([]);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Action groupée impossible.', { variant: 'error' });
    } finally {
      setBulkSubmitting(false);
    }
  }

  return {
    selectedPaymentIds,
    selectableCount: selectableRows.length,
    bulkSubmitting,
    togglePaymentSelection,
    toggleAllInMonth,
    markSelectedPaid,
    clearSelection: () => setSelectedPaymentIds([]),
  };
}
