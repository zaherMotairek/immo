import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { Button, Card, Label, Select } from '@/components/ui';
import { unitKindLabel } from '@/lib/unitKind';
import {
  formatPhoneForWhatsApp,
  overdueReminderWhatsAppText,
  whatsAppWebUrl,
} from '@/lib/whatsappReminder';

type PaymentRow = {
  id: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  status: string;
  amountDue: unknown;
  amountPaid: unknown | null;
  paidAt: string | null;
  lease: {
    tenant: { firstName: string; lastName: string; email: string | null; phone: string | null };
    unit: { label: string; kind: string; building: { name: string; commune: string; city: string } };
  };
};

function isOverduePayment(p: PaymentRow) {
  if (p.status === 'LATE') return true;
  if (p.status !== 'PENDING') return false;
  const d = p.dueDate.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return d < today;
}

function monthGroupKey(p: PaymentRow) {
  return `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`;
}

function monthTitle(periodYear: number, periodMonth: number) {
  const raw = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
    new Date(periodYear, periodMonth - 1, 1),
  );
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function statusStyle(status: string) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-100 text-emerald-900';
    case 'LATE':
      return 'bg-red-100 text-red-900';
    case 'PENDING':
      return 'bg-amber-100 text-amber-900';
    case 'CANCELLED':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'PAID':
      return 'Payé';
    case 'LATE':
      return 'En retard';
    case 'PENDING':
      return 'À venir';
    case 'CANCELLED':
      return 'Annulé';
    default:
      return status;
  }
}

const MOIS_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tous les mois' },
  ...Array.from({ length: 12 }, (_, i) => {
    const label = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2000, i, 1));
    return { value: String(i + 1), label: label.charAt(0).toUpperCase() + label.slice(1) };
  }),
];

export function PaymentsPage() {
  const [params, setParams] = useSearchParams();
  const overdueOnly = params.get('overdue') === '1' || params.get('overdue') === 'true';
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
    if (monthParam === null || monthParam === '' || monthParam === 'all') return 'all';
    const n = Number(monthParam);
    if (Number.isInteger(n) && n >= 1 && n <= 12) return n;
    return 'all';
  }, [monthParam]);

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(() => {
    const q = new URLSearchParams();
    if (overdueOnly) q.set('overdue', '1');
    if (yearFilter !== 'all') q.set('year', String(yearFilter));
    if (monthFilter !== 'all') q.set('month', String(monthFilter));
    const qs = q.toString();
    api<PaymentRow[]>(`/payments${qs ? `?${qs}` : ''}`).then(setRows).catch(() => setRows([]));
  }, [monthFilter, overdueOnly, yearFilter]);

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
    }, 120);
    return () => clearTimeout(t);
  }, [focusPaymentId, rows]);

  const stats = useMemo(() => {
    let aEncaisser = 0;
    let encaisse = 0;
    let retards = 0;
    let payees = 0;
    for (const p of rows) {
      if (p.status === 'PAID') {
        payees += 1;
        encaisse += Number(p.amountPaid ?? p.amountDue);
      } else if (p.status === 'PENDING' || p.status === 'LATE') {
        aEncaisser += Number(p.amountDue);
        if (isOverduePayment(p)) retards += 1;
      }
    }
    return { total: rows.length, aEncaisser, encaisse, retards, payees };
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
    /** Ordre calendaire : janvier → décembre, puis années croissantes (ex. 2025-01 … 2026-12). */
    return [...map.entries()].sort(([ka], [kb]) => ka.localeCompare(kb));
  }, [rows]);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => y + 1 - i);
  }, []);

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

  async function sendReminderEmail(p: PaymentRow) {
    setSendingId(p.id);
    try {
      const res = await api<{ ok: boolean; message?: string }>(`/payments/${p.id}/send-reminder`, {
        method: 'POST',
      });
      alert(res.message ?? 'Relance envoyée.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paiements</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Échéances par <strong>mois de période</strong>, dans l’ordre du calendrier (janvier → décembre). Filtrez par
            année et par mois pour contrôler une période précise. Relances e-mail et WhatsApp (indicatif pays, ex. +225).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="payments-year">Année affichée</Label>
            <Select
              id="payments-year"
              className="min-w-[11rem]"
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
            <Label htmlFor="payments-month">Mois</Label>
            <Select
              id="payments-month"
              className="min-w-[11rem]"
              value={monthFilter === 'all' ? 'all' : String(monthFilter)}
              onChange={(e) => {
                const v = e.target.value;
                setParams((prev) => {
                  const q = new URLSearchParams(prev);
                  if (v === 'all') q.delete('month');
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
          <div className="flex gap-2">
            <Button
              variant={!overdueOnly ? 'primary' : 'secondary'}
              className="py-2 text-xs"
              onClick={() => {
                setParams((prev) => {
                  const q = new URLSearchParams(prev);
                  q.delete('overdue');
                  return q;
                });
              }}
            >
              Tous
            </Button>
            <Button
              variant={overdueOnly ? 'primary' : 'secondary'}
              className="py-2 text-xs"
              onClick={() => {
                setParams((prev) => {
                  const q = new URLSearchParams(prev);
                  q.set('overdue', '1');
                  return q;
                });
              }}
            >
              Impayés / retard
            </Button>
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase text-slate-500">Échéances listées</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{stats.total}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase text-slate-500">À encaisser</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-amber-900">{fcfa(stats.aEncaisser)}</p>
            {stats.retards > 0 && (
              <p className="mt-0.5 text-xs text-red-700">{stats.retards} en retard / impayé</p>
            )}
          </Card>
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase text-slate-500">Encaissé (période filtrée)</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-900">{fcfa(stats.encaisse)}</p>
            <p className="mt-0.5 text-xs text-slate-500">{stats.payees} ligne{stats.payees !== 1 ? 's' : ''} payée(s)</p>
          </Card>
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase text-slate-500">Regroupement</p>
            <p className="mt-1 text-sm font-medium text-slate-800">Par mois de facturation</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {monthGroups.length} mois concerné{monthGroups.length !== 1 ? 's' : ''}
            </p>
          </Card>
        </div>
      )}

      <div className="space-y-5">
        {monthGroups.map(([key, items]) => {
          const [yStr, mStr] = key.split('-');
          const py = Number(yStr);
          const pm = Number(mStr);
          const monthDue = items.reduce((acc, p) => acc + Number(p.amountDue), 0);
          const monthPending = items.filter((p) => p.status === 'PENDING' || p.status === 'LATE');
          const monthPendingSum = monthPending.reduce((acc, p) => acc + Number(p.amountDue), 0);
          const overdueInMonth = items.filter((p) => isOverduePayment(p)).length;

          return (
            <Card key={key} className="!p-0 overflow-hidden">
              {/** Pas de sticky ici : dans une Card overflow-hidden, sticky peut provoquer des chevauchements de lignes sur certains navigateurs. */}
              <div className="relative z-10 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{monthTitle(py, pm)}</h2>
                    <p className="text-xs text-slate-600">
                      {items.length} échéance{items.length !== 1 ? 's' : ''} · {fcfa(monthDue)} au total
                      {monthPending.length > 0 && (
                        <span className="font-medium text-amber-900">
                          {' '}
                          · {fcfa(monthPendingSum)} encore dû{monthPending.length !== 1 ? 'es' : ''}
                        </span>
                      )}
                      {overdueInMonth > 0 && (
                        <span className="font-medium text-red-800"> · {overdueInMonth} en retard</span>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                    Période {String(pm).padStart(2, '0')}/{py}
                  </span>
                </div>
              </div>
              <ul className="list-none">
                {items.map((p, rowIdx) => (
                  <li
                    key={p.id}
                    id={`payment-${p.id}`}
                    className={`grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4 sm:px-5 ${
                      rowIdx < items.length - 1 ? 'border-b border-slate-100' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">
                          {p.lease.tenant.firstName} {p.lease.tenant.lastName}
                        </p>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyle(p.status)}`}
                        >
                          {statusLabel(p.status)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {p.lease.unit.building.commune}, {p.lease.unit.building.city} ·{' '}
                        {p.lease.unit.building.name} — {unitKindLabel(p.lease.unit.kind)} — {p.lease.unit.label}
                      </p>
                      <p className="mt-1 text-sm">
                        <span className="font-semibold tabular-nums text-slate-900">{fcfa(Number(p.amountDue))}</span>
                        <span className="ml-2 text-xs text-slate-500">échéance {p.dueDate.slice(0, 10)}</span>
                        {p.status === 'PAID' && p.paidAt && (
                          <span className="ml-2 text-xs text-emerald-700">· payé le {p.paidAt.slice(0, 10)}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {isOverduePayment(p) && p.lease.tenant.email && (
                        <Button
                          variant="secondary"
                          className="py-2 text-xs"
                          disabled={sendingId !== null}
                          onClick={() => sendReminderEmail(p)}
                        >
                          {sendingId === p.id ? 'Envoi…' : 'Relance e-mail'}
                        </Button>
                      )}
                      {isOverduePayment(p) && (() => {
                        const waDigits = formatPhoneForWhatsApp(p.lease.tenant.phone);
                        if (!waDigits) return null;
                        const waHref = whatsAppWebUrl(
                          waDigits,
                          overdueReminderWhatsAppText({
                            firstName: p.lease.tenant.firstName,
                            periodLabel: `${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`,
                            amountFcfa: Number(p.amountDue),
                            dueDateStr: p.dueDate.slice(0, 10),
                            buildingName: p.lease.unit.building.name,
                            unitLabel: p.lease.unit.label,
                          }),
                        );
                        return (
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-xl border border-emerald-600/90 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-900 shadow-sm hover:bg-emerald-100"
                          >
                            WhatsApp
                          </a>
                        );
                      })()}
                      {isOverduePayment(p) &&
                        !p.lease.tenant.email &&
                        !formatPhoneForWhatsApp(p.lease.tenant.phone) && (
                          <span className="max-w-[14rem] py-2 text-xs text-amber-800">
                            Ajoutez un e-mail ou un n° avec indicatif (ex. +225…) dans Locataires pour relancer.
                          </span>
                        )}
                      {(p.status === 'PENDING' || p.status === 'LATE') && (
                        <Button className="py-2 text-xs" onClick={() => markPaid(p)}>
                          Marquer payé
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      {rows.length === 0 && (
        <Card className="py-10 text-center text-sm text-slate-500">
          Aucune échéance pour ce filtre. Essayez une autre année, un autre mois, ou « Toutes les années » / « Tous les
          mois ».
        </Card>
      )}
    </div>
  );
}
