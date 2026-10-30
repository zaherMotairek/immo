import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { paymentRemaining } from '@/lib/paymentRow';
import type { PaymentRow } from '@/lib/paymentRow';
import { toast } from '@/components/ui/Toast';
import type { BulkCollectValues } from './PaymentsBulkCollectModal';

/** Sélection de lignes + encaissement groupé (C4). */
export function usePaymentsSelection(options: {
  rows: PaymentRow[];
  visibleRows: PaymentRow[];
  methodFilter: string;
  load: () => void;
}) {
  const { rows, visibleRows, methodFilter, load } = options;
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);

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

  function openCollectModal() {
    if (selectableRows.length === 0) {
      toast('Aucune ligne sélectionnée payable (en attente / en retard).', { variant: 'warning' });
      return;
    }
    setCollectOpen(true);
  }

  async function confirmCollect(values: BulkCollectValues) {
    if (selectableRows.length === 0) return;
    setBulkSubmitting(true);
    try {
      const res = await api<{ ok: number; failed: number }>('/payments/bulk-collect', {
        method: 'POST',
        json: {
          paidAt: values.paidAt,
          collectionMethod: values.collectionMethod || 'CASH',
          collectionReference: values.collectionReference.trim() || undefined,
          items: selectableRows.map((p) => ({
            id: p.id,
            amountPaid: Number(p.amountDue),
          })),
        },
      });
      setCollectOpen(false);
      setSelectedPaymentIds([]);
      toast(
        res.failed
          ? `${res.ok} encaissé(s), ${res.failed} échec(s)`
          : `${res.ok} paiement(s) encaissé(s)`,
        { variant: res.failed ? 'warning' : 'success' },
      );
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Encaissement groupé impossible.', { variant: 'error' });
    } finally {
      setBulkSubmitting(false);
    }
  }

  return {
    selectedPaymentIds,
    selectableCount: selectableRows.length,
    bulkSubmitting,
    collectOpen,
    setCollectOpen,
    togglePaymentSelection,
    toggleAllInMonth,
    openCollectModal,
    confirmCollect,
    clearSelection: () => setSelectedPaymentIds([]),
  };
}
