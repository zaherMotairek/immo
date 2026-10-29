import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartLink } from '@/components/SmartLink';
import { api } from '@/lib/api';
import type { PaymentRow } from '@/lib/paymentRow';
import { monthTitle } from '@/lib/paymentStatusUi';
import { OdooSheetHeader } from '@/components/OdooKit';
import { PaymentPartialDialog } from '@/components/PaymentPartialDialog';
import { PaymentZoomCollection } from '@/components/PaymentZoomCollection';
import type { CollectorOpt, ZoomDrafts } from '@/components/PaymentZoomCollection';
import { PaymentZoomSummary } from '@/components/PaymentZoomSummary';
import { usePartialPayment } from '@/components/usePartialPayment';
import { Callout } from '@/components/ui/index';
import { toast } from '@/components/ui/Toast';

export type PaymentZoomModalProps = {
  paymentId: string | null;
  onClose: () => void;
  /** Rafraîchir les données parent (liste Paiements, tableau de bord, etc.) */
  onUpdated?: () => void;
};

/** Durée alignée sur les classes Tailwind (zoom scale + fondu). */
const SHEET_TRANSITION_MS = 480;

const EMPTY_DRAFTS: ZoomDrafts = { method: '', reference: '', collectorId: '', note: '' };

export function PaymentZoomModal({ paymentId, onClose, onUpdated }: PaymentZoomModalProps) {
  const [sheetEntered, setSheetEntered] = useState(false);
  const closeAnimLock = useRef(false);

  const [row, setRow] = useState<PaymentRow | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<ZoomDrafts>(EMPTY_DRAFTS);
  const [savingCollection, setSavingCollection] = useState(false);
  const [loggingWa, setLoggingWa] = useState(false);
  const [collectors, setCollectors] = useState<CollectorOpt[]>([]);
  const [savingTask, setSavingTask] = useState(false);

  const reloadRow = useCallback(() => {
    if (!paymentId) return Promise.resolve();
    return api<PaymentRow>(`/payments/${paymentId}`)
      .then(setRow)
      .catch(() => {});
  }, [paymentId]);

  const partial = usePartialPayment(async () => {
    await reloadRow();
    onUpdated?.();
  });
  const { partialFor, partialSubmitting } = partial;

  useEffect(() => {
    if (!paymentId) {
      setRow(null);
      setFetchErr(null);
      return;
    }
    let cancelled = false;
    setFetchErr(null);
    setRow(null);
    api<PaymentRow>(`/payments/${paymentId}`)
      .then((r) => {
        if (!cancelled) setRow(r);
      })
      .catch((e) => {
        if (!cancelled) setFetchErr(e instanceof Error ? e.message : 'Chargement impossible.');
      });
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  useEffect(() => {
    if (!row) return;
    setDrafts({
      method: row.collectionMethod ?? '',
      reference: row.collectionReference ?? '',
      collectorId: row.collectionTask?.collectorId ?? '',
      note: row.collectionTask?.lastNote ?? '',
    });
  }, [row]);

  useEffect(() => {
    if (!paymentId) return;
    api<CollectorOpt[]>('/collectors')
      .then((r) => setCollectors(r.filter((x) => x.active)))
      .catch(() => setCollectors([]));
  }, [paymentId]);

  const closeAnimated = useCallback(() => {
    if (closeAnimLock.current) return;
    closeAnimLock.current = true;
    setSheetEntered(false);
    window.setTimeout(() => {
      onClose();
      closeAnimLock.current = false;
    }, SHEET_TRANSITION_MS);
  }, [onClose]);

  /** Entrée : une frame en scale réduit puis zoom vers 100 %. */
  useEffect(() => {
    if (!paymentId) return;
    setSheetEntered(false);
    const tid = window.setTimeout(() => setSheetEntered(true), 32);
    return () => window.clearTimeout(tid);
  }, [paymentId]);

  useEffect(() => {
    if (!paymentId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (partialFor || partialSubmitting) return;
      closeAnimated();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paymentId, partialFor, partialSubmitting, closeAnimated]);

  useEffect(() => {
    if (!paymentId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [paymentId]);

  async function markPaid(p: PaymentRow) {
    const json: Record<string, unknown> = {
      status: 'PAID',
      amountPaid: Number(p.amountDue),
      paidAt: new Date().toISOString().slice(0, 10),
    };
    if (drafts.method) json.collectionMethod = drafts.method;
    if (drafts.reference.trim()) json.collectionReference = drafts.reference.trim();
    await api(`/payments/${p.id}`, { method: 'PATCH', json });
    await reloadRow();
    onUpdated?.();
  }

  async function saveCollectionMeta(p: PaymentRow) {
    setSavingCollection(true);
    try {
      await api(`/payments/${p.id}`, {
        method: 'PATCH',
        json: {
          collectionMethod: drafts.method || null,
          collectionReference: drafts.reference.trim() || null,
        },
      });
      await reloadRow();
      onUpdated?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Enregistrement impossible.', { variant: 'error' });
    } finally {
      setSavingCollection(false);
    }
  }

  async function logWhatsAppReminder(p: PaymentRow) {
    setLoggingWa(true);
    try {
      await api(`/payments/${p.id}/reminders`, {
        method: 'POST',
        json: { channel: 'WHATSAPP' },
      });
      await reloadRow();
      onUpdated?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Enregistrement impossible.', { variant: 'error' });
    } finally {
      setLoggingWa(false);
    }
  }

  async function sendReminderEmail(p: PaymentRow) {
    setSendingId(p.id);
    try {
      const res = await api<{ ok: boolean; message?: string }>(`/payments/${p.id}/send-reminder`, {
        method: 'POST',
      });
      toast(res.message ?? 'Relance envoyée.', { variant: 'success' });
      await reloadRow();
      onUpdated?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Envoi impossible.', { variant: 'error' });
    } finally {
      setSendingId(null);
    }
  }

  async function saveCollectionTask(p: PaymentRow) {
    setSavingTask(true);
    try {
      const res = await api<PaymentRow & { collectorNotifyUrl?: string }>(`/payments/${p.id}/collection`, {
        method: 'POST',
        json: {
          collectorId: drafts.collectorId || null,
          note: drafts.note.trim() || null,
        },
      });
      if (res.collectorNotifyUrl) {
        window.open(res.collectorNotifyUrl, '_blank', 'noopener,noreferrer');
      }
      await reloadRow();
      onUpdated?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Mise à jour collecte impossible.', { variant: 'error' });
    } finally {
      setSavingTask(false);
    }
  }

  if (!paymentId) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:px-4 sm:py-5 lg:px-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-zoom-modal-title"
        data-escape-modal="true"
      >
        <button
          type="button"
          className={`payment-detail-backdrop absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-[480ms] ease-out ${
            sheetEntered ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Fermer le détail du paiement"
          onClick={closeAnimated}
        />
        <div
          className={`payment-detail-sheet relative z-10 flex max-h-[min(94dvh,48rem)] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-sheet)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] shadow-[var(--shadow-lift)] transition-[transform,opacity] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-zinc-700 sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl ${
            sheetEntered ? 'scale-100 opacity-100' : 'scale-[0.92] opacity-0'
          }`}
        >
          <OdooSheetHeader
            kicker="Détail du paiement"
            titleId="payment-zoom-modal-title"
            title={
              row ? (
                <>
                  {row.lease.tenant.firstName} {row.lease.tenant.lastName}
                </>
              ) : (
                'Chargement…'
              )
            }
            subtitle={
              row ? (
                <>
                  {monthTitle(row.periodYear, row.periodMonth)} · {String(row.periodMonth).padStart(2, '0')}/{row.periodYear}
                </>
              ) : undefined
            }
            onClose={closeAnimated}
          />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5">
            {fetchErr ? (
              <Callout variant="danger">{fetchErr}</Callout>
            ) : row ? (
              <>
                <article className="overflow-hidden rounded-[var(--radius-sheet)] border border-[var(--odoo-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
                  <PaymentZoomSummary p={row} />
                  <PaymentZoomCollection
                    p={row}
                    collectors={collectors}
                    drafts={drafts}
                    onDraftChange={(field, value) => setDrafts((d) => ({ ...d, [field]: value }))}
                    savingCollection={savingCollection}
                    savingTask={savingTask}
                    loggingWa={loggingWa}
                    sendingId={sendingId}
                    onSaveCollection={saveCollectionMeta}
                    onSaveTask={saveCollectionTask}
                    onLogWhatsApp={logWhatsAppReminder}
                    onSendReminder={sendReminderEmail}
                    onOpenPartial={partial.openPartial}
                    onMarkPaid={markPaid}
                  />
                </article>
                <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
                  <SmartLink
                    to={`/paiements?focus=${row.id}&overdue=1&year=all&month=all`}
                    className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                  >
                    Ouvrir aussi dans Paiements
                  </SmartLink>
                </p>
              </>
            ) : (
              <p className="text-center text-sm text-[var(--color-muted)]">Chargement de l’échéance…</p>
            )}
          </div>
        </div>
      </div>

      <PaymentPartialDialog state={partial} idPrefix="payment-zoom-partial" />
    </>
  );
}
