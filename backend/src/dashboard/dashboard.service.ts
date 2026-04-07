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

    const [buildings, units, activeLeases, paymentsThisMonth, overduePayments, expectedRent] = await Promise.all([
      this.prisma.building.count(),
      this.prisma.unit.count(),
      this.prisma.lease.count({ where: { active: true } }),
      this.prisma.payment.findMany({
        where: { periodYear: y, periodMonth: m, status: PaymentStatus.PAID },
        select: { amountPaid: true, amountDue: true },
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
    ]);

    const collectedThisMonth = paymentsThisMonth.reduce((s, p) => s + (p.amountPaid?.toNumber() ?? p.amountDue.toNumber()), 0);
    const overdueAmount = overduePayments.reduce((s, p) => s + p.amountDue.toNumber(), 0);

    return {
      kpis: {
        buildings,
        units,
        activeLeases,
        expectedMonthlyRent: expectedRent._sum.monthlyRent?.toNumber() ?? 0,
        collectedThisMonth,
        overdueCount: overduePayments.length,
        overdueAmount,
      },
      alerts: overduePayments.map((p) => ({
        paymentId: p.id,
        tenantId: p.lease.tenantId,
        dueDate: p.dueDate,
        amountDue: p.amountDue.toNumber(),
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
      })),
    };
  }
}
