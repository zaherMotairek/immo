import { Injectable } from '@nestjs/common';
import { ChargeCategory, PaymentStatus, UnitKind } from '@prisma/client';
import * as ExcelJS from 'exceljs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { ChargesService } from '../charges/charges.service';
import { startOfTodayUtc } from '../common/date.util';

function paymentStatusFr(s: PaymentStatus | undefined): string {
  if (!s) return '—';
  switch (s) {
    case PaymentStatus.PAID:
      return 'Payé';
    case PaymentStatus.LATE:
      return 'En retard';
    case PaymentStatus.CANCELLED:
      return 'Annulé';
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
    GARAGE: 'Garage / parking',
    OTHER: 'Autre',
  };
  return m[String(k)] ?? String(k);
}

function chargeCategoryFr(c: ChargeCategory | string): string {
  const m: Record<string, string> = {
    TAX: 'Impôts / taxes',
    FEES: 'Copro / honoraires',
    INSURANCE: 'Assurance',
    MAINTENANCE: 'Entretien / travaux',
    UTILITIES: 'Eau / énergie',
    SECURITY: 'Sécurité / gardiennage',
    PAYROLL: 'Salaires & personnel',
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
  ) {}

  async buildPdf(year: number): Promise<Buffer> {
    await this.payments.syncLateStatuses();
    const [chargeSummary, overdue, allPaidYear] = await Promise.all([
      this.charges.summary(year),
      this.prisma.payment.findMany({
        where: {
          periodYear: year,
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
        where: { periodYear: year, status: PaymentStatus.PAID },
        include: {
          lease: { include: { tenant: true, unit: { include: { building: true } } } },
        },
      }),
    ]);

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    doc.on('data', (c: Buffer) => chunks.push(c));

    doc.fontSize(18).text('ImmoPilot — Rapport annuel', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#444').text(`Année ${year}`, { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown(1.5);

    doc.fontSize(12).text('Synthèse charges & impôts', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Total charges enregistrées : ${this.fcfa(chargeSummary.totalCharges)}`);
    doc.text(`Dont non réglées : ${this.fcfa(chargeSummary.unpaidCharges)}`);
    doc.text(`Impôts / taxes (catégorie TAX) : ${this.fcfa(chargeSummary.highlights.impotsEtTaxes)}`);
    doc.text(`Charges copro / honoraires (FEES) : ${this.fcfa(chargeSummary.highlights.chargesCoproEtHonoraires)}`);
    doc.text(`Sécurité / gardiennage (SECURITY) : ${this.fcfa(chargeSummary.highlights.securite)}`);
    doc.text(`Salaires & personnel (PAYROLL) : ${this.fcfa(chargeSummary.highlights.personnel)}`);
    doc.moveDown(1);

    doc.fontSize(12).text('Loyers encaissés (année)', { underline: true });
    doc.moveDown(0.3);
    const encaisse = allPaidYear.reduce((s, p) => s + (p.amountPaid?.toNumber() ?? p.amountDue.toNumber()), 0);
    doc.fontSize(10).text(`Nombre d’échéances payées : ${allPaidYear.length}`);
    doc.text(`Montant total enregistré : ${this.fcfa(encaisse)}`);
    doc.moveDown(1);

    doc.fontSize(12).text('Alertes — échéances en retard ou impayées', { underline: true });
    doc.moveDown(0.3);
    if (overdue.length === 0) {
      doc.fontSize(10).text('Aucune échéance en retard pour cette année.');
    } else {
      doc.fontSize(9);
      for (const p of overdue.slice(0, 25)) {
        const t = p.lease.tenant;
        const name = t ? `${t.firstName} ${t.lastName}` : '—';
        const unitLabel = p.lease.unit?.label ?? '—';
        const im = p.lease.unit?.building?.name ?? '—';
        doc.text(
          `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')} · ${name} · ${unitLabel} (${im}) · ${this.fcfa(p.amountDue.toNumber())} · échéance ${p.dueDate.toISOString().slice(0, 10)}`,
        );
      }
      if (overdue.length > 25) doc.text(`… et ${overdue.length - 25} autre(s) ligne(s).`);
    }

    doc.moveDown(1.5);
    doc.fontSize(8).fillColor('#888').text(`Généré le ${new Date().toLocaleString('fr-FR')}`, { align: 'right' });

    doc.end();
    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    return Buffer.concat(chunks);
  }

  async buildExcel(year: number): Promise<Buffer> {
    await this.payments.syncLateStatuses();
    const today = startOfTodayUtc();

    const [chargeSummary, payments, chargeRows, tenants, leaseList, buildings] = await Promise.all([
      this.charges.summary(year),
      this.prisma.payment.findMany({
        where: { periodYear: year },
        orderBy: [{ dueDate: 'asc' }],
        include: {
          lease: { include: { tenant: true, unit: { include: { building: true } } } },
        },
      }),
      this.prisma.charge.findMany({
        where: { periodYear: year },
        include: { building: true, unit: true },
        orderBy: [{ buildingId: 'asc' }, { periodMonth: 'asc' }],
      }),
      this.prisma.tenant.findMany({
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          leases: {
            where: { active: true },
            include: { unit: { include: { building: true } } },
          },
        },
      }),
      this.prisma.lease.findMany({
        orderBy: [{ active: 'desc' }, { startDate: 'desc' }],
        include: {
          tenant: true,
          unit: { include: { building: true } },
        },
      }),
      this.prisma.building.findMany({
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
        title: 'Patrimoine & baux',
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
        title: `Charges & impôts (${year})`,
        rows: [
          { label: 'Charges totales enregistrées', value: chargeSummary.totalCharges, money: true },
          { label: 'Dont non réglées', value: chargeSummary.unpaidCharges, money: true },
          { label: 'Impôts / taxes', value: chargeSummary.highlights.impotsEtTaxes, money: true },
          { label: 'Copro / honoraires', value: chargeSummary.highlights.chargesCoproEtHonoraires, money: true },
          { label: 'Sécurité / gardiennage', value: chargeSummary.highlights.securite, money: true },
          { label: 'Salaires & personnel', value: chargeSummary.highlights.personnel, money: true },
        ],
      },
      {
        title: `Loyers — échéances ${year}`,
        rows: [
          { label: 'Nombre d’échéances (lignes)', value: payments.length },
          { label: 'Échéances payées', value: paid.length },
          { label: 'Montant total encaissé', value: totalEncaisse, money: true },
          { label: 'Échéances en retard / impayées (à date)', value: overdue.length },
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

  private fcfa(n: number) {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
  }
}
