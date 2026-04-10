import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { startOfTodayUtc } from '../common/date.util';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  async overview() {
    await this.payments.syncLateStatuses();

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    /** Bornes du mois calendaire en UTC (cohérent avec les dates d’échéance loyer). */
    const monthStartUtc = new Date(Date.UTC(y, m - 1, 1));
    const nextMonthStartUtc = new Date(Date.UTC(y, m, 1));

    const [buildings, units, tenants, paymentsThisMonth, overduePayments, expectedRent, depositLeasesThisMonth] =
      await Promise.all([
      this.prisma.building.count(),
      this.prisma.unit.count(),
      this.prisma.tenant.count(),
      this.prisma.payment.findMany({
        where: { periodYear: y, periodMonth: m },
        select: { amountPaid: true, amountDue: true, status: true },
      }),
      this.prisma.payment.findMany({
        where: {
          OR: [
            { status: PaymentStatus.LATE },
            { status: PaymentStatus.PENDING, dueDate: { lt: startOfTodayUtc() } },
          ],
        },
        include: {
          lease: {
            include: {
              tenant: true,
              unit: { include: { building: true } },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 50,
      }),
      this.prisma.lease.aggregate({
        where: { active: true },
        _sum: { monthlyRent: true },
      }),
      this.prisma.lease.findMany({
        where: {
          depositPaidAt: { gte: monthStartUtc, lt: nextMonthStartUtc },
          depositAmount: { not: null, gt: 0 },
        },
        select: { depositAmount: true },
      }),
    ]);

    /** Montants encaissés sur les échéances loyer du mois uniquement (sans caution). */
    const collectedThisMonth = paymentsThisMonth.reduce((s, p) => {
      const enc = p.amountPaid?.toNumber() ?? (p.status === PaymentStatus.PAID ? p.amountDue.toNumber() : 0);
      return s + enc;
    }, 0);
    const depositsCollectedThisMonth = depositLeasesThisMonth.reduce(
      (s, l) => s + (l.depositAmount?.toNumber() ?? 0),
      0,
    );
    const overdueAmount = overduePayments.reduce((s, p) => {
      const due = p.amountDue.toNumber();
      const paid = p.amountPaid?.toNumber() ?? 0;
      return s + Math.max(0, due - paid);
    }, 0);

    return {
      kpis: {
        buildings,
        units,
        tenants,
        expectedMonthlyRent: expectedRent._sum.monthlyRent?.toNumber() ?? 0,
        collectedThisMonth,
        depositsCollectedThisMonth,
        overdueCount: overduePayments.length,
        overdueAmount,
      },
      alerts: overduePayments.map((p) => {
        const dueN = p.amountDue.toNumber();
        const paidN = p.amountPaid?.toNumber() ?? 0;
        const amountRemaining = Math.max(0, dueN - paidN);
        return {
        paymentId: p.id,
        tenantId: p.lease.tenantId,
        dueDate: p.dueDate,
        amountDue: dueN,
        amountPaid: paidN,
        amountRemaining,
        status: p.status,
        period: `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`,
        tenant: p.lease.tenant
          ? `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`
          : '',
        tenantFirstName: p.lease.tenant?.firstName ?? '',
        tenantEmail: p.lease.tenant?.email ?? null,
        tenantPhone: p.lease.tenant?.phone ?? null,
        unit: p.lease.unit?.label,
        unitKind: p.lease.unit?.kind,
        building: p.lease.unit?.building?.name,
        commune: p.lease.unit?.building?.commune,
        city: p.lease.unit?.building?.city,
      };
      }),
    };
  }
}
