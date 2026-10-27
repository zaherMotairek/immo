import { Button, Card } from '@/components/ui/index';

type PaymentsBulkBarProps = {
  selectedCount: number;
  payableCount: number;
  submitting: boolean;
  onMarkPaid: () => void;
  onClear: () => void;
};

/** Actions groupées sur la sélection (marquer payé / vider). */
export function PaymentsBulkBar({ selectedCount, payableCount, submitting, onMarkPaid, onClear }: PaymentsBulkBarProps) {
  const plural = selectedCount > 1 ? 's' : '';
  return (
    <Card
      padding="sm"
      role="region"
      aria-label="Actions sur la sélection"
      className="flex flex-wrap items-center justify-between gap-3 border-brand-200 bg-brand-50/70 dark:border-brand-500/40 dark:bg-brand-950/30"
    >
      <p className="text-sm font-medium text-[var(--color-ink)]">
        {selectedCount} ligne{plural} sélectionnée{plural}
        {payableCount !== selectedCount ? ` · ${payableCount} payable${payableCount > 1 ? 's' : ''}` : ''}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={submitting || payableCount === 0} onClick={onMarkPaid}>
          {submitting ? 'Traitement…' : 'Marquer la sélection comme payée'}
        </Button>
        <Button variant="secondary" size="sm" disabled={submitting} onClick={onClear}>
          Vider la sélection
        </Button>
      </div>
    </Card>
  );
}
