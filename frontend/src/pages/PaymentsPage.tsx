import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SmartLink } from '@/components/SmartLink';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { isOverduePayment, monthGroupKey, paymentRemaining, type PaymentRow } from '@/lib/paymentRow';
import { AppPageTitle } from '@/components/AppPageTitle';
import { PaymentLineActions } from '@/components/PaymentLineActions';
import { PaymentZoomModal } from '@/components/PaymentZoomModal';
import { ReturnNavigation } from '@/components/ReturnNavigation';
import { AmountFcfaInput, Button, Card, Label, Select } from '@/components/ui';
import { monthTitle, statusLabel, statusStyle } from '@/lib/paymentStatusUi';
import { unitKindLabel } from '@/lib/unitKind';

const MOIS_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tous les mois' },
  ...Array.from({ length: 12 }, (_, i) => {
    const label = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2000, i, 1));
    return { value: String(i + 1), label: label.charAt(0).toUpperCase() + label.slice(1) };
  }),
];

function IconCalendar({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 2v3M16 2v3M3 9h18" strokeLinecap="round" />
      <rect x="3" y="5" width="18" height="17" rx="2" />
    </svg>
  );
}

function IconLayoutList({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 6h12M9 12h12M9 18h12M5 6h.01M5 12h.01M5 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PaymentsPage() {
  const [params, setParams] = useSearchParams();
  const overdueOnly = params.get('overdue') === '1' || params.get('overdue') === 'true';
  const leaseIdFilter = params.get('leaseId')?.trim() || '';
  const hintTenant = params.get('hintTenant')?.trim() || '';
  const hintPlace = params.get('hintPlace')?.trim() || '';
  const yearParam = params.get('year');
  const monthParam = params.get('month');

  const yearFilter: number | 'all' = useMemo(() => {
    if (yearParam === 'all') return 'all';
    if (yearParam !== null && yearParam !== '') {
      const n = Number(yearParam);
      if (!Number.isNaN(n)) return n;
    }
    return new Date().getFullYear();
  }, [yearParam]);

  const monthFilter: number | 'all' = useMemo(() => {
    if (monthParam === 'all') return 'all';
    if (monthParam !== null && monthParam !== '') {
      const n = Number(monthParam);
      if (Number.isInteger(n) && n >= 1 && n <= 12) return n;
    }
    if (overdueOnly) return 'all';
    return new Date().getMonth() + 1;
  }, [monthParam, overdueOnly]);

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [partialFor, setPartialFor] = useState<PaymentRow | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialErr, setPartialErr] = useState('');
  const [partialSubmitting, setPartialSubmitting] = useState(false);
  const [collapsedMonthKeys, setCollapsedMonthKeys] = useState(() => new Set<string>());
  const [zoomPaymentId, setZoomPaymentId] = useState<string | null>(null);

  const load = useCallback(() => {
    const q = new URLSearchParams();
    if (overdueOnly) q.set('overdue', '1');
    if (leaseIdFilter) q.set('leaseId', leaseIdFilter);
    if (yearFilter !== 'all') q.set('year', String(yearFilter));
    if (monthFilter !== 'all') q.set('month', String(monthFilter));
    const qs = q.toString();
    api<PaymentRow[]>(`/payments${qs ? `?${qs}` : ''}`).then(setRows).catch(() => setRows([]));
  }, [leaseIdFilter, monthFilter, overdueOnly, yearFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const focusPaymentId = params.get('focus');

  useEffect(() => {
    if (!focusPaymentId || rows.length === 0) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(`payment-${focusPaymentId}`);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('ring-2', 'ring-brand-500', 'ring-offset-1', 'rounded-xl');
      window.setTimeout(() => el.classList.remove('ring-2', 'ring-brand-500', 'ring-offset-1', 'rounded-xl'), 2400);
    }, 220);
    return () => clearTimeout(t);
  }, [focusPaymentId, rows]);

  const stats = useMemo(() => {
    let aEncaisser = 0;
    let encaisse = 0;
    let retards = 0;
    let payees = 0;
    let partialLines = 0;
    for (const p of rows) {
      if (p.status === 'PAID') {
        payees += 1;
        encaisse += Number(p.amountPaid ?? p.amountDue);
      } else if (p.status === 'PENDING' || p.status === 'LATE') {
        aEncaisser += paymentRemaining(p);
        encaisse += Number(p.amountPaid ?? 0);
        if (Number(p.amountPaid ?? 0) > 0) partialLines += 1;
        if (isOverduePayment(p)) retards += 1;
      }
    }
    return { total: rows.length, aEncaisser, encaisse, retards, payees, partialLines };
  }, [rows]);

  const monthGroups = useMemo(() => {
    const map = new Map<string, PaymentRow[]>();
    for (const p of rows) {
      const k = monthGroupKey(p);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const byName = `${a.lease.tenant.lastName} ${a.lease.tenant.firstName}`.localeCompare(
          `${b.lease.tenant.lastName} ${b.lease.tenant.firstName}`,
          'fr',
          { sensitivity: 'base' },
        );
        if (byName !== 0) return byName;
        return a.dueDate.localeCompare(b.dueDate);
      });
    }
    return [...map.entries()].sort(([ka], [kb]) => ka.localeCompare(kb));
  }, [rows]);

  const monthKeysSig = useMemo(() => monthGroups.map(([k]) => k).join('\0'), [monthGroups]);

  useLayoutEffect(() => {
    const keys = monthGroups.map(([k]) => k);
    const next = new Set(keys);
    if (focusPaymentId && rows.length > 0) {
      const p = rows.find((r) => r.id === focusPaymentId);
      if (p) next.delete(monthGroupKey(p));
    }
    setCollapsedMonthKeys(next);
  }, [monthKeysSig, focusPaymentId, rows]);

  useEffect(() => {
    if (!zoomPaymentId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomPaymentId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomPaymentId]);

  useEffect(() => {
    if (!zoomPaymentId) return;
    if (!rows.some((r) => r.id === zoomPaymentId)) setZoomPaymentId(null);
  }, [rows, zoomPaymentId]);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => y + 1 - i);
  }, []);

  const periodSummaryLabel = useMemo(() => {
    const y = yearFilter === 'all' ? 'Toutes les années' : String(yearFilter);
    const m =
      monthFilter === 'all'
        ? 'tous les mois'
        : MOIS_SELECT_OPTIONS.find((o) => o.value === String(monthFilter))?.label ?? '';
    return `${y} · ${m}`;
  }, [yearFilter, monthFilter]);

  const leaseFocusSummary = useMemo(() => {
    if (!leaseIdFilter) return null;
    if (rows.length > 0) {
      const l = rows[0]!.lease;
      return {
        tenant: `${l.tenant.firstName} ${l.tenant.lastName}`.trim(),
        place: `${l.unit.building.name} — ${l.unit.label}`,
      };
    }
    if (hintTenant || hintPlace) {
      return { tenant: hintTenant || '—', place: hintPlace || '—' };
    }
    return { tenant: '', place: '' };
  }, [leaseIdFilter, rows, hintTenant, hintPlace]);

  function clearLeaseFilter() {
    setParams(
      (prev) => {
        const q = new URLSearchParams(prev);
        q.delete('leaseId');
        q.delete('hintTenant');
        q.delete('hintPlace');
        return q;
      },
      { replace: true },
    );
  }

  async function markPaid(p: PaymentRow) {
    await api(`/payments/${p.id}`, {
      method: 'PATCH',
      json: {
        status: 'PAID',
        amountPaid: Number(p.amountDue),
        paidAt: new Date().toISOString().slice(0, 10),
      },
    });
    load();
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
    const paymentId = partialFor.id;
    setPartialSubmitting(true);
    setPartialErr('');
    try {
      await api(`/payments/${paymentId}`, {
        method: 'PATCH',
        json: { addAmountPaid: n },
      });
      setPartialFor(null);
      load();
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
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setSendingId(null);
    }
  }

  function paymentLineItems(items: PaymentRow[]) {
    return items.map((p, rowIdx) => (
      <li
        key={p.id}
        id={`payment-${p.id}`}
        className={`grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-x-3 sm:gap-y-2 sm:px-5 ${
          rowIdx < items.length - 1
            ? 'border-b border-slate-200/95 dark:border-slate-600/70'
            : ''
        }`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {p.lease.tenant.firstName} {p.lease.tenant.lastName}
            </p>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyle(p.status)}`}>
              {statusLabel(p.status)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {p.lease.unit.building.commune}, {p.lease.unit.building.city} · {p.lease.unit.building.name} —{' '}
            {unitKindLabel(p.lease.unit.kind)} — {p.lease.unit.label}
          </p>
          <p className="mt-1 text-sm">
            <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">Loyer {fcfa(Number(p.amountDue))}</span>
            {(p.status === 'PENDING' || p.status === 'LATE') && Number(p.amountPaid ?? 0) > 0 && (
              <span className="ml-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                · encaissé {fcfa(Number(p.amountPaid))} · reste {fcfa(paymentRemaining(p))}
              </span>
            )}
            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">échéance {p.dueDate.slice(0, 10)}</span>
            {p.status === 'PAID' && p.paidAt && (
              <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-400">· payé le {p.paidAt.slice(0, 10)}</span>
            )}
          </p>
        </div>
        <div className="flex min-w-0 max-w-full flex-nowrap items-center gap-1.5 self-start overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:justify-end sm:pb-0 [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            title="Vue agrandie — cette échéance"
            aria-label={`Agrandir l'échéance de ${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`}
            onClick={() => setZoomPaymentId(p.id)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-500/40 bg-brand-50/90 text-brand-800 shadow-sm transition hover:bg-brand-100 dark:border-brand-500/35 dark:bg-brand-950/50 dark:text-brand-200 dark:hover:bg-brand-900/45"
          >
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <PaymentLineActions
            p={p}
            zoomed={false}
            compact
            sendingId={sendingId}
            onSendReminder={sendReminderEmail}
            onOpenPartial={openPartialModal}
            onMarkPaid={markPaid}
          />
        </div>
      </li>
    ));
  }

  return (
    <div className="space-y-6">
      <ReturnNavigation fallbackHref="/" fallbackLabel="Tableau de bord" />
      {focusPaymentId ? (
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
          <button
            type="button"
            className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
            onClick={() =>
              setParams(
                (prev) => {
                  const q = new URLSearchParams(prev);
                  q.delete('focus');
                  return q;
                },
                { replace: true },
              )
            }
          >
            Fermer la surbrillance (lien direct)
          </button>
        </p>
      ) : null}
      <header className="border-b border-slate-200/90 pb-6 dark:border-slate-700/80">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <AppPageTitle
              iconTo="/paiements"
              title="Paiements"
              hintTitle="Échéances de loyer uniquement (hors dépôt de garantie). Caution : fiche location. Relances e-mail et WhatsApp."
            />
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {leaseIdFilter ? (
                <>
                  <strong className="font-semibold text-slate-800 dark:text-slate-200">Ce bail uniquement</strong> — échéances
                  filtrées. La caution se gère sur la fiche location.
                </>
              ) : (
                <>Échéances mensuelles, encaissements et relances.</>
              )}
            </p>
            {leaseIdFilter ? (
              <div
                className="mt-4 max-w-2xl rounded-xl border border-brand-200/90 bg-gradient-to-br from-brand-50/95 to-white px-4 py-3.5 shadow-sm dark:border-brand-500/35 dark:from-brand-950/50 dark:to-slate-900/80"
                role="status"
              >
                <p className="text-sm font-semibold text-brand-950 dark:text-brand-100">
                  Paiements / échéances — ce bail seulement
                </p>
                {leaseFocusSummary && (leaseFocusSummary.tenant || leaseFocusSummary.place) ? (
                  <p className="mt-2 text-sm leading-snug text-slate-800 dark:text-slate-200">
                    <span className="font-semibold text-slate-900 dark:text-slate-50">
                      {leaseFocusSummary.tenant || 'Locataire'}
                    </span>
                    {leaseFocusSummary.place ? (
                      <>
                        {' '}
                        · <span className="font-normal">{leaseFocusSummary.place}</span>
                      </>
                    ) : null}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Les lignes listées correspondent uniquement à ce bail (identifiant interne). Si la liste est vide, elles ne
                    sont peut-être pas encore générées pour la période choisie.
                  </p>
                )}
                <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <SmartLink
                    to={`/locations/${leaseIdFilter}`}
                    className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
                  >
                    ← Fiche location de ce bail
                  </SmartLink>
                  <button
                    type="button"
                    className="font-semibold text-slate-700 underline-offset-2 hover:underline dark:text-slate-300"
                    onClick={clearLeaseFilter}
                  >
                    Afficher tous les baux
                  </button>
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <Card className="overflow-hidden !p-0 shadow-[0_1px_3px_rgb(0_0_0/0.06),0_8px_24px_rgb(0_0_0/0.06)] ring-1 ring-slate-900/[0.04] dark:shadow-[0_1px_3px_rgb(0_0_0/0.2)] dark:ring-slate-600/40">
        <div className="flex flex-col gap-1 border-b border-slate-200/90 bg-gradient-to-r from-slate-50/98 via-white to-slate-50/95 px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:px-3 sm:py-2 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900/98 dark:to-slate-900/95">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-600/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              <IconCalendar className="size-3.5" />
            </span>
            <p className="truncate text-[12px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
              Critères d’affichage
            </p>
          </div>
          <p className="min-w-0 truncate text-[10px] font-medium tabular-nums text-slate-500 dark:text-slate-400 sm:max-w-[55%] sm:text-right">
            <span className="text-slate-400 dark:text-slate-500">Vue · </span>
            {periodSummaryLabel}
            {overdueOnly ? (
              <span className="text-amber-700 dark:text-amber-400"> · impayés / retard</span>
            ) : null}
          </p>
        </div>

        <div className="grid gap-2 p-2 sm:p-2.5 lg:grid-cols-12 lg:items-end lg:gap-3">
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              <div>
                <Label htmlFor="payments-year" className="!mb-0.5 !text-[10px] !font-semibold !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300">
                  Année comptable
                </Label>
                <Select
                  id="payments-year"
                  className="min-h-[2rem] border-slate-200 bg-white py-1.5 pl-2.5 pr-9 text-xs font-medium text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-950/80"
                  value={yearFilter === 'all' ? 'all' : String(yearFilter)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setParams((prev) => {
                      const q = new URLSearchParams(prev);
                      if (v === 'all') q.set('year', 'all');
                      else q.set('year', v);
                      return q;
                    });
                  }}
                >
                  <option value="all">Toutes les années</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="payments-month" className="!mb-0.5 !text-[10px] !font-semibold !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300">
                  Mois de facturation
                </Label>
                <Select
                  id="payments-month"
                  className="min-h-[2rem] border-slate-200 bg-white py-1.5 pl-2.5 pr-9 text-xs font-medium text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-950/80"
                  value={monthFilter === 'all' ? 'all' : String(monthFilter)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setParams((prev) => {
                      const q = new URLSearchParams(prev);
                      if (v === 'all') q.set('month', 'all');
                      else q.set('month', v);
                      return q;
                    });
                  }}
                >
                  {MOIS_SELECT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2.5 dark:border-slate-800 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            <div className="mb-1 flex items-center gap-1">
              <IconLayoutList className="size-3 text-slate-400 dark:text-slate-500" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                Statut
              </p>
            </div>
            <div
              className="flex w-full rounded-lg border border-slate-200/95 bg-slate-100/90 p-px shadow-[inset_0_1px_2px_rgb(0_0_0/0.05)] dark:border-slate-600 dark:bg-slate-800/95"
              role="group"
              aria-label="Filtrer par statut de paiement"
            >
              <button
                type="button"
                onClick={() => {
                  setParams((prev) => {
                    const q = new URLSearchParams(prev);
                    q.delete('overdue');
                    return q;
                  });
                }}
                className={`min-h-[2rem] flex-1 rounded-[0.45rem] px-2 py-1 text-center text-[10px] font-semibold leading-tight transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:flex-initial ${
                  !overdueOnly
                    ? 'bg-white text-brand-800 shadow-md ring-1 ring-slate-200/90 dark:bg-brand-600 dark:text-white dark:ring-brand-500/50'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-100'
                }`}
              >
                Tous les statuts
              </button>
              <button
                type="button"
                onClick={() => {
                  setParams((prev) => {
                    const q = new URLSearchParams(prev);
                    q.set('overdue', '1');
                    return q;
                  });
                }}
                className={`min-h-[2rem] flex-1 rounded-[0.45rem] px-2 py-1 text-center text-[10px] font-semibold leading-tight transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 sm:flex-initial ${
                  overdueOnly
                    ? 'bg-white text-amber-950 shadow-md ring-1 ring-amber-200/90 dark:bg-amber-600 dark:text-white dark:ring-amber-400/40'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-100'
                }`}
              >
                Impayés & retard
              </button>
            </div>
            <span className="sr-only">En mode impayés, la liste exclut les échéances soldées.</span>
          </div>
        </div>

        {leaseIdFilter ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/90 bg-slate-50/60 px-2 py-2 sm:px-3 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <span className="inline-flex w-fit max-w-full items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200/95 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-600">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand-500" />
                <span className="truncate" title={leaseFocusSummary?.tenant ?? undefined}>
                  Filtre actif ·{' '}
                  {leaseFocusSummary?.tenant
                    ? `paiements de ${leaseFocusSummary.tenant}`
                    : 'un seul bail (loyers)'}
                </span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {leaseFocusSummary?.place ? (
                  <span className="line-clamp-2 sm:line-clamp-1" title={leaseFocusSummary.place}>
                    {leaseFocusSummary.place}
                  </span>
                ) : (
                  'Les autres locations sont masquées.'
                )}
              </span>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
              onClick={clearLeaseFilter}
            >
              Réinitialiser le filtre
            </button>
          </div>
        ) : null}
      </Card>

      {rows.length > 0 && (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Synthèse (filtre actif)
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="relative !overflow-hidden !border-slate-200/90 !p-5 !pt-6 shadow-sm dark:!border-slate-600/80">
              <span className="absolute left-0 right-0 top-0 h-1 bg-slate-400/80 dark:bg-slate-500" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Échéances</p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                {stats.total}
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Lignes affichées</p>
            </Card>
            <Card className="relative !overflow-hidden !border-slate-200/90 !p-5 !pt-6 shadow-sm dark:!border-slate-600/80">
              <span className="absolute left-0 right-0 top-0 h-1 bg-amber-500" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Reste à encaisser (loyers)</p>
              <p className="mt-2 text-2xl font-bold tabular-nums leading-tight tracking-tight text-amber-950 dark:text-amber-100 sm:text-3xl">
                {fcfa(stats.aEncaisser)}
              </p>
              {stats.retards > 0 ? (
                <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{stats.retards} en retard</p>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Aucun retard dans cette vue</p>
              )}
            </Card>
            <Card className="relative !overflow-hidden !border-slate-200/90 !p-5 !pt-6 shadow-sm dark:!border-slate-600/80">
              <span className="absolute left-0 right-0 top-0 h-1 bg-emerald-500" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Encaissé (loyers)</p>
              <p className="mt-2 text-2xl font-bold tabular-nums leading-tight tracking-tight text-emerald-950 dark:text-emerald-100 sm:text-3xl">
                {fcfa(stats.encaisse)}
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {stats.payees} soldée{stats.payees !== 1 ? 's' : ''}
                {stats.partialLines > 0 ? ` · ${stats.partialLines} acompte${stats.partialLines !== 1 ? 's' : ''}` : ''}
                <span className="mt-1 block">
                  Hors caution —{' '}
                  <Link to="/cautions" className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
                    cautions encaissées
                  </Link>
                  .
                </span>
              </p>
            </Card>
            <Card className="relative !overflow-hidden !border-slate-200/90 !p-5 !pt-6 shadow-sm dark:!border-slate-600/80">
              <span className="absolute left-0 right-0 top-0 h-1 bg-brand-500" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Regroupement</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 sm:text-3xl">
                {monthGroups.length} mois
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Par mois de facturation</p>
            </Card>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {monthGroups.length > 0 ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
              onClick={() => setCollapsedMonthKeys(new Set(monthGroups.map(([k]) => k)))}
            >
              Tout replier
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
              onClick={() => setCollapsedMonthKeys(new Set())}
            >
              Tout déplier
            </button>
          </div>
        ) : null}
        {monthGroups.map(([key, items]) => {
          const [yStr, mStr] = key.split('-');
          const py = Number(yStr);
          const pm = Number(mStr);
          const monthDue = items.reduce((acc, p) => acc + Number(p.amountDue), 0);
          const monthPending = items.filter((p) => p.status === 'PENDING' || p.status === 'LATE');
          const monthPendingSum = monthPending.reduce((acc, p) => acc + paymentRemaining(p), 0);
          const overdueInMonth = items.filter((p) => isOverduePayment(p)).length;
          const monthCollapsed = collapsedMonthKeys.has(key);

          return (
            <Card key={key} className="!p-0 overflow-hidden">
              <button
                type="button"
                aria-expanded={!monthCollapsed}
                aria-controls={`payments-month-body-${key}`}
                id={`payments-month-head-${key}`}
                onClick={() =>
                  setCollapsedMonthKeys((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  })
                }
                className="relative z-10 flex w-full items-start gap-3 border-b border-slate-200/90 bg-gradient-to-r from-slate-100/90 to-slate-50/95 px-4 py-3 text-left transition hover:from-slate-100 hover:to-slate-50/90 sm:px-5 dark:border-slate-700 dark:from-slate-800/95 dark:to-slate-900/98 dark:hover:from-slate-800 dark:hover:to-slate-900/95"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{monthTitle(py, pm)}</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {items.length} échéance{items.length !== 1 ? 's' : ''} · {fcfa(monthDue)} au total
                    {monthPending.length > 0 && (
                      <span className="font-medium text-amber-900 dark:text-amber-300">
                        {' '}
                        · {fcfa(monthPendingSum)} encore dû{monthPending.length !== 1 ? 'es' : ''}
                      </span>
                    )}
                    {overdueInMonth > 0 && (
                      <span className="font-medium text-red-800 dark:text-red-300"> · {overdueInMonth} en retard</span>
                    )}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-500">
                    Cliquer pour déplier · Zoom sur chaque ligne (icône loupe)
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-start">
                  <span className="rounded-lg bg-slate-100/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200/90 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600">
                    Période {String(pm).padStart(2, '0')}/{py}
                  </span>
                  <svg
                    className={`size-5 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${monthCollapsed ? '' : 'rotate-180'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
              <ul id={`payments-month-body-${key}`} className="list-none" hidden={monthCollapsed}>
                {paymentLineItems(items)}
              </ul>
            </Card>
          );
        })}
      </div>

      <PaymentZoomModal paymentId={zoomPaymentId} onClose={() => setZoomPaymentId(null)} onUpdated={load} />

      {rows.length === 0 && (
        <Card className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Aucune échéance pour ce filtre. Essayez une autre année, un autre mois, ou « Toutes les années » / « Tous les
          mois ».
        </Card>
      )}

      {partialFor ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="partial-pay-title"
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
                <strong className="tabular-nums text-slate-800 dark:text-slate-200">
                  {fcfa(paymentRemaining(partialFor))}
                </strong>
              </span>
            </p>
            <div className="mt-4">
              <Label htmlFor="partial-amount">Montant du versement</Label>
              <AmountFcfaInput
                id="partial-amount"
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
              <Button
                type="button"
                className="py-2 text-xs"
                disabled={partialSubmitting}
                onClick={() => void submitPartial()}
              >
                {partialSubmitting ? 'Enregistrement…' : 'Enregistrer le versement'}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
