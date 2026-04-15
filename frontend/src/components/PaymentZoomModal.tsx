import { useCallback, useEffect, useState } from 'react';
import { SmartLink } from '@/components/SmartLink';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { paymentRemaining, type PaymentRow } from '@/lib/paymentRow';
import { monthTitle, statusLabel, statusStyle } from '@/lib/paymentStatusUi';
import { unitKindLabel } from '@/lib/unitKind';
import { PaymentLineActions } from '@/components/PaymentLineActions';
import { AmountFcfaInput, Button, Card, Label } from '@/components/ui';

export type PaymentZoomModalProps = {
  paymentId: string | null;
  onClose: () => void;
  /** Rafraîchir les données parent (liste Paiements, tableau de bord, etc.) */
  onUpdated?: () => void;
};

export function PaymentZoomModal({ paymentId, onClose, onUpdated }: PaymentZoomModalProps) {
  const [row, setRow] = useState<PaymentRow | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [partialFor, setPartialFor] = useState<PaymentRow | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialErr, setPartialErr] = useState('');
  const [partialSubmitting, setPartialSubmitting] = useState(false);

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
    if (!paymentId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paymentId, onClose]);

  async function markPaid(p: PaymentRow) {
    await api(`/payments/${p.id}`, {
      method: 'PATCH',
      json: {
        status: 'PAID',
        amountPaid: Number(p.amountDue),
        paidAt: new Date().toISOString().slice(0, 10),
      },
    });
    await reloadRow();
    onUpdated?.();
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
      alert(res.message ?? 'Relance envoyée.');
      await reloadRow();
      onUpdated?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setSendingId(null);
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
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-50">{p.dueDate.slice(0, 10)}</p>
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
                <p className="mt-1 text-sm font-semibold text-emerald-900 dark:text-emerald-200">Payé le {p.paidAt.slice(0, 10)}</p>
              </div>
            ) : null}
            {p.status === 'WAIVED' ? (
              <div className="sm:col-span-2 rounded-xl border border-violet-200/90 bg-violet-50/80 px-3 py-3 dark:border-violet-800/45 dark:bg-violet-950/30">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
                  Gratuité de loyer
                </p>
                {p.waivedAt ? (
                  <p className="mt-1 text-sm font-semibold text-violet-900 dark:text-violet-200">
                    Enregistrée le {String(p.waivedAt).slice(0, 10)}
                  </p>
                ) : null}
                {p.waiveReason?.trim() ? (
                  <p className="mt-2 text-sm font-medium leading-snug text-violet-950 dark:text-violet-100">{p.waiveReason}</p>
                ) : null}
              </div>
            ) : null}
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
        </div>
      </article>
    );
  }

  if (!paymentId) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[95] flex items-end justify-center p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-zoom-modal-title"
        data-escape-modal="true"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
          aria-label="Fermer la vue agrandie"
          onClick={onClose}
        />
        <div className="relative flex max-h-[min(94dvh,960px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-slate-100/50 shadow-2xl dark:border-slate-600 dark:bg-slate-950 sm:rounded-2xl">
          <div className="shrink-0 border-b border-slate-200/90 bg-gradient-to-br from-white via-slate-50/95 to-slate-100/90 px-5 py-5 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/90">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Vue agrandie — une échéance
                </p>
                <h2
                  id="payment-zoom-modal-title"
                  className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl"
                >
                  {row ? (
                    <>
                      {row.lease.tenant.firstName} {row.lease.tenant.lastName}
                    </>
                  ) : (
                    'Chargement…'
                  )}
                </h2>
                {row ? (
                  <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                    {monthTitle(row.periodYear, row.periodMonth)} · facturation {String(row.periodMonth).padStart(2, '0')}/
                    {row.periodYear}
                  </p>
                ) : null}
              </div>
              <Button type="button" variant="secondary" className="shrink-0 py-2.5 text-sm font-semibold" onClick={onClose}>
                Fermer
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-6">
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
