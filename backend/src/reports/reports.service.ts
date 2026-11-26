import { Injectable } from '@nestjs/common';
import { BuildingStructureKind, ChargeCategory, CollectionMethod, PaymentStatus, UnitKind } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as ExcelJS from 'exceljs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { ChargesService } from '../charges/charges.service';
import { LeasesService } from '../leases/leases.service';
import { TenantsService } from '../tenants/tenants.service';
import { BuildingsService } from '../buildings/buildings.service';
import { selectApartmentsPerFloorByOrg } from '../buildings/apartments-per-floor-column';
import { startOfTodayUtc } from '../common/date.util';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import {
  drawFooter,
  drawSectionHeading,
  drawTopBanner,
  drawZebraTableEqualCols,
  formatDatePdfFr,
  formatFcfaPdf,
  IMMO_PDF,
  truncPdfCell,
} from '../common/immo-pdf';
import { naturalCompare } from '../common/sort.util';

function paymentStatusFr(s: PaymentStatus | undefined): string {
  if (!s) return '—';
  switch (s) {
    case PaymentStatus.PAID:
      return 'Payé';
    case PaymentStatus.LATE:
      return 'En retard';
    case PaymentStatus.CANCELLED:
      return 'Annulé';
    case PaymentStatus.WAIVED:
      return 'Loyer offert';
    default:
      return 'Impayé';
  }
}

function unitKindFr(k: UnitKind | string): string {
  const m: Record<string, string> = {
    APARTMENT: 'Appartement',
    HOUSE: 'Maison',
    LAND: 'Terrain',
    OFFICE: 'Bureau',
    WAREHOUSE: 'Entrepôt',
    COMMERCIAL: 'Local commercial',
    GARAGE: 'Garage (parking)',
    OTHER: 'Autre',
  };
  return m[String(k)] ?? String(k);
}

function chargeCategoryFr(c: ChargeCategory | string): string {
  const m: Record<string, string> = {
    TAX: 'Impôts et taxes',
    FEES: 'Copro et honoraires',
    INSURANCE: 'Assurance',
    MAINTENANCE: 'Entretien et travaux',
    UTILITIES: 'Eau et énergie',
    SECURITY: 'Sécurité et gardiennage',
    PAYROLL: 'Salaires et personnel',
    OTHER: 'Autre',
  };
  return m[String(c)] ?? String(c);
}

function collectionMethodFr(m: CollectionMethod | string | null | undefined): string {
  if (!m) return 'Espèces';
  const labels: Record<string, string> = {
    CASH: 'Espèces',
    BANK_TRANSFER: 'Virement / dépôt banque',
    ORANGE_MONEY: 'Orange Money',
    MTN_MONEY: 'MTN Mobile Money',
    MOOV: 'Moov Money',
    WAVE: 'Wave',
    OTHER: 'Autre',
  };
  return labels[String(m)] ?? String(m);
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly charges: ChargesService,
    private readonly leases: LeasesService,
    private readonly tenants: TenantsService,
    private readonly buildings: BuildingsService,
  ) {}

  private async listClosedPeriodsSet(organizationId: string, year: number) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `
      SELECT "period_month" AS "periodMonth"
      FROM "accounting_period_closures"
      WHERE "organization_id" = $1 AND "period_year" = $2
      `,
      organizationId,
      year,
    )) as Array<{ periodMonth: number }>;
    return new Set(rows.map((r) => r.periodMonth));
  }

  async listAccountingClosures(organizationId: string, year: number) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `
      SELECT
        "period_year" AS "periodYear",
        "period_month" AS "periodMonth",
        "closed_by_user_id" AS "closedByUserId",
        "closed_by_email" AS "closedByEmail",
        "closed_at" AS "closedAt"
      FROM "accounting_period_closures"
      WHERE "organization_id" = $1 AND "period_year" = $2
      ORDER BY "period_month" ASC
      `,
      organizationId,
      year,
    )) as Array<{
      periodYear: number;
      periodMonth: number;
      closedByUserId: string | null;
      closedByEmail: string | null;
      closedAt: Date;
    }>;
    return rows.map((r) => ({
      ...r,
      closedAt: r.closedAt.toISOString(),
    }));
  }

  async closeAccountingPeriod(organizationId: string, year: number, month: number, actor: JwtAuthUser) {
    if (!Number.isInteger(year) || year < 1990 || year > 2100) {
      throw new Error('Année invalide.');
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Mois invalide.');
    }
    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO "accounting_period_closures"
      ("id","organization_id","period_year","period_month","closed_by_user_id","closed_by_email","closed_at")
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      ON CONFLICT ("organization_id","period_year","period_month")
      DO NOTHING
      `,
      randomUUID(),
      organizationId,
      year,
      month,
      actor.id,
      actor.email,
    );
    return { ok: true };
  }

  async openAccountingPeriod(organizationId: string, year: number, month: number) {
    if (!Number.isInteger(year) || year < 1990 || year > 2100) {
      throw new Error('Année invalide.');
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Mois invalide.');
    }
    await this.prisma.$executeRawUnsafe(
      `
      DELETE FROM "accounting_period_closures"
      WHERE "organization_id" = $1 AND "period_year" = $2 AND "period_month" = $3
      `,
      organizationId,
      year,
      month,
    );
    return { ok: true };
  }

  async buildAccountingSummary(year: number, organizationId: string) {
    await this.payments.syncLateStatuses(organizationId);
    const leaseInOrg = { unit: { building: { organizationId } } };
    const [payments, charges] = await Promise.all([
      this.prisma.payment.findMany({
        where: { periodYear: year, lease: leaseInOrg },
        include: { lease: { include: { unit: { include: { building: true } } } } },
      }),
      this.prisma.charge.findMany({
        where: { periodYear: year, building: { organizationId } },
      }),
    ]);

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      due: 0,
      paid: 0,
      waived: 0,
      charges: 0,
      netEstimated: 0,
    }));

    for (const p of payments) {
      const idx = p.periodMonth - 1;
      if (idx < 0 || idx > 11) continue;
      const due = p.amountDue.toNumber();
      const paid = p.amountPaid?.toNumber() ?? (p.status === PaymentStatus.PAID ? due : 0);
      const waived = p.status === PaymentStatus.WAIVED ? due : 0;
      monthly[idx]!.due += due;
      monthly[idx]!.paid += paid;
      monthly[idx]!.waived += waived;
    }
    for (const c of charges) {
      const m = c.periodMonth ?? 0;
      if (m < 1 || m > 12) continue;
      monthly[m - 1]!.charges += c.amount.toNumber();
    }
    const closedMonths = await this.listClosedPeriodsSet(organizationId, year);
    for (const m of monthly) {
      m.netEstimated = m.paid - m.charges;
      (m as { closed?: boolean }).closed = closedMonths.has(m.month);
    }

    const totals = monthly.reduce(
      (acc, m) => {
        acc.due += m.due;
        acc.paid += m.paid;
        acc.waived += m.waived;
        acc.charges += m.charges;
        acc.netEstimated += m.netEstimated;
        return acc;
      },
      { due: 0, paid: 0, waived: 0, charges: 0, netEstimated: 0 },
    );

    return {
      year,
      totals,
      estimatedProfit: totals.netEstimated,
      monthly,
    };
  }

  async buildAccountingWorkspace(year: number, organizationId: string) {
    await this.payments.syncLateStatuses(organizationId);
    const leaseInOrg = { unit: { building: { organizationId } } };
    const [summary, payments, charges] = await Promise.all([
      this.buildAccountingSummary(year, organizationId),
      this.prisma.payment.findMany({
        where: { periodYear: year, lease: leaseInOrg },
        include: {
          lease: {
            include: {
              tenant: true,
              unit: { include: { building: true } },
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }],
      }),
      this.prisma.charge.findMany({
        where: { periodYear: year, building: { organizationId } },
        include: { building: true, unit: true },
        orderBy: [{ periodMonth: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const receivables = payments
      .map((p) => {
        const due = p.amountDue.toNumber();
        const paid = p.amountPaid?.toNumber() ?? 0;
        const outstanding = Math.max(0, due - paid);
        if (outstanding <= 0.005) return null;
        const tenant = `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`.trim();
        return {
          paymentId: p.id,
          tenantFullName: tenant,
          buildingName: p.lease.unit.building.name,
          unitLabel: p.lease.unit.label,
          periodYear: p.periodYear,
          periodMonth: p.periodMonth,
          dueDate: p.dueDate.toISOString().slice(0, 10),
          status: p.status,
          amountDue: due,
          amountPaid: paid,
          outstanding,
        };
      })
      .filter(Boolean);

    const ledger = [
      ...payments.map((p) => {
        const due = p.amountDue.toNumber();
        const paid = p.amountPaid?.toNumber() ?? (p.status === PaymentStatus.PAID ? due : 0);
        const tenant = `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`.trim();
        return {
          date: p.dueDate.toISOString().slice(0, 10),
          journal: 'LOYERS',
          piece: p.id.slice(0, 8),
          label: `${tenant} · ${p.lease.unit.building.name} · ${p.lease.unit.label} · ${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`,
          debit: 0,
          credit: paid,
          due,
          status: p.status,
        };
      }),
      ...charges.map((c) => ({
        date: c.createdAt.toISOString().slice(0, 10),
        journal: 'CHARGES',
        piece: c.id.slice(0, 8),
        label: `${chargeCategoryFr(c.category)} · ${c.building.name}${c.unit?.label ? ` · ${c.unit.label}` : ''} · ${c.label}`,
        debit: c.amount.toNumber(),
        credit: 0,
        due: 0,
        status: c.paid ? 'PAID' : 'UNPAID',
      })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.journal.localeCompare(b.journal));

    return {
      ...summary,
      receivables,
      ledger,
    };
  }

  async buildPdf(year: number, organizationId: string): Promise<Buffer> {
    await this.payments.syncLateStatuses(organizationId);
    const leaseInOrg = { unit: { building: { organizationId } } };
    const [chargeSummary, overdue, allPaidYear, org] = await Promise.all([
      this.charges.summary(organizationId, year),
      this.prisma.payment.findMany({
        where: {
          periodYear: year,
          lease: leaseInOrg,
          OR: [
            { status: PaymentStatus.LATE },
            { status: PaymentStatus.PENDING, dueDate: { lt: startOfTodayUtc() } },
          ],
        },
        include: {
          lease: { include: { tenant: true, unit: { include: { building: true } } } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { periodYear: year, status: PaymentStatus.PAID, lease: leaseInOrg },
        include: {
          lease: { include: { tenant: true, unit: { include: { building: true } } } },
        },
      }),
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
    ]);

    const chunks: Buffer[] = [];
    const margin = 48;
    const doc = new PDFDocument({ margin, size: 'A4' });
    doc.on('data', (c: Buffer) => chunks.push(c));
    const contentW = doc.page.width - margin * 2;
    const pageH = doc.page.height;

    drawTopBanner(doc, margin, contentW, {
      eyebrow: org?.name?.trim() || 'Organisation',
      title: 'Rapport financier annuel',
      subtitle: `Année civile ${year} · Charges, encaissement des loyers et points de vigilance`,
    });

    drawSectionHeading(doc, margin, contentW, 'Charges et fiscalité (synthèse)', '1');
    doc.font('Helvetica').fontSize(10).fillColor(IMMO_PDF.ink);
    doc.text(`Total des charges enregistrées sur l’année : ${formatFcfaPdf(chargeSummary.totalCharges)}`, { width: contentW });
    doc.text(`Dont charges encore non réglées : ${formatFcfaPdf(chargeSummary.unpaidCharges)}`, { width: contentW });
    doc.moveDown(0.35);
    doc.fontSize(9.5).text(`Détail par grande famille :`, { width: contentW });
    doc.text(`· Impôts et taxes (TAX) : ${formatFcfaPdf(chargeSummary.highlights.impotsEtTaxes)}`, { width: contentW });
    doc.text(`· Copropriété et honoraires (FEES) : ${formatFcfaPdf(chargeSummary.highlights.chargesCoproEtHonoraires)}`, { width: contentW });
    doc.text(`· Sécurité et gardiennage (SECURITY) : ${formatFcfaPdf(chargeSummary.highlights.securite)}`, { width: contentW });
    doc.text(`· Salaires et personnel (PAYROLL) : ${formatFcfaPdf(chargeSummary.highlights.personnel)}`, { width: contentW });
    doc.moveDown(0.9);

    drawSectionHeading(doc, margin, contentW, 'Encaissement des loyers (année)', '2');
    const encaisse = allPaidYear.reduce((s, p) => s + (p.amountPaid?.toNumber() ?? p.amountDue.toNumber()), 0);
    doc.font('Helvetica').fontSize(10).fillColor(IMMO_PDF.ink);
    doc.text(`Nombre d’échéances enregistrées comme payées : ${allPaidYear.length}`, { width: contentW });
    doc.text(`Montant total encaissé (selon saisies) : ${formatFcfaPdf(encaisse)}`, { width: contentW });
    doc.moveDown(0.9);

    drawSectionHeading(doc, margin, contentW, 'Points de vigilance — impayés et retards', '3');
    if (overdue.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor(IMMO_PDF.muted).text('Aucune échéance en retard pour cette année.', {
        width: contentW,
      });
    } else {
      doc.font('Helvetica').fontSize(9).fillColor(IMMO_PDF.ink);
      for (const p of overdue.slice(0, 25)) {
        const t = p.lease.tenant;
        const name = t ? `${t.firstName} ${t.lastName}` : '—';
        const unitLabel = p.lease.unit?.label ?? '—';
        const im = p.lease.unit?.building?.name ?? '—';
        const perRaw = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
          new Date(p.periodYear, p.periodMonth - 1, 1),
        );
        const periodFr = perRaw.charAt(0).toUpperCase() + perRaw.slice(1);
        doc.text(
          `${periodFr} — ${name} — ${unitLabel} (${im}) — ${formatFcfaPdf(p.amountDue.toNumber())} — échéance ${p.dueDate
            .toISOString()
            .slice(0, 10)}`,
          { width: contentW },
        );
        doc.moveDown(0.25);
      }
      if (overdue.length > 25) {
        doc.fillColor(IMMO_PDF.muted).text(`… et ${overdue.length - 25} autre(s) ligne(s) non détaillées ici.`, {
          width: contentW,
        });
      }
    }

    drawFooter(doc, margin, contentW, pageH);

    doc.end();
    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    return Buffer.concat(chunks);
  }

  async buildExcel(year: number, organizationId: string): Promise<Buffer> {
    await this.payments.syncLateStatuses(organizationId);
    const today = startOfTodayUtc();
    const leaseInOrg = { unit: { building: { organizationId } } };

    const [chargeSummary, payments, chargeRows, tenants, leaseList, buildingsRaw] = await Promise.all([
      this.charges.summary(organizationId, year),
      this.prisma.payment.findMany({
        where: { periodYear: year, lease: leaseInOrg },
        orderBy: [{ dueDate: 'asc' }],
        include: {
          lease: { include: { tenant: true, unit: { include: { building: true } } } },
        },
      }),
      this.prisma.charge.findMany({
        where: { periodYear: year, building: { organizationId } },
        include: { building: true, unit: true },
        orderBy: [{ buildingId: 'asc' }, { periodMonth: 'asc' }],
      }),
      this.prisma.tenant.findMany({
        where: { organizationId },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          leases: {
            where: { active: true, ...leaseInOrg },
            include: { unit: { include: { building: true } } },
          },
        },
      }),
      this.prisma.lease.findMany({
        where: leaseInOrg,
        orderBy: [{ active: 'desc' }, { startDate: 'desc' }],
        include: {
          tenant: true,
          unit: { include: { building: true } },
        },
      }),
      this.prisma.building.findMany({
        where: { organizationId },
        orderBy: { name: 'asc' },
        include: {
          units: {
            include: {
              leases: { where: { active: true } },
            },
          },
        },
      }),
    ]);

    const apfMap = await selectApartmentsPerFloorByOrg(this.prisma, organizationId);
    const buildings = buildingsRaw.map((b) => ({
      ...b,
      apartmentsPerFloor: apfMap.get(b.id) ?? null,
    }));

    const paid = payments.filter((p) => p.status === PaymentStatus.PAID);
    const totalEncaisse = paid.reduce((s, p) => s + Number(p.amountPaid ?? p.amountDue), 0);
    const overdue = payments.filter(
      (p) =>
        p.status === PaymentStatus.LATE ||
        (p.status === PaymentStatus.PENDING && p.dueDate < today),
    );
    const totalImpayesDu = overdue.reduce((s, p) => {
      const due = p.amountDue.toNumber();
      const paid = p.amountPaid?.toNumber() ?? 0;
      return s + Math.max(0, due - paid);
    }, 0);

    let totalUnits = 0;
    let occupiedUnits = 0;
    for (const b of buildings) {
      totalUnits += b.units.length;
      for (const u of b.units) {
        if (u.leases.length > 0) occupiedUnits += 1;
      }
    }
    const activeLeaseCount = leaseList.filter((l) => l.active).length;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ImmoPilot';
    wb.created = new Date();

    /* ——— Synthèse ——— */
    const wsSum = wb.addWorksheet('Synthèse', { properties: { tabColor: { argb: 'FF2563EB' } } });
    wsSum.getColumn(1).width = 42;
    wsSum.getColumn(2).width = 26;
    wsSum.addRow([`ImmoPilot — rapport ${year}`, '']);
    wsSum.getRow(1).font = { size: 15, bold: true };
    wsSum.mergeCells(1, 1, 1, 2);
    wsSum.addRow([`Généré le ${new Date().toLocaleString('fr-FR')}`, '']);
    const metaRow = wsSum.getRow(2);
    metaRow.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
    wsSum.mergeCells(2, 1, 2, 2);
    wsSum.addRow([]);

    type SumRow = { label: string; value: number | string; money?: boolean };
    const sumBlocks: { title: string; rows: SumRow[] }[] = [
      {
        title: 'Patrimoine et baux',
        rows: [
          { label: 'Nombre de biens', value: buildings.length },
          { label: "Nombre d'unités", value: totalUnits },
          { label: 'Unités avec bail actif', value: occupiedUnits },
          { label: 'Unités vacantes', value: Math.max(0, totalUnits - occupiedUnits) },
          { label: 'Baux actifs (contrats)', value: activeLeaseCount },
          { label: 'Locataires enregistrés', value: tenants.length },
        ],
      },
      {
        title: `Charges et impôts (${year})`,
        rows: [
          { label: 'Charges totales enregistrées', value: chargeSummary.totalCharges, money: true },
          { label: 'Dont non réglées', value: chargeSummary.unpaidCharges, money: true },
          { label: 'Impôts et taxes', value: chargeSummary.highlights.impotsEtTaxes, money: true },
          { label: 'Copro et honoraires', value: chargeSummary.highlights.chargesCoproEtHonoraires, money: true },
          { label: 'Sécurité et gardiennage', value: chargeSummary.highlights.securite, money: true },
          { label: 'Salaires et personnel', value: chargeSummary.highlights.personnel, money: true },
        ],
      },
      {
        title: `Loyers — échéances ${year}`,
        rows: [
          { label: 'Nombre d’échéances (lignes)', value: payments.length },
          { label: 'Échéances payées', value: paid.length },
          { label: 'Montant total encaissé', value: totalEncaisse, money: true },
          { label: 'Échéances en retard ou impayées (à date)', value: overdue.length },
          { label: 'Montant dû (lignes en alerte)', value: totalImpayesDu, money: true },
        ],
      },
    ];

    for (const block of sumBlocks) {
      const tr = wsSum.addRow([block.title, '']);
      tr.font = { bold: true, size: 12 };
      wsSum.mergeCells(tr.number, 1, tr.number, 2);
      for (const sr of block.rows) {
        const row = wsSum.addRow([sr.label, sr.value]);
        if (sr.money && typeof sr.value === 'number') {
          row.getCell(2).numFmt = '#,##0 "FCFA"';
        }
      }
      wsSum.addRow([]);
    }

    /* ——— Locataires (contact + bail actif) ——— */
    const locHeaders = [
      'Nom',
      'Prénom',
      'E-mail',
      'Téléphone',
      'Notes locataire',
      'Bien',
      'Commune',
      'Ville',
      'Unité',
      "Type d'unité",
      'Loyer mensuel',
      'Jour échéance',
      'Début bail',
      'Fin bail',
      'Caution',
    ];
    const locData: (string | number | Date | null)[][] = [];
    for (const t of tenants) {
      if (t.leases.length === 0) {
        locData.push([
          t.lastName,
          t.firstName,
          t.email ?? '',
          t.phone ?? '',
          t.notes ?? '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ]);
      } else {
        for (const l of t.leases) {
          const bu = l.unit.building;
          const un = l.unit;
          locData.push([
            t.lastName,
            t.firstName,
            t.email ?? '',
            t.phone ?? '',
            t.notes ?? '',
            bu.name,
            bu.commune,
            bu.city,
            un.label,
            unitKindFr(un.kind),
            l.monthlyRent.toNumber(),
            l.rentDueDay,
            l.startDate,
            l.endDate,
            l.depositAmount != null ? l.depositAmount.toNumber() : '',
          ]);
        }
      }
    }
    this.addDataSheet(wb, 'Locataires', locHeaders, locData, {
      moneyCols: [11, 15],
      dateCols: [13, 14],
      tabColor: 'FF059669',
    });

    /* ——— Tous les baux ——— */
    const leaseHeaders = [
      'Bail actif',
      'Nom',
      'Prénom',
      'E-mail',
      'Téléphone',
      'Bien',
      'Ville',
      'Commune',
      'Unité',
      "Type d'unité",
      'Loyer mensuel',
      'Caution',
      'Jour échéance',
      'Début',
      'Fin',
    ];
    const leaseData = leaseList.map((l) => {
      const bu = l.unit.building;
      const un = l.unit;
      const tn = l.tenant;
      return [
        l.active ? 'Oui' : 'Non',
        tn.lastName,
        tn.firstName,
        tn.email ?? '',
        tn.phone ?? '',
        bu.name,
        bu.city,
        bu.commune,
        un.label,
        unitKindFr(un.kind),
        l.monthlyRent.toNumber(),
        l.depositAmount != null ? l.depositAmount.toNumber() : '',
        l.rentDueDay,
        l.startDate,
        l.endDate,
      ] as (string | number | Date | null)[];
    });
    this.addDataSheet(wb, 'Baux', leaseHeaders, leaseData, {
      moneyCols: [11, 12],
      dateCols: [14, 15],
      tabColor: 'FF7C3AED',
    });

    /* ——— Biens & occupation ——— */
    const imHeaders = ['Bien', 'Ville', 'Commune', 'Adresse', "Nombre d'unités", 'Unités occupées', 'Unités vacantes'];
    const imData = buildings.map((b) => {
      const n = b.units.length;
      const occ = b.units.filter((u) => u.leases.length > 0).length;
      return [b.name, b.city, b.commune, b.address ?? '', n, occ, Math.max(0, n - occ)];
    });
    this.addDataSheet(wb, 'Biens', imHeaders, imData, { tabColor: 'FFCA8A04' });

    /* ——— Paiements de l’année ——— */
    const payHeaders = [
      'Période',
      'Échéance',
      'Statut',
      'Montant dû',
      'Payé le',
      'Montant payé',
      'Locataire',
      'E-mail',
      'Téléphone',
      'Unité',
      'Bien',
      'Ville',
      "Mode d'encaissement",
      'Référence encaissement',
    ];
    const payData = payments.map((p) => {
      const t = p.lease.tenant;
      const bu = p.lease.unit?.building;
      const un = p.lease.unit;
      return [
        `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`,
        p.dueDate,
        paymentStatusFr(p.status),
        p.amountDue.toNumber(),
        p.paidAt ?? '',
        p.amountPaid != null ? p.amountPaid.toNumber() : '',
        t ? `${t.firstName} ${t.lastName}` : '',
        t?.email ?? '',
        t?.phone ?? '',
        un?.label ?? '',
        bu?.name ?? '',
        bu?.city ?? '',
        collectionMethodFr(p.collectionMethod),
        p.collectionReference ?? '',
      ] as (string | number | Date | null)[];
    });
    this.addDataSheet(wb, 'Paiements', payHeaders, payData, {
      moneyCols: [4, 6],
      dateCols: [2, 5],
      tabColor: 'FFDC2626',
    });

    /* ——— Charges détail ——— */
    const chHeaders = [
      'Catégorie',
      'Libellé',
      'Montant',
      'Année',
      'Mois',
      'Payé',
      'Bien',
      'Unité',
      'Notes',
    ];
    const chData = chargeRows.map((c) => [
      chargeCategoryFr(c.category),
      c.label,
      c.amount.toNumber(),
      c.periodYear,
      c.periodMonth ?? '',
      c.paid ? 'Oui' : 'Non',
      c.building.name,
      c.unit?.label ?? '',
      c.notes ?? '',
    ]);
    this.addDataSheet(wb, 'Charges', chHeaders, chData, { moneyCols: [3], tabColor: 'FF0891B2' });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  /**
   * Modèle Excel vide (mêmes en-têtes que l’export) pour import initial — Phase E3.
   */
  async buildImportTemplateExcel(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ImmoPilot';
    wb.created = new Date();

    const guide = wb.addWorksheet('Lisez-moi', { properties: { tabColor: { argb: 'FF2563EB' } } });
    guide.getColumn(1).width = 92;
    const lines = [
      'ImmoPilot — modèle d’import Excel',
      '',
      '1. Remplissez les feuilles Biens, Locataires, Baux, Paiements, Charges (en-têtes à conserver).',
      '2. Réimportez le fichier via Export / import dans l’application.',
      '3. L’import renvoie un rapport : lignes créées / mises à jour, erreurs, avertissements.',
      '4. Ne renommez pas les onglets ni les colonnes d’en-tête.',
      '',
      'Valeurs utiles : statut paiement = Payé | Impayé | En retard | Annulé | Loyer offert',
      'Bail actif = Oui | Non · Unités : Appartement, Maison, Bureau, etc. (comme à l’écran).',
    ];
    for (const line of lines) {
      const row = guide.addRow([line]);
      if (line.startsWith('ImmoPilot')) row.font = { bold: true, size: 14 };
    }

    this.addDataSheet(
      wb,
      'Biens',
      ['Bien', 'Ville', 'Commune', 'Adresse', "Nombre d'unités", 'Unités occupées', 'Unités vacantes'],
      [],
      { tabColor: 'FFCA8A04' },
    );
    this.addDataSheet(
      wb,
      'Locataires',
      [
        'Nom',
        'Prénom',
        'E-mail',
        'Téléphone',
        'Notes locataire',
        'Bien',
        'Commune',
        'Ville',
        'Unité',
        "Type d'unité",
        'Loyer mensuel',
        'Jour échéance',
        'Début bail',
        'Fin bail',
        'Caution',
      ],
      [],
      { tabColor: 'FF059669' },
    );
    this.addDataSheet(
      wb,
      'Baux',
      [
        'Bail actif',
        'Nom',
        'Prénom',
        'E-mail',
        'Téléphone',
        'Bien',
        'Ville',
        'Commune',
        'Unité',
        "Type d'unité",
        'Loyer mensuel',
        'Caution',
        'Jour échéance',
        'Début',
        'Fin',
      ],
      [],
      { tabColor: 'FF7C3AED' },
    );
    this.addDataSheet(
      wb,
      'Paiements',
      [
        'Période',
        'Échéance',
        'Statut',
        'Montant dû',
        'Payé le',
        'Montant payé',
        'Locataire',
        'E-mail',
        'Téléphone',
        'Unité',
        'Bien',
        'Ville',
        "Mode d'encaissement",
        'Référence encaissement',
      ],
      [],
      { tabColor: 'FFDC2626' },
    );
    this.addDataSheet(
      wb,
      'Charges',
      ['Catégorie', 'Libellé', 'Montant', 'Année', 'Mois', 'Payé', 'Bien', 'Unité', 'Notes'],
      [],
      { tabColor: 'FF0891B2' },
    );

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  private addDataSheet(
    wb: ExcelJS.Workbook,
    name: string,
    headers: string[],
    rows: (string | number | Date | null)[][],
    options?: { moneyCols?: number[]; dateCols?: number[]; tabColor?: string },
  ): void {
    const ws = wb.addWorksheet(name, {
      properties: options?.tabColor ? { tabColor: { argb: options.tabColor } } : undefined,
    });
    const hr = ws.addRow(headers);
    hr.font = { bold: true, color: { argb: 'FF0F172A' } };
    hr.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    hr.alignment = { vertical: 'middle', wrapText: true };
    hr.height = 22;
    for (const r of rows) {
      ws.addRow(r);
    }
    const colCount = headers.length;
    if (ws.rowCount >= 1) {
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: colCount },
      };
    }
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    for (let c = 1; c <= colCount; c++) {
      let maxLen = headers[c - 1]?.length ?? 8;
      for (let r = 2; r <= ws.rowCount; r++) {
        const v = ws.getRow(r).getCell(c).value;
        const raw = v instanceof Date ? 10 : v == null ? 0 : String(v).length;
        if (raw > maxLen) maxLen = Math.min(raw, 48);
      }
      ws.getColumn(c).width = Math.min(Math.max(maxLen + 1.5, 11), 50);
    }
    for (const c of options?.moneyCols ?? []) {
      for (let r = 2; r <= ws.rowCount; r++) {
        const cell = ws.getRow(r).getCell(c);
        const v = cell.value;
        if (v !== null && v !== '' && typeof v === 'number') {
          cell.numFmt = '#,##0 "FCFA"';
        }
      }
    }
    for (const c of options?.dateCols ?? []) {
      for (let r = 2; r <= ws.rowCount; r++) {
        const cell = ws.getRow(r).getCell(c);
        const v = cell.value;
        if (v instanceof Date) {
          cell.numFmt = 'dd/mm/yyyy';
        } else if (v === '') {
          cell.value = null;
        }
      }
    }
  }

  /** Tableau récapitulatif (paysage) pour export « comme à l’écran ». */
  async buildLeasesTablePdf(organizationId: string): Promise<Buffer> {
    await this.payments.syncLateStatuses(organizationId);
    const list = await this.leases.list(organizationId);
    const sorted = [...list].sort(
      (a, b) =>
        naturalCompare(a.unit.building.name, b.unit.building.name) ||
        naturalCompare(a.unit.label, b.unit.label) ||
        a.tenant.lastName.localeCompare(b.tenant.lastName, 'fr'),
    );
    const headers = ['Locataire', 'Bien', 'Unité', 'Loyer mensuel', 'Début', 'Fin', 'Statut'];
    const rows = sorted.map((l) => [
      truncPdfCell(`${l.tenant.firstName} ${l.tenant.lastName}`, 28),
      truncPdfCell(l.unit.building.name, 32),
      truncPdfCell(`${l.unit.label} (${unitKindFr(l.unit.kind)})`, 24),
      truncPdfCell(formatFcfaPdf(l.monthlyRent.toNumber()), 16),
      formatDatePdfFr(l.startDate),
      l.endDate ? formatDatePdfFr(l.endDate) : '-',
      l.active ? 'Actif' : 'Inactif',
    ]);
    const n = sorted.length;
    const sub = `${n} contrat${n === 1 ? '' : 's'} de location enregistré${n === 1 ? '' : 's'}`;
    return this.renderDataTablePdf('Registre des baux', sub, headers, rows);
  }

  async buildTenantsTablePdf(organizationId: string): Promise<Buffer> {
    const list = await this.tenants.list(organizationId);
    const headers = ['Locataire', 'Téléphone', 'E-mail', 'Bien et unité'];
    const rows = list.map((t) => {
      const lease = t.leases[0];
      const bu = lease ? `${lease.unit.building.name} - ${lease.unit.label}` : '-';
      return [
        truncPdfCell(`${t.firstName} ${t.lastName}`, 32),
        truncPdfCell(t.phone ?? '-', 22),
        truncPdfCell(t.email ?? '-', 36),
        truncPdfCell(bu, 48),
      ];
    });
    return this.renderDataTablePdf(
      'Registre des locataires',
      `${list.length} fiche${list.length === 1 ? '' : 's'} locataire${list.length === 1 ? '' : 's'}`,
      headers,
      rows,
    );
  }

  async buildBuildingsTablePdf(organizationId: string): Promise<Buffer> {
    const list = await this.buildings.list(organizationId);
    const headers = ['Nom du bien', 'Lieu', 'Type', 'Nb unités'];
    const rows = list.map((b) => [
      truncPdfCell(b.name, 40),
      truncPdfCell([b.commune, b.city].filter(Boolean).join(' - ') || '-', 44),
      this.structureKindLabel(b.structureKind),
      String(b._count.units),
    ]);
    return this.renderDataTablePdf(
      'Patrimoine - synthèse des biens',
      `${list.length} site${list.length === 1 ? '' : 's'} immobilier${list.length === 1 ? '' : 's'}`,
      headers,
      rows,
    );
  }

  async buildLocationsTablePdf(organizationId: string, activeOnly: boolean): Promise<Buffer> {
    const overview = await this.leases.listOverview(organizationId, activeOnly);
    const sorted = [...overview].sort(
      (a, b) =>
        naturalCompare(a.buildingName, b.buildingName) ||
        naturalCompare(a.unitLabel, b.unitLabel) ||
        a.tenantFullName.localeCompare(b.tenantFullName, 'fr'),
    );
    const headers = ['Lieu', 'Bien - unité', 'Locataire', 'Loyer', 'Échéance', 'Mois en cours', 'Bail'];
    const rows = sorted.map((r) => [
      truncPdfCell(r.localizationLine, 28),
      truncPdfCell(`${r.buildingName} - ${r.unitLabel}`, 36),
      truncPdfCell(r.tenantFullName, 28),
      truncPdfCell(formatFcfaPdf(r.monthlyRent), 14),
      `le ${r.rentDueDay}`,
      truncPdfCell(r.currentMonthStatusFr, 14),
      r.active ? 'Actif' : 'Inactif',
    ]);
    const sub = `${sorted.length} occupation${sorted.length === 1 ? '' : 's'}${activeOnly ? ' - baux actifs uniquement' : ' - tous statuts'}`;
    return this.renderDataTablePdf('Locations et statut des loyers', sub, headers, rows);
  }

  private structureKindLabel(k: BuildingStructureKind): string {
    switch (k) {
      case BuildingStructureKind.IMMEUBLE:
        return 'Multi locataires';
      case BuildingStructureKind.TERRAIN_LOTS:
        return 'Terrain lots';
      default:
        return 'Un seul lot';
    }
  }

  private async renderDataTablePdf(
    title: string,
    subtitle: string,
    headers: string[],
    rows: string[][],
  ): Promise<Buffer> {
    const chunks: Buffer[] = [];
    const margin = 44;
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin });
    doc.on('data', (c: Buffer) => chunks.push(c));
    const contentW = doc.page.width - margin * 2;
    const pageH = doc.page.height;
    const pageTop = margin;
    const pageBottom = pageH - margin - 42;

    drawTopBanner(doc, margin, contentW, {
      eyebrow: 'Synthèse exportable',
      title,
      subtitle,
    });

    const startY = doc.y + 6;
    drawZebraTableEqualCols(doc, margin, contentW, pageTop, pageBottom, headers, rows, startY);

    drawFooter(doc, margin, contentW, pageH);
    doc.end();
    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    return Buffer.concat(chunks);
  }

}
