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
  formatFcfaPdf,
  type WorksheetAlertRow,
} from '../common/immo-pdf';

/** Période « AAAA-MM » → libellé du type « Février 2026 » (PDF uniquement). */
function periodLabelFrFromKey(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period.trim());
  if (!m) return period;
  const y = parseInt(m[1]!, 10);
  const mo = parseInt(m[2]!, 10);
  const raw = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(y, mo - 1, 1));
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

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
          include: {
            lease: {
              include: {
                tenant: true,
                unit: { include: { building: true } },
              },
            },
          },
          orderBy: { dueDate: 'asc' },
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

    const upcomingItems: Array<{
      paymentId: string;
      leaseId: string;
      tenantId: string;
      dueDate: Date;
      amountDue: number;
      amountPaid: number;
      amountRemaining: number;
      status: string;
      period: string;
      tenant: string;
      tenantFirstName: string;
      tenantEmail: string | null;
      tenantPhone: string | null;
      unit?: string;
      unitKind?: string;
      building?: string;
      commune?: string;
      city?: string;
    }> = [];

    let upcomingCollectionsCount = 0;
    let upcomingCollectionsRemaining = 0;
    for (const p of upcomingPending) {
      const dueN = p.amountDue.toNumber();
      const paidN = p.amountPaid?.toNumber() ?? 0;
      const rem = Math.max(0, dueN - paidN);
      if (rem <= 0) continue;
      upcomingCollectionsCount += 1;
      upcomingCollectionsRemaining += rem;
      upcomingItems.push({
        paymentId: p.id,
        leaseId: p.leaseId,
        tenantId: p.lease.tenantId,
        dueDate: p.dueDate,
        amountDue: dueN,
        amountPaid: paidN,
        amountRemaining: rem,
        status: p.status,
        period: `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`,
        tenant: p.lease.tenant ? `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}` : '',
        tenantFirstName: p.lease.tenant?.firstName ?? '',
        tenantEmail: p.lease.tenant?.email ?? null,
        tenantPhone: p.lease.tenant?.phone ?? null,
        unit: p.lease.unit?.label,
        unitKind: p.lease.unit?.kind,
        building: p.lease.unit?.building?.name,
        commune: p.lease.unit?.building?.commune,
        city: p.lease.unit?.building?.city,
      });
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
        items: upcomingItems.map((row) => ({
          ...row,
          dueDate: row.dueDate instanceof Date ? row.dueDate.toISOString() : String(row.dueDate),
        })),
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

    drawTopBanner(doc, margin, contentW, {
      eyebrow: org?.name?.trim() || 'Organisation',
      title: 'Feuille de route — Suivi des encaissements',
      subtitle: `Document terrain et bureau · ${new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`,
    });

    drawWorksheetInstructionBox(doc, margin, contentW);
    drawDashboardKpiSummary(doc, margin, contentW, data.kpis, formatFcfaPdf);
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
        period: periodLabelFrFromKey(a.period),
        dueDate: due,
        remaining: formatFcfaPdf(a.amountRemaining),
      };
    });

    const startY = doc.y;
    drawWorksheetImpayesTable(doc, margin, contentW, pageTop, pageBottom, startY, rows);

    const legendRoom = 32;
    const footerRoom = 38;
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
