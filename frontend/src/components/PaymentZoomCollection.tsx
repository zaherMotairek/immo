import { PaymentLineActions } from '@/components/PaymentLineActions';
import { Button, Field, Input, Select } from '@/components/ui/index';
import { COLLECTION_METHOD_OPTIONS, reminderChannelLabel } from '@/lib/collectionMethodUi';
import { isOverduePayment } from '@/lib/paymentRow';
import type { PaymentRow } from '@/lib/paymentRow';
import { formatPhoneForWhatsApp } from '@/lib/whatsappReminder';

export type CollectorOpt = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
};

export type ZoomDrafts = {
  method: string;
  reference: string;
  collectorId: string;
  note: string;
};

type PaymentZoomCollectionProps = {
  p: PaymentRow;
  collectors: CollectorOpt[];
  drafts: ZoomDrafts;
  onDraftChange: (field: keyof ZoomDrafts, value: string) => void;
  savingCollection: boolean;
  savingTask: boolean;
  loggingWa: boolean;
  sendingId: string | null;
  onSaveCollection: (p: PaymentRow) => void | Promise<void>;
  onSaveTask: (p: PaymentRow) => void | Promise<void>;
  onLogWhatsApp: (p: PaymentRow) => void | Promise<void>;
  onSendReminder: (p: PaymentRow) => void | Promise<void>;
  onOpenPartial: (p: PaymentRow) => void;
  onMarkPaid: (p: PaymentRow) => void | Promise<void>;
};

const sectionTitle = 'text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]';
const sectionClass = 'border-t border-[var(--odoo-border)] px-4 py-4 sm:px-5';
const methodOptions = COLLECTION_METHOD_OPTIONS.map((o) => ({ id: o.value, label: o.label }));

/** Encaissement manuel, collecte terrain et actions de la ligne (panneau de détail). */
export function PaymentZoomCollection({
  p,
  collectors,
  drafts,
  onDraftChange,
  savingCollection,
  savingTask,
  loggingWa,
  sendingId,
  onSaveCollection,
  onSaveTask,
  onLogWhatsApp,
  onSendReminder,
  onOpenPartial,
  onMarkPaid,
}: PaymentZoomCollectionProps) {
  const collectorOptions = [
    { id: '', label: '— Aucun —' },
    ...collectors.map((c) => ({ id: c.id, label: `${c.name} · ${c.phone}` })),
  ];

  return (
    <>
      <div className={sectionClass}>
        <p className={sectionTitle}>Encaissement (sans compte bancaire relié)</p>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          Espèces, Orange Money, Wave, virement… + référence libre (n° opération).
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Field label="Mode" htmlFor="zoom-pay-method" className="w-full min-w-0">
            <Select
              id="zoom-pay-method"
              options={methodOptions}
              value={drafts.method}
              onValueChange={(v) => onDraftChange('method', v)}
            />
          </Field>
          <Field label="Référence" htmlFor="zoom-pay-ref" className="min-w-0 flex-1">
            <Input
              id="zoom-pay-ref"
              value={drafts.reference}
              onChange={(e) => onDraftChange('reference', e.target.value)}
              placeholder="Ex. ID opérateur, libellé virement…"
            />
          </Field>
          <Button
            variant="secondary"
            className="w-full shrink-0 sm:w-auto"
            loading={savingCollection}
            onClick={() => void onSaveCollection(p)}
          >
            Enregistrer
          </Button>
        </div>
        {p.reminders && p.reminders.length > 0 ? (
          <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-3 py-2">
            <p className={sectionTitle}>Relances notées</p>
            <ul className="mt-1 max-h-28 space-y-0.5 overflow-y-auto text-xs text-[var(--color-ink)]">
              {p.reminders.map((r) => (
                <li key={r.id}>
                  {new Date(r.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} ·{' '}
                  {reminderChannelLabel(r.channel)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className={sectionClass}>
        <p className={`mb-2 ${sectionTitle}`}>Collecte terrain</p>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          Choisissez un collecteur puis enregistrez : un message WhatsApp s’ouvre tout seul pour lui. Sans collecteur, rien n’est
          envoyé. Quand l’argent est rentré, utilisez « Marquer payé » plus bas.
        </p>
        <Field label="Collecteur" htmlFor="zoom-collector-id">
          <Select
            id="zoom-collector-id"
            options={collectorOptions}
            value={drafts.collectorId}
            onValueChange={(v) => onDraftChange('collectorId', v)}
          />
        </Field>
        <Field label="Note pour le collecteur (optionnel)" htmlFor="zoom-collection-note" className="mt-3">
          <Input
            id="zoom-collection-note"
            value={drafts.note}
            onChange={(e) => onDraftChange('note', e.target.value)}
            placeholder="Ex. passer à 18h…"
          />
        </Field>
        <div className="mt-3">
          <Button variant="secondary" size="sm" loading={savingTask} onClick={() => void onSaveTask(p)}>
            {savingTask ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      <div className={sectionClass}>
        <p className={`mb-3 ${sectionTitle}`}>Actions</p>
        <div className="flex flex-row flex-wrap items-center gap-2">
          <PaymentLineActions
            p={p}
            zoomed
            sendingId={sendingId}
            onSendReminder={onSendReminder}
            onOpenPartial={onOpenPartial}
            onMarkPaid={onMarkPaid}
          />
        </div>
        {isOverduePayment(p) && formatPhoneForWhatsApp(p.lease.tenant.phone) ? (
          <div className="mt-3 border-t border-[var(--odoo-border)] pt-3">
            <Button
              variant="primarySoft"
              className="w-full sm:w-auto"
              loading={loggingWa}
              onClick={() => void onLogWhatsApp(p)}
            >
              J’ai envoyé une relance WhatsApp — noter ici
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
