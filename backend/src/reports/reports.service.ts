import { Injectable } from '@nestjs/common';
import { BuildingStructureKind, ChargeCategory, PaymentStatus, UnitKind } from '@prisma/client';
import * as ExcelJS from 'exceljs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { ChargesService } from '../charges/charges.service';
import { LeasesService } from '../leases/leases.service';
import { TenantsService } from '../tenants/tenants.service';
import { BuildingsService } from '../buildings/buildings.service';
import { startOfTodayUtc } from '../common/date.util';
import {
  drawFooter,
  drawSectionHeading,
  drawTopBanner,
  drawZebraTableEqualCols,
  formatFcfaPdf,
  IMMO_PDF,
} from '../common/immo-pdf';

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

  async buildPdf(year: number, organizationId: string): Promise<Buffer> {
    await this.payments.syncLateStatuses();
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
    await this.payments.syncLateStatuses();
    const today = startOfTodayUtc();
    const leaseInOrg = { unit: { building: { organizationId } } };

    const [chargeSummary, payments, chargeRows, tenants, leaseList, buildings] = await Promise.all([
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
    await this.payments.syncLateStatuses();
    const list = await this.leases.list(organizationId);
    const headers = ['Locataire', 'Bien', 'Unité', 'Loyer mensuel', 'Début', 'Fin', 'Statut'];
    const rows = list.map((l) => [
      this.truncPdfCell(`${l.tenant.firstName} ${l.tenant.lastName}`, 28),
      this.truncPdfCell(l.unit.building.name, 32),
      this.truncPdfCell(`${l.unit.label} (${unitKindFr(l.unit.kind)})`, 24),
      this.truncPdfCell(formatFcfaPdf(l.monthlyRent.toNumber()), 16),
      l.startDate.toISOString().slice(0, 10),
      l.endDate ? l.endDate.toISOString().slice(0, 10) : '—',
      l.active ? 'Actif' : 'Inactif',
    ]);
    const n = list.length;
    const sub = `${n} contrat${n === 1 ? '' : 's'} de location enregistré${n === 1 ? '' : 's'}`;
    return this.renderDataTablePdf('Registre des baux', sub, headers, rows);
  }

  async buildTenantsTablePdf(organizationId: string): Promise<Buffer> {
    const list = await this.tenants.list(organizationId);
    const headers = ['Locataire', 'Téléphone', 'E-mail', 'Bien et unité'];
    const rows = list.map((t) => {
      const lease = t.leases[0];
      const bu = lease ? `${lease.unit.building.name} — ${lease.unit.label}` : '—';
      return [
        this.truncPdfCell(`${t.firstName} ${t.lastName}`, 32),
        this.truncPdfCell(t.phone ?? '—', 22),
        this.truncPdfCell(t.email ?? '—', 36),
        this.truncPdfCell(bu, 48),
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
      this.truncPdfCell(b.name, 40),
      this.truncPdfCell([b.commune, b.city].filter(Boolean).join(' · ') || '—', 44),
      this.structureKindLabel(b.structureKind),
      String(b._count.units),
    ]);
    return this.renderDataTablePdf(
      'Patrimoine — synthèse des biens',
      `${list.length} site${list.length === 1 ? '' : 's'} immobilier${list.length === 1 ? '' : 's'}`,
      headers,
      rows,
    );
  }

  async buildLocationsTablePdf(organizationId: string, activeOnly: boolean): Promise<Buffer> {
    const overview = await this.leases.listOverview(organizationId, activeOnly);
    const headers = ['Lieu', 'Bien — unité', 'Locataire', 'Loyer', 'Échéance', 'Mois en cours', 'Bail'];
    const rows = overview.map((r) => [
      this.truncPdfCell(r.localizationLine, 28),
      this.truncPdfCell(`${r.buildingName} — ${r.unitLabel}`, 36),
      this.truncPdfCell(r.tenantFullName, 28),
      this.truncPdfCell(formatFcfaPdf(r.monthlyRent), 14),
      `le ${r.rentDueDay}`,
      this.truncPdfCell(r.currentMonthStatusFr, 14),
      r.active ? 'Actif' : 'Inactif',
    ]);
    const sub = `${overview.length} occupation${overview.length === 1 ? '' : 's'}${activeOnly ? ' · baux actifs uniquement' : ' · tous statuts'}`;
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

  private truncPdfCell(s: string, maxChars: number): string {
    const t = String(s).replace(/\s+/g, ' ').trim();
    return t.length <= maxChars ? t : `${t.slice(0, Math.max(0, maxChars - 1))}…`;
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
