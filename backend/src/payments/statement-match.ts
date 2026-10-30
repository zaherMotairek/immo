import { PaymentStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { normalizePhoneForWaMe } from '../whatsapp/whatsapp.provider';

export type StatementLine = {
  index: number;
  amount: number;
  phone?: string;
  reference?: string;
  raw: string;
};

export type StatementSuggestion = {
  line: StatementLine;
  paymentId: string | null;
  tenantName: string | null;
  periodLabel: string | null;
  amountDue: number | null;
  score: number;
  reasons: string[];
};

function digits(s: string): string {
  return s.replace(/\D/g, '');
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(/FCFA|XOF|cfa/gi, '').replace(',', '.');
  const n = Number(cleaned.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse CSV simple (séparateur ; ou ,). En-têtes libres : montant/amount, téléphone/phone, référence/ref. */
export function parseStatementCsv(text: string): StatementLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const header = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const idxAmount = header.findIndex((h) => /montant|amount|somme/.test(h));
  const idxPhone = header.findIndex((h) => /tel|phone|mobile|msisdn/.test(h));
  const idxRef = header.findIndex((h) => /ref|réf|reference|id\b|txn/.test(h));
  const start = idxAmount >= 0 ? 1 : 0;
  const out: StatementLine[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    const amountRaw = idxAmount >= 0 ? cols[idxAmount] : cols[0];
    const amount = parseAmount(amountRaw || '');
    if (amount == null) continue;
    out.push({
      index: out.length,
      amount,
      phone: idxPhone >= 0 ? cols[idxPhone] : cols[1],
      reference: idxRef >= 0 ? cols[idxRef] : cols[2],
      raw: lines[i],
    });
  }
  return out;
}

export async function matchStatementLines(
  prisma: PrismaService,
  organizationId: string,
  lines: StatementLine[],
): Promise<StatementSuggestion[]> {
  const candidates = await prisma.payment.findMany({
    where: {
      status: { in: [PaymentStatus.PENDING, PaymentStatus.LATE] },
      lease: { active: true, unit: { building: { organizationId } } },
    },
    include: {
      lease: {
        include: {
          tenant: true,
          unit: { include: { building: true } },
        },
      },
    },
    take: 3000,
  });

  const used = new Set<string>();
  const suggestions: StatementSuggestion[] = [];

  for (const line of lines) {
    let best: StatementSuggestion | null = null;
    for (const p of candidates) {
      if (used.has(p.id)) continue;
      const due = Number(p.amountDue);
      const reasons: string[] = [];
      let score = 0;
      if (Math.abs(due - line.amount) < 1) {
        score += 50;
        reasons.push('montant');
      } else if (Math.abs(due - line.amount) / Math.max(due, 1) < 0.02) {
        score += 20;
        reasons.push('montant≈');
      } else {
        continue;
      }
      const tPhone = p.lease.tenant.phone?.trim() || '';
      if (line.phone && tPhone) {
        const a = normalizePhoneForWaMe(line.phone);
        const b = normalizePhoneForWaMe(tPhone);
        if (a && b && (a === b || a.endsWith(b.slice(-8)) || b.endsWith(a.slice(-8)))) {
          score += 40;
          reasons.push('téléphone');
        }
      }
      const ref = (line.reference || '').trim().toLowerCase();
      const pref = (p.collectionReference || '').trim().toLowerCase();
      const tName = `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`.trim().toLowerCase();
      if (ref && (pref === ref || (ref.length >= 4 && (pref.includes(ref) || ref.includes(pref))))) {
        score += 30;
        reasons.push('référence');
      } else if (ref && tName && tName.includes(ref)) {
        score += 10;
        reasons.push('nom≈');
      }
      if (!best || score > best.score) {
        best = {
          line,
          paymentId: p.id,
          tenantName: `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`.trim(),
          periodLabel: `${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`,
          amountDue: due,
          score,
          reasons,
        };
      }
    }
    if (best && best.score >= 50 && best.paymentId) {
      used.add(best.paymentId);
      suggestions.push(best);
    } else {
      suggestions.push({
        line,
        paymentId: null,
        tenantName: null,
        periodLabel: null,
        amountDue: null,
        score: best?.score ?? 0,
        reasons: best?.reasons?.length ? best.reasons : ['aucune correspondance fiable'],
      });
    }
  }
  return suggestions;
}
