import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { addDaysUtc, startOfTodayUtc } from '../common/date.util';
import type { FinanceMonthSnapshot, TodayAgenda, TodayAgendaItem } from './finance-summary.types';

@Injectable()
export class FinanceSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  /** Mois civil UTC (aligné Africa/Abidjan). */
  currentUtcYearMonth(now = new Date()): { year: number; month: number } {
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  }

  async getMonthSnapshot(
    organizationId: string,
    year?: number,
    month?: number,
  ): Promise<FinanceMonthSnapshot> {
    await this.payments.syncLateStatuses(organizationId);
    const cur = this.currentUtcYearMonth();
    const y = year ?? cur.year;
    const m = month ?? cur.month;
    const monthStartUtc = new Date(Date.UTC(y, m - 1, 1));
    const nextMonthStartUtc = new Date(Date.UTC(y, m, 1));
    const leaseInOrg = { unit: { building: { organizationId } } };
    const todayUtc = startOfTodayUtc();

    const [buildings, units, tenants, paymentsThisMonth, overduePayments, expectedRent, depositLeasesThisMonth] =
      await Promise.all([
        this.prisma.building.count({ where: { organizationId } }),
        this.prisma.unit.count({ where: { building: { organizationId } } }),
        this.prisma.tenant.count({ where: { organizationId } }),
        this.prisma.payment.findMany({
          where: { periodYear: y, periodMonth: m, lease: leaseInOrg },
          select: { amountPaid: true, amountDue: true, status: true },
        }),
        this.prisma.payment.findMany({
          where: {
            lease: leaseInOrg,
            OR: [
              { status: PaymentStatus.LATE },
              { status: PaymentStatus.PENDING, dueDate: { lt: todayUtc } },
            ],
          },
          select: { amountDue: true, amountPaid: true },
        }),
        this.prisma.lease.aggregate({
          where: { active: true, ...leaseInOrg },
          _sum: { monthlyRent: true },
        }),
        this.prisma.lease.findMany({
          where: {
            ...leaseInOrg,
            depositPaidAt: { gte: monthStartUtc, lt: nextMonthStartUtc },
            depositAmount: { not: null, gt: 0 },
          },
          select: { depositAmount: true },
        }),
      ]);

    const collectedThisMonth = paymentsThisMonth.reduce((s, p) => {
      const enc = p.amountPaid?.toNumber() ?? (p.status === PaymentStatus.PAID ? p.amountDue.toNumber() : 0);
      return s + enc;
    }, 0);
    const expectedMonthlyRent = expectedRent._sum.monthlyRent?.toNumber() ?? 0;
    const overdueAmount = overduePayments.reduce((s, p) => {
      const due = p.amountDue.toNumber();
      const paid = p.amountPaid?.toNumber() ?? 0;
      return s + Math.max(0, due - paid);
    }, 0);
    const depositsCollectedThisMonth = depositLeasesThisMonth.reduce(
      (s, l) => s + (l.depositAmount?.toNumber() ?? 0),
      0,
    );

    return {
      year: y,
      month: m,
      expectedMonthlyRent,
      collectedThisMonth,
      remainingVsExpected: Math.max(0, expectedMonthlyRent - collectedThisMonth),
      overdueCount: overduePayments.length,
      overdueAmount,
      depositsCollectedThisMonth,
      buildings,
      units,
      tenants,
    };
  }

  /**
   * C5 : agenda du jour — agrégation pure.
   * `lateDaysThreshold` : retards strictement plus vieux que N jours (défaut 7).
   */
  async getTodayAgenda(
    organizationId: string,
    opts?: { lateDaysThreshold?: number; leaseEndingDays?: number },
  ): Promise<TodayAgenda> {
    await this.payments.syncLateStatuses(organizationId);
    const lateDaysThreshold = opts?.lateDaysThreshold ?? 7;
    const leaseEndingDays = opts?.leaseEndingDays ?? 60;
    const todayUtc = startOfTodayUtc();
    const leaseInOrg = { unit: { building: { organizationId } } };
    const lateCutoff = addDaysUtc(todayUtc, -lateDaysThreshold);
    const endingUntil = addDaysUtc(todayUtc, leaseEndingDays);

    const [toRemind, lateDeep, endingLeases, depositPending, reportedTasks] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          lease: { active: true, ...leaseInOrg },
          status: { in: [PaymentStatus.PENDING, PaymentStatus.LATE] },
          dueDate: { lte: todayUtc },
        },
        include: {
          lease: { include: { tenant: true, unit: { include: { building: true } } } },
        },
        orderBy: { dueDate: 'asc' },
        take: 40,
      }),
      this.prisma.payment.findMany({
        where: {
          lease: { active: true, ...leaseInOrg },
          status: PaymentStatus.LATE,
          dueDate: { lt: lateCutoff },
        },
        include: {
          lease: { include: { tenant: true, unit: { include: { building: true } } } },
        },
        orderBy: { dueDate: 'asc' },
        take: 40,
      }),
      this.prisma.lease.findMany({
        where: {
          active: true,
          ...leaseInOrg,
          endDate: { gte: todayUtc, lte: endingUntil },
        },
        include: { tenant: true, unit: { include: { building: true } } },
        orderBy: { endDate: 'asc' },
        take: 40,
      }),
      this.prisma.lease.findMany({
        where: {
          active: true,
          ...leaseInOrg,
          depositAmount: { not: null, gt: 0 },
          depositPaidAt: null,
        },
        include: { tenant: true, unit: { include: { building: true } } },
        take: 40,
      }),
      this.prisma.$queryRawUnsafe(
        `
        SELECT t.payment_id AS "paymentId", t.status, c.name AS "collectorName"
        FROM payment_collection_tasks t
        LEFT JOIN rent_collectors c ON c.id = t.collector_id
        WHERE t.organization_id = $1 AND t.status = 'COLLECTED_REPORTED'
        LIMIT 40
        `,
        organizationId,
      ) as Promise<Array<{ paymentId: string; status: string; collectorName: string | null }>>,
    ]);

    const items: TodayAgendaItem[] = [];

    for (const p of toRemind) {
      const due = p.amountDue.toNumber();
      const paid = p.amountPaid?.toNumber() ?? 0;
      const rem = Math.max(0, due - paid);
      if (rem <= 0) continue;
      const name = `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`.trim();
      items.push({
        kind: 'remind',
        id: p.id,
        title: `Relancer ${name}`,
        subtitle: `${p.lease.unit.building.name} — ${p.lease.unit.label} · échéance ${p.dueDate.toISOString().slice(0, 10)}`,
        amount: rem,
        href: `/paiements?focus=${encodeURIComponent(p.id)}`,
        meta: { paymentId: p.id, status: p.status },
      });
    }

    const remindIds = new Set(items.filter((i) => i.kind === 'remind').map((i) => i.id));
    for (const p of lateDeep) {
      if (remindIds.has(p.id)) continue;
      const due = p.amountDue.toNumber();
      const paid = p.amountPaid?.toNumber() ?? 0;
      const rem = Math.max(0, due - paid);
      if (rem <= 0) continue;
      const name = `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`.trim();
      items.push({
        kind: 'late',
        id: p.id,
        title: `Retard > ${lateDaysThreshold} j — ${name}`,
        subtitle: `${p.lease.unit.building.name} — ${p.lease.unit.label}`,
        amount: rem,
        href: `/paiements?focus=${encodeURIComponent(p.id)}&overdue=1`,
        meta: { paymentId: p.id },
      });
    }

    for (const l of endingLeases) {
      const name = `${l.tenant.firstName} ${l.tenant.lastName}`.trim();
      items.push({
        kind: 'lease_ending',
        id: l.id,
        title: `Fin de bail — ${name}`,
        subtitle: `${l.unit.building.name} — ${l.unit.label} · fin ${l.endDate!.toISOString().slice(0, 10)}`,
        amount: l.monthlyRent.toNumber(),
        href: `/locations/${encodeURIComponent(l.id)}`,
        meta: { leaseId: l.id },
      });
    }

    const reportedIds = reportedTasks.map((t) => t.paymentId);
    if (reportedIds.length) {
      const pays = await this.prisma.payment.findMany({
        where: { id: { in: reportedIds }, lease: leaseInOrg },
        include: {
          lease: { include: { tenant: true, unit: { include: { building: true } } } },
        },
      });
      const byId = new Map(pays.map((p) => [p.id, p]));
      for (const t of reportedTasks) {
        const p = byId.get(t.paymentId);
        if (!p) continue;
        const name = `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`.trim();
        items.push({
          kind: 'collector_validate',
          id: p.id,
          title: `Valider collecte — ${name}`,
          subtitle: t.collectorName
            ? `Collecteur ${t.collectorName}`
            : `${p.lease.unit.building.name} — ${p.lease.unit.label}`,
          amount: Math.max(0, p.amountDue.toNumber() - (p.amountPaid?.toNumber() ?? 0)),
          href: `/paiements?focus=${encodeURIComponent(p.id)}`,
          meta: { paymentId: p.id, collectorName: t.collectorName },
        });
      }
    }

    for (const l of depositPending) {
      const name = `${l.tenant.firstName} ${l.tenant.lastName}`.trim();
      items.push({
        kind: 'deposit_pending',
        id: l.id,
        title: `Caution à encaisser — ${name}`,
        subtitle: `${l.unit.building.name} — ${l.unit.label}`,
        amount: l.depositAmount?.toNumber() ?? null,
        href: `/cautions`,
        meta: { leaseId: l.id },
      });
    }

    const counts = {
      remind: items.filter((i) => i.kind === 'remind').length,
      late: items.filter((i) => i.kind === 'late').length,
      leaseEnding: items.filter((i) => i.kind === 'lease_ending').length,
      collectorValidate: items.filter((i) => i.kind === 'collector_validate').length,
      depositPending: items.filter((i) => i.kind === 'deposit_pending').length,
    };

    return {
      asOf: todayUtc.toISOString().slice(0, 10),
      lateDaysThreshold,
      leaseEndingDays,
      items,
      counts,
    };
  }
}
