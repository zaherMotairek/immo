import { fcfa } from '@/lib/format';
import { isOverduePayment, paymentRemaining, type PaymentRow } from '@/lib/paymentRow';
import { statusLabel, statusStyle } from '@/lib/paymentStatusUi';
import type { TableSortDir } from '@/lib/tableSort';
import { unitKindLabel } from '@/lib/unitKind';
import type { BuildingOpt, CellBlock, LeaseRowModel, TenantOpt, YearlyLeaseSortKey } from './types';

export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function monthShortLabel(m: number): string {
  const raw = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(2000, m - 1, 1));
  return raw.replace(/\.$/, '');
}

/** Réponse JSON parfois enveloppée ; toujours produire un tableau. */
export function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.items)) return o.items;
    if (Array.isArray(o.results)) return o.results;
  }
  return [];
}

export function normalizeTenants(raw: unknown): TenantOpt[] {
  const seen = new Set<string>();
  const out: TenantOpt[] = [];
  for (const t of extractArray(raw)) {
    if (!t || typeof t !== 'object') continue;
    const x = t as Record<string, unknown>;
    const id = x.id != null ? String(x.id) : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      firstName: String(x.firstName ?? ''),
      lastName: String(x.lastName ?? ''),
    });
  }
  return out;
}

export function normalizeBuildings(raw: unknown): BuildingOpt[] {
  const seen = new Set<string>();
  const out: BuildingOpt[] = [];
  for (const b of extractArray(raw)) {
    if (!b || typeof b !== 'object') continue;
    const x = b as Record<string, unknown>;
    const id = x.id != null ? String(x.id) : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: String(x.name ?? ''),
    });
  }
  return out;
}

function leaseKey(p: PaymentRow): string {
  const id = (p as PaymentRow & { leaseId?: string }).leaseId;
  if (id) return id;
  return `${p.lease.tenant.id}-${p.lease.unit.building.name}-${p.lease.unit.label}`;
}

export function buildLeaseRows(payments: PaymentRow[], _year: number): LeaseRowModel[] {
  const byLease = new Map<string, PaymentRow[]>();
  for (const p of payments) {
    const k = leaseKey(p);
    if (!byLease.has(k)) byLease.set(k, []);
    byLease.get(k)!.push(p);
  }
  return [...byLease.entries()]
    .map(([key, list]) => {
      const first = list[0]!;
      const u = first.lease.unit;
      const b = u.building;
      const t = first.lease.tenant;
      const name = `${t.firstName} ${t.lastName}`.trim();
      const label = `${b.name} — ${u.label}`;
      const sub = `${name} · ${unitKindLabel(u.kind)}`;
      const byMonth = new Map<number, PaymentRow>();
      for (const p of list) {
        byMonth.set(p.periodMonth, p);
      }
      return { key, label, sub, byMonth };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
}

export function compareYearlyLeaseRows(
  a: LeaseRowModel,
  b: LeaseRowModel,
  key: YearlyLeaseSortKey,
  dir: TableSortDir,
): number {
  const sign = dir === 'asc' ? 1 : -1;
  const c =
    key === 'sub'
      ? a.sub.localeCompare(b.sub, 'fr', { sensitivity: 'base' })
      : a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' });
  const tie = c === 0 ? a.key.localeCompare(b.key) : c;
  return tie * sign;
}

export function cellContent(p: PaymentRow | undefined): CellBlock {
  if (!p) {
    return {
      statusText: '—',
      className: 'bg-slate-50 text-slate-400 dark:bg-slate-900/50 dark:text-slate-500',
      title: 'Aucune échéance pour ce mois',
      amountLines: [],
    };
  }
  const due = Number(p.amountDue);
  const paid = Number(p.amountPaid ?? 0);
  const rem = paymentRemaining(p);
  const partial = (p.status === 'PENDING' || p.status === 'LATE') && paid > 0 && paid < due;

  if (partial) {
    return {
      statusText: 'Partiel',
      className: 'bg-amber-100 text-amber-950 dark:bg-amber-950/55 dark:text-amber-100',
      title: `Loyer dû ${fcfa(due)} · Encaissé ${fcfa(paid)} · Reste ${fcfa(rem)}`,
      amountLines: [`Dû ${fcfa(due)}`, `Enc. ${fcfa(paid)} · Reste ${fcfa(rem)}`],
    };
  }
  if (p.status === 'PENDING' && isOverduePayment(p)) {
    return {
      statusText: 'Retard',
      className: 'bg-red-100 text-red-950 dark:bg-red-950/55 dark:text-red-100',
      title: `Loyer dû ${fcfa(due)} · Reste ${fcfa(rem)}`,
      amountLines: [`Dû ${fcfa(due)}`, `Reste ${fcfa(rem)}`],
    };
  }
  if (p.status === 'PAID') {
    const enc = Number(p.amountPaid ?? p.amountDue);
    return {
      statusText: 'Payé',
      className: statusStyle(p.status),
      title: `Encaissé ${fcfa(enc)} (loyer dû ${fcfa(due)})`,
      amountLines: [`Enc. ${fcfa(enc)}`],
    };
  }
  if (p.status === 'LATE') {
    return {
      statusText: 'Retard',
      className: statusStyle(p.status),
      title: `Loyer dû ${fcfa(due)} · Reste ${fcfa(rem)}`,
      amountLines: [`Dû ${fcfa(due)}`, `Reste ${fcfa(rem)}`],
    };
  }
  if (p.status === 'WAIVED') {
    return {
      statusText: 'Loyer offert',
      className: statusStyle(p.status),
      title: `Gratuité · référence loyer ${fcfa(due)}`,
      amountLines: [`Réf. ${fcfa(due)}`],
    };
  }
  if (p.status === 'CANCELLED') {
    return {
      statusText: 'Annulé',
      className: statusStyle(p.status),
      title: `Échéance annulée · loyer affiché ${fcfa(due)}`,
      amountLines: [`Dû ${fcfa(due)}`],
    };
  }
  return {
    statusText: p.status === 'PENDING' ? 'Attente' : statusLabel(p.status),
    className: statusStyle(p.status),
    title: `Loyer dû ${fcfa(due)}`,
    amountLines: [`Dû ${fcfa(due)}`],
  };
}
