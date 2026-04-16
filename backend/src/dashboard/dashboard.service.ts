import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { addDaysUtc, startOfTodayUtc } from '../common/date.util';
import {
  drawDashboardKpiSummary,
  drawFooter,
  drawSectionHeading,
  drawTopBanner,
  drawWorksheetImpayesTable,
  drawWorksheetInstructionBox,
  drawWorksheetLegend,
  type WorksheetAlertRow,
} from '../common/immo-pdf';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  async overview(organizationId: string) {
    await this.payments.syncLateStatuses();

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const monthStartUtc = new Date(Date.UTC(y, m - 1, 1));
    const nextMonthStartUtc = new Date(Date.UTC(y, m, 1));

    const leaseInOrg = { unit: { building: { organizationId } } };
    const todayUtc = startOfTodayUtc();
    const upcomingWindowEnd = addDaysUtc(todayUtc, 2);

    const [buildings, units, tenants, paymentsThisMonth, overduePayments, expectedRent, depositLeasesThisMonth, upcomingPending] =
      await Promise.all([
        this.prisma.building.count({ where: { organizationId } }),
        this.prisma.unit.count({ where: { building: { organizationId } } }),
        this.prisma.tenant.count({ where: { organizationId } }),
        this.prisma.payment.findMany({
          where: {
            periodYear: y,
            periodMonth: m,
            lease: leaseInOrg,
          },
          select: { amountPaid: true, amountDue: true, status: true },
        }),
        this.prisma.payment.findMany({
          where: {
            lease: leaseInOrg,
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
        this.prisma.payment.findMany({
          where: {
            lease: leaseInOrg,
            status: PaymentStatus.PENDING,
            dueDate: { gte: todayUtc, lte: upcomingWindowEnd },
          },
          select: { amountDue: true, amountPaid: true },
        }),
      ]);

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

    let upcomingCollectionsCount = 0;
    let upcomingCollectionsRemaining = 0;
    for (const p of upcomingPending) {
      const dueN = p.amountDue.toNumber();
      const paidN = p.amountPaid?.toNumber() ?? 0;
      const rem = Math.max(0, dueN - paidN);
      if (rem <= 0) continue;
      upcomingCollectionsCount += 1;
      upcomingCollectionsRemaining += rem;
    }

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
      upcomingCollections: {
        count: upcomingCollectionsCount,
        totalRemaining: upcomingCollectionsRemaining,
        windowStart: todayUtc.toISOString().slice(0, 10),
        windowEnd: upcomingWindowEnd.toISOString().slice(0, 10),
      },
      alerts: overduePayments.map((p) => {
        const dueN = p.amountDue.toNumber();
        const paidN = p.amountPaid?.toNumber() ?? 0;
        const amountRemaining = Math.max(0, dueN - paidN);
        return {
          paymentId: p.id,
          leaseId: p.leaseId,
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

  async buildWorksheetPdf(organizationId: string): Promise<Buffer> {
    const data = await this.overview(organizationId);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    const PDFDocument = require('pdfkit') as typeof import('pdfkit');
    const chunks: Buffer[] = [];
    const margin = 40;
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin });
    doc.on('data', (c: Buffer) => chunks.push(c));
    const pageH = doc.page.height;
    const contentW = doc.page.width - margin * 2;
    const pageTop = margin;
    const reservedBottom = 52;
    const pageBottom = pageH - margin - reservedBottom;

    const fcfa = (n: number) =>
      new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(
        n,
      );

    drawTopBanner(doc, margin, contentW, {
      eyebrow: org?.name?.trim() || 'Organisation',
      title: 'Feuille de route — Suivi des encaissements',
      subtitle: `Document terrain & bureau · ${new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`,
    });

    drawWorksheetInstructionBox(doc, margin, contentW);
    drawDashboardKpiSummary(doc, margin, contentW, data.kpis, fcfa);
    drawSectionHeading(doc, margin, contentW, 'Impayés et échéances à traiter', '1');

    const rows: WorksheetAlertRow[] = data.alerts.map((a) => {
      const due =
        a.dueDate instanceof Date
          ? a.dueDate.toISOString().slice(0, 10)
          : String(a.dueDate).slice(0, 10);
      const place = [a.building, a.unit].filter(Boolean).join(' — ') || '—';
      return {
        tenant: a.tenant || '—',
        place,
        period: a.period,
        dueDate: due,
        remaining: fcfa(a.amountRemaining),
      };
    });

    const startY = doc.y;
    drawWorksheetImpayesTable(doc, margin, contentW, pageTop, pageBottom, startY, rows);

    const legendRoom = 28;
    const footerRoom = 30;
    if (doc.y > pageH - margin - legendRoom - footerRoom) {
      doc.addPage();
    }
    drawWorksheetLegend(doc, margin, contentW);
    drawFooter(doc, margin, contentW, pageH);

    doc.end();
    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    return Buffer.concat(chunks);
  }
}
