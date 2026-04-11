/**
 * Exécution des commandes « payer pour … » (prototype assistant).
 */
import { api } from '@/lib/api';
import { paymentRemaining, type PaymentRow } from '@/lib/paymentRow';

type LeaseRow = {
  id: string;
  active: boolean;
  tenant: { firstName: string; lastName: string };
};

export type PaymentAssistantCommand =
  | { kind: 'payFull'; tenantQuery: string }
  | { kind: 'payPartial'; tenantQuery: string; amountFcfa: number; thisMonthOnly: boolean }
  | { kind: 'prepayMonths'; tenantQuery: string; months: number };

function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function tenantMatchesQuery(firstName: string, lastName: string, query: string): boolean {
  const full = normalizeName(`${firstName} ${lastName}`);
  const q = normalizeName(query);
  if (!q) return false;
  if (full === q) return true;
  if (full.includes(q)) return true;
  const qParts = q.split(/\s+/).filter((p) => p.length >= 1);
  return qParts.length > 0 && qParts.every((part) => part.length >= 2 && full.includes(part));
}

function filterPaymentsByTenant(rows: PaymentRow[], query: string): PaymentRow[] {
  return rows.filter((p) =>
    tenantMatchesQuery(p.lease.tenant.firstName, p.lease.tenant.lastName, query),
  );
}

function findActiveLeasesByTenant(leases: LeaseRow[], query: string): LeaseRow[] {
  return leases.filter((l) => l.active && tenantMatchesQuery(l.tenant.firstName, l.tenant.lastName, query));
}

export async function runPaymentAssistantCommand(
  cmd: PaymentAssistantCommand,
): Promise<{ message: string }> {
  const rows = await api<PaymentRow[]>('/payments');
  const leases = await api<LeaseRow[]>('/leases');

  if (cmd.kind === 'prepayMonths') {
    const matches = findActiveLeasesByTenant(leases, cmd.tenantQuery);
    if (matches.length === 0) {
      return { message: `Aucun bail actif trouvé pour « ${cmd.tenantQuery} ».` };
    }
    if (matches.length > 1) {
      const names = matches
        .map((l) => `${l.tenant.firstName} ${l.tenant.lastName} (${l.id.slice(0, 8)}…)`)
        .slice(0, 4);
      return {
        message: `Plusieurs baux actifs correspondent : ${names.join(' ; ')}. Précisez le nom sur la fiche Paiements.`,
      };
    }
    const leaseId = matches[0].id;
    const res = await api<{
      monthsPaid: number;
      totalFcfa: number;
      periods: string[];
      paymentIds: string[];
    }>(`/leases/${leaseId}/prepay-months`, { method: 'POST', json: { months: cmd.months } });
    return {
      message: `${res.monthsPaid} mois enregistré(s) comme payés (${res.periods.join(', ')}) — total ${Math.round(res.totalFcfa).toLocaleString('fr-FR')} FCFA. Utilisez « Reçu PDF » sur la fiche Paiements pour télécharger le reçu.`,
    };
  }

  const pending = rows.filter((p) => p.status === 'PENDING' || p.status === 'LATE');
  const mine = filterPaymentsByTenant(pending, cmd.tenantQuery);

  if (mine.length === 0) {
    return {
      message: `Aucune échéance impayée trouvée pour « ${cmd.tenantQuery} ». Vérifiez le nom ou générez les loyers (Baux).`,
    };
  }

  if (cmd.kind === 'payFull') {
    mine.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const p = mine[0];
    await api(`/payments/${p.id}`, {
      method: 'PATCH',
      json: {
        status: 'PAID',
        amountPaid: Number(p.amountDue),
        paidAt: new Date().toISOString().slice(0, 10),
      },
    });
    return {
      message: `Échéance ${p.periodMonth}/${p.periodYear} (${p.lease.unit.building.name} — ${p.lease.unit.label}) marquée payée. Téléchargez le reçu via « Reçu PDF » sur Paiements si besoin.`,
    };
  }

  let pool = mine;
  if (cmd.thisMonthOnly) {
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth() + 1;
    pool = mine.filter((p) => p.periodYear === y && p.periodMonth === mo);
    if (pool.length === 0) {
      return {
        message: `Aucune échéance impayée pour « ${cmd.tenantQuery} » sur le mois en cours (${mo}/${y}).`,
      };
    }
  }

  pool.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const p = pool[0];
  const remaining = paymentRemaining(p);
  if (remaining <= 0) {
    return { message: 'Cette échéance est déjà soldée.' };
  }
  if (cmd.amountFcfa > remaining + 0.01) {
    return {
      message: `Montant trop élevé : reste ${Math.round(remaining).toLocaleString('fr-FR')} FCFA sur cette échéance.`,
    };
  }
  await api(`/payments/${p.id}`, {
    method: 'PATCH',
    json: { addAmountPaid: Math.round(cmd.amountFcfa) },
  });
  return {
    message: `Versement de ${Math.round(cmd.amountFcfa).toLocaleString('fr-FR')} FCFA enregistré pour ${p.lease.tenant.firstName} ${p.lease.tenant.lastName} (${p.periodMonth}/${p.periodYear}).`,
  };
}
