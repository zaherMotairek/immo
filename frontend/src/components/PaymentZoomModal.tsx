import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartLink } from '@/components/SmartLink';
import { api } from '@/lib/api';
import { fcfa, formatDateFr } from '@/lib/format';
import { isOverduePayment, paymentRemaining, type PaymentRow } from '@/lib/paymentRow';
import { monthTitle, statusLabel, statusStyle } from '@/lib/paymentStatusUi';
import { unitKindLabel } from '@/lib/unitKind';
import { PaymentLineActions } from '@/components/PaymentLineActions';
import { OdooSheetHeader } from '@/components/OdooKit';
import { AmountFcfaInput, Button, Card, Input, Label } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { COLLECTION_METHOD_OPTIONS, reminderChannelLabel } from '@/lib/collectionMethodUi';
import { formatPhoneForWhatsApp } from '@/lib/whatsappReminder';

export type PaymentZoomModalProps = {
  paymentId: string | null;
  onClose: () => void;
  /** Rafraîchir les données parent (liste Paiements, tableau de bord, etc.) */
  onUpdated?: () => void;
};

type CollectorOpt = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
};

/** Durée alignée sur les classes Tailwind du panneau et du backdrop (slide + fondu). */
const SHEET_TRANSITION_MS = 480;

export function PaymentZoomModal({ paymentId, onClose, onUpdated }: PaymentZoomModalProps) {
  const [sheetEntered, setSheetEntered] = useState(false);
  const closeAnimLock = useRef(false);

  const [row, setRow] = useState<PaymentRow | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [partialFor, setPartialFor] = useState<PaymentRow | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialErr, setPartialErr] = useState('');
  const [partialSubmitting, setPartialSubmitting] = useState(false);

  const [methodDraft, setMethodDraft] = useState('');
  const [refDraft, setRefDraft] = useState('');
  const [savingCollection, setSavingCollection] = useState(false);
  const [loggingWa, setLoggingWa] = useState(false);
  const [collectors, setCollectors] = useState<CollectorOpt[]>([]);
  const [collectorIdDraft, setCollectorIdDraft] = useState('');
  const [collectionNoteDraft, setCollectionNoteDraft] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  const reloadRow = useCallback(() => {
    if (!paymentId) return Promise.resolve();
    return api<PaymentRow>(`/payments/${paymentId}`)
      .then(setRow)
      .catch(() => {});
  }, [paymentId]);

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
    setMethodDraft(row.collectionMethod ?? '');
    setRefDraft(row.collectionReference ?? '');
    setCollectorIdDraft(row.collectionTask?.collectorId ?? '');
    setCollectionNoteDraft(row.collectionTask?.lastNote ?? '');
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

  /** Entrée : une frame hors écran puis slide-in (effet « sheet » type Shadcn). */
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
    if (methodDraft) json.collectionMethod = methodDraft;
    if (refDraft.trim()) json.collectionReference = refDraft.trim();
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
          collectionMethod: methodDraft || null,
          collectionReference: refDraft.trim() || null,
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

  function openPartialModal(p: PaymentRow) {
    const remaining = paymentRemaining(p);
    if (remaining <= 0) return;
    setPartialFor(p);
    setPartialAmount(String(Math.max(1, Math.round(remaining))));
    setPartialErr('');
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
      await reloadRow();
      onUpdated?.();
    } catch (e) {
      setPartialErr(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setPartialSubmitting(false);
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
          collectorId: collectorIdDraft || null,
          note: collectionNoteDraft.trim() || null,
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

  function renderZoomPaymentCard(p: PaymentRow) {
    const rem = paymentRemaining(p);
    const paid = Number(p.amountPaid ?? 0);
    const showPartiel = (p.status === 'PENDING' || p.status === 'LATE') && paid > 0;
    return (
      <article className="overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-md ring-1 ring-slate-900/[0.04] dark:border-slate-600 dark:bg-slate-900 dark:ring-white/[0.06]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/90 bg-slate-50/95 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/60 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Locataire</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {p.lease.tenant.firstName} {p.lease.tenant.lastName}
              </p>
              <span className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${statusStyle(p.status)}`}>
                {statusLabel(p.status)}
              </span>
            </div>
          </div>
          <p className="shrink-0 rounded-lg bg-slate-200/70 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-slate-700 dark:bg-slate-700/80 dark:text-slate-300">
            {String(p.periodMonth).padStart(2, '0')}/{p.periodYear}
          </p>
        </div>

        <div className="px-4 py-4 sm:px-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Bien & lot</p>
          <div className="mt-2 space-y-1.5 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-3 text-sm leading-snug dark:border-slate-600/80 dark:bg-slate-800/40">
            <p className="text-slate-800 dark:text-slate-100">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Adresse · </span>
              {p.lease.unit.building.commune}, {p.lease.unit.building.city}
            </p>
            <p className="text-slate-800 dark:text-slate-100">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Site · </span>
              {p.lease.unit.building.name}
            </p>
            <p className="text-slate-800 dark:text-slate-100">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Lot · </span>
              {unitKindLabel(p.lease.unit.kind)} — {p.lease.unit.label}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200/80 bg-slate-50/40 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/25 sm:px-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Montants & dates</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-3 dark:border-slate-600 dark:bg-slate-900/80">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Loyer dû</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">{fcfa(Number(p.amountDue))}</p>
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-3 dark:border-slate-600 dark:bg-slate-900/80">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Date d&apos;échéance</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-50">{formatDateFr(p.dueDate)}</p>
            </div>
            {showPartiel ? (
              <>
                <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/80 px-3 py-3 dark:border-emerald-800/50 dark:bg-emerald-950/30">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Encaissé</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-emerald-900 dark:text-emerald-200">{fcfa(paid)}</p>
                </div>
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 px-3 py-3 dark:border-amber-800/50 dark:bg-amber-950/35">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-300">Reste à payer</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-amber-950 dark:text-amber-100">{fcfa(rem)}</p>
                </div>
              </>
            ) : null}
            {p.status === 'PAID' && p.paidAt ? (
              <div className="sm:col-span-2 rounded-xl border border-emerald-200/90 bg-emerald-50/70 px-3 py-3 dark:border-emerald-800/40 dark:bg-emerald-950/25">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Paiement enregistré</p>
                <p className="mt-1 text-sm font-semibold text-emerald-900 dark:text-emerald-200">Payé le {formatDateFr(p.paidAt)}</p>
              </div>
            ) : null}
            {p.status === 'WAIVED' ? (
              <div className="sm:col-span-2 rounded-xl border border-violet-200/90 bg-violet-50/80 px-3 py-3 dark:border-violet-800/45 dark:bg-violet-950/30">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
                  Gratuité de loyer
                </p>
                {p.waivedAt ? (
                  <p className="mt-1 text-sm font-semibold text-violet-900 dark:text-violet-200">
                    Enregistrée le {formatDateFr(p.waivedAt)}
                  </p>
                ) : null}
                {p.waiveReason?.trim() ? (
                  <p className="mt-2 text-sm font-medium leading-snug text-violet-950 dark:text-violet-100">{p.waiveReason}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-slate-200/90 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/95 sm:px-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Encaissement (sans compte bancaire relié)
          </p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Espèces, Orange Money, Wave, virement… + référence libre (n° opération).
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1 sm:max-w-[13rem]">
              <Label htmlFor="zoom-pay-method">Mode</Label>
              <select
                id="zoom-pay-method"
                className="mt-1 w-full min-h-11 rounded-[var(--radius-input)] border border-slate-200/95 bg-white px-3 text-sm font-medium text-slate-900 shadow-[0_1px_2px_rgb(15_23_42/0.04)] dark:border-slate-600 dark:bg-slate-950/50 dark:text-slate-50"
                value={methodDraft}
                onChange={(e) => setMethodDraft(e.target.value)}
              >
                {COLLECTION_METHOD_OPTIONS.map((o) => (
                  <option key={o.value === '' ? '_' : o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0 flex-[2] sm:max-w-md">
              <Label htmlFor="zoom-pay-ref">Référence</Label>
              <Input
                id="zoom-pay-ref"
                className="mt-1 min-h-11 text-sm"
                value={refDraft}
                onChange={(e) => setRefDraft(e.target.value)}
                placeholder="Ex. ID opérateur, libellé virement…"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full shrink-0 sm:w-auto"
              disabled={savingCollection}
              onClick={() => void saveCollectionMeta(p)}
            >
              {savingCollection ? '…' : 'Enregistrer'}
            </Button>
          </div>
          {p.reminders && p.reminders.length > 0 ? (
            <div className="mt-3 rounded-lg border border-slate-200/90 bg-slate-50/90 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/50">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Relances notées
              </p>
              <ul className="mt-1 max-h-28 space-y-0.5 overflow-y-auto text-xs text-slate-700 dark:text-slate-300">
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

        <div className="border-t border-slate-200/90 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900/95 sm:px-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Collecte terrain</p>
          <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">
            Choisissez un collecteur puis enregistrez : un message WhatsApp s’ouvre tout seul pour lui. Sans collecteur, rien n’est
            envoyé. Quand l’argent est rentré, utilisez « Marquer payé » plus bas.
          </p>
          <div>
            <Label htmlFor="zoom-collector-id">Collecteur</Label>
            <select
              id="zoom-collector-id"
              className="mt-1 w-full min-h-11 rounded-[var(--radius-input)] border border-slate-200/95 bg-white px-3 text-sm font-medium text-slate-900 shadow-[0_1px_2px_rgb(15_23_42/0.04)] dark:border-slate-600 dark:bg-slate-950/50 dark:text-slate-50"
              value={collectorIdDraft}
              onChange={(e) => setCollectorIdDraft(e.target.value)}
            >
              <option value="">— Aucun —</option>
              {collectors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phone}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <Label htmlFor="zoom-collection-note">Note pour le collecteur (optionnel)</Label>
            <Input
              id="zoom-collection-note"
              className="mt-1 min-h-11 text-sm"
              value={collectionNoteDraft}
              onChange={(e) => setCollectionNoteDraft(e.target.value)}
              placeholder="Ex. passer à 18h…"
            />
          </div>
          <div className="mt-3">
            <Button type="button" variant="secondary" className="py-2 text-xs" disabled={savingTask} onClick={() => void saveCollectionTask(p)}>
              {savingTask ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>

        <div className="border-t border-slate-200/90 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900/95 sm:px-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Actions</p>
          <div className="flex flex-row flex-wrap items-center gap-2">
            <PaymentLineActions
              p={p}
              zoomed
              sendingId={sendingId}
              onSendReminder={sendReminderEmail}
              onOpenPartial={openPartialModal}
              onMarkPaid={markPaid}
            />
          </div>
          {isOverduePayment(p) && formatPhoneForWhatsApp(p.lease.tenant.phone) ? (
            <div className="mt-3 border-t border-slate-200/80 pt-3 dark:border-slate-600">
              <Button
                type="button"
                variant="primarySoft"
                className="w-full min-h-10 py-2 text-xs sm:inline-flex sm:w-auto"
                disabled={loggingWa}
                onClick={() => void logWhatsAppReminder(p)}
              >
                {loggingWa ? '…' : 'J’ai envoyé une relance WhatsApp — noter ici'}
              </Button>
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  if (!paymentId) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[95]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-zoom-modal-title"
        data-escape-modal="true"
      >
        <button
          type="button"
          className={`payment-detail-backdrop absolute inset-0 bg-black/45 backdrop-blur-[1px] transition-opacity duration-[480ms] ease-out ${
            sheetEntered ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Fermer le panneau de détail"
          onClick={closeAnimated}
        />
        <div
          className={`payment-detail-sheet absolute inset-x-0 bottom-0 z-10 flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-neutral-200 bg-neutral-100 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.3)] transition-transform duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-zinc-700 dark:bg-zinc-950 sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:max-w-lg sm:rounded-none sm:border-l sm:border-t-0 sm:shadow-[-8px_0_40px_-12px_rgba(0,0,0,0.25)] ${
            sheetEntered ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-y-0 sm:translate-x-full'
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
              <p className="text-center text-sm text-red-600 dark:text-red-400">{fetchErr}</p>
            ) : row ? (
              <>
                {renderZoomPaymentCard(row)}
                <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  <SmartLink
                    to={`/paiements?focus=${row.id}&overdue=1&year=all&month=all`}
                    className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                  >
                    Ouvrir aussi dans Paiements
                  </SmartLink>
                </p>
              </>
            ) : (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">Chargement de l’échéance…</p>
            )}
          </div>
        </div>
      </div>

      {partialFor ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="partial-pay-title"
          data-escape-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !partialSubmitting) setPartialFor(null);
          }}
        >
          <Card className="w-full max-w-md !p-5 shadow-2xl">
            <h2 id="partial-pay-title" className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Versement partiel
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {partialFor.lease.tenant.firstName} {partialFor.lease.tenant.lastName} —{' '}
              {String(partialFor.periodMonth).padStart(2, '0')}/{partialFor.periodYear}
              <span className="mt-1 block">
                Reste à payer :{' '}
                <strong className="tabular-nums text-slate-800 dark:text-slate-200">{fcfa(paymentRemaining(partialFor))}</strong>
              </span>
            </p>
            <div className="mt-4">
              <Label htmlFor="payment-zoom-partial-amount">Montant du versement</Label>
              <AmountFcfaInput
                id="payment-zoom-partial-amount"
                autoFocus
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                min={1}
                max={Math.max(1, Math.ceil(paymentRemaining(partialFor)))}
                step={1}
              />
            </div>
            {partialErr ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{partialErr}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="py-2 text-xs"
                disabled={partialSubmitting}
                onClick={() => setPartialFor(null)}
              >
                Annuler
              </Button>
              <Button type="button" className="py-2 text-xs" disabled={partialSubmitting} onClick={() => void submitPartial()}>
                {partialSubmitting ? 'Enregistrement…' : 'Enregistrer le versement'}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
