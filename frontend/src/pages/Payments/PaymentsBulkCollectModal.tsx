import { useState } from 'react';
import { Button, Input, Modal } from '@/components/ui/index';
import { COLLECTION_METHOD_OPTIONS } from '@/lib/collectionMethodUi';

export type BulkCollectValues = {
  paidAt: string;
  collectionMethod: string;
  collectionReference: string;
};

type Props = {
  open: boolean;
  count: number;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (v: BulkCollectValues) => void;
};

export function PaymentsBulkCollectModal({ open, count, submitting, onClose, onConfirm }: Props) {
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [collectionMethod, setCollectionMethod] = useState('CASH');
  const [collectionReference, setCollectionReference] = useState('');

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Encaisser la sélection" size="md">
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        {count} échéance{count > 1 ? 's' : ''} — date, mode et référence communs (modifiables ensuite
        ligne par ligne si besoin).
      </p>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--color-muted)]">Date d’encaissement</span>
          <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--color-muted)]">Mode</span>
          <select
            className="w-full rounded-md border border-[var(--odoo-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            value={collectionMethod}
            onChange={(e) => setCollectionMethod(e.target.value)}
          >
            {COLLECTION_METHOD_OPTIONS.filter((o) => o.value).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--color-muted)]">Référence (optionnel)</span>
          <Input
            value={collectionReference}
            onChange={(e) => setCollectionReference(e.target.value)}
            placeholder="N° Wave / Orange Money…"
          />
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={submitting} onClick={onClose}>
          Annuler
        </Button>
        <Button
          type="button"
          disabled={submitting}
          onClick={() => onConfirm({ paidAt, collectionMethod, collectionReference })}
        >
          {submitting ? 'Encaissement…' : 'Encaisser'}
        </Button>
      </div>
    </Modal>
  );
}
