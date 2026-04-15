import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { startOfTodayUtc } from '../common/date.util';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** Met à jour les statuts PENDING → LATE si la date d’échéance est passée. */
  async syncLateStatuses() {
    const today = startOfTodayUtc();
    const res = await this.prisma.payment.updateMany({
      where: {
        status: PaymentStatus.PENDING,
        dueDate: { lt: today },
      },
      data: { status: PaymentStatus.LATE },
    });
    return { updated: res.count };
  }

  async list(
    organizationId: string,
    filters?: {
      overdueOnly?: boolean;
      leaseId?: string;
      periodYear?: number;
      periodMonth?: number;
      /** Filtre optionnel : toutes les échéances des baux sur ce bien. */
      buildingId?: string;
      /** Filtre optionnel : une unité précise (avec ou sans buildingId si cohérent). */
      unitId?: string;
      /** Filtre optionnel : toutes les échéances des baux de ce locataire. */
      tenantId?: string;
    },
  ) {
    await this.syncLateStatuses();
    /** Échéances des baux actifs uniquement (baux désactivés = historique hors vue liste). */
    const leaseScope =
      filters?.leaseId != null && filters.leaseId.trim() !== ''
        ? {
            id: filters.leaseId.trim(),
            active: true,
            unit: { building: { organizationId } },
          }
        : {
            active: true,
            ...(filters?.tenantId != null && filters.tenantId.trim() !== ''
              ? { tenantId: filters.tenantId.trim() }
              : {}),
            unit: {
              building: { organizationId },
              ...(filters?.buildingId != null && filters.buildingId.trim() !== ''
                ? { buildingId: filters.buildingId.trim() }
                : {}),
              ...(filters?.unitId != null && filters.unitId.trim() !== ''
                ? { id: filters.unitId.trim() }
                : {}),
            },
          };

    const where: Record<string, unknown> = {
      lease: leaseScope,
    };
    if (filters?.periodYear !== undefined && Number.isInteger(filters.periodYear)) {
      where.periodYear = filters.periodYear;
    }
    if (filters?.periodMonth !== undefined && Number.isInteger(filters.periodMonth)) {
      where.periodMonth = filters.periodMonth;
    }
    if (filters?.overdueOnly) {
      const today = startOfTodayUtc();
      where.OR = [
        { status: PaymentStatus.LATE },
        { status: PaymentStatus.PENDING, dueDate: { lt: today } },
      ];
    }
    return this.prisma.payment.findMany({
      where,
      /** Ordre calendaire : année puis mois (janv. → déc.), puis échéance dans le mois. */
      orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }, { dueDate: 'asc' }],
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { building: true } },
          },
        },
      },
    });
  }

  async get(id: string, organizationId: string) {
    const p = await this.prisma.payment.findFirst({
      where: {
        id,
        lease: { unit: { building: { organizationId } } },
      },
      include: {
        lease: { include: { tenant: true, unit: { include: { building: true } } } },
      },
    });
    if (!p) throw new NotFoundException('Paiement introuvable');
    return p;
  }

  /** Relance locataire par e-mail pour une échéance en retard (LATE ou PENDING dépassé). */
  async sendOverdueReminder(id: string, organizationId: string) {
    await this.syncLateStatuses();
    const p = await this.prisma.payment.findFirst({
      where: { id, lease: { unit: { building: { organizationId } } } },
      include: {
        lease: { include: { tenant: true, unit: { include: { building: true } } } },
      },
    });
    if (!p) throw new NotFoundException('Paiement introuvable');
    if (
      p.status === PaymentStatus.PAID ||
      p.status === PaymentStatus.CANCELLED ||
      p.status === PaymentStatus.WAIVED
    ) {
      throw new BadRequestException('Cette échéance est déjà soldée, annulée ou marquée en gratuité.');
    }
    const today = startOfTodayUtc();
    const overdue =
      p.status === PaymentStatus.LATE ||
      (p.status === PaymentStatus.PENDING && p.dueDate < today);
    if (!overdue) {
      throw new BadRequestException('La relance par e-mail est réservée aux échéances en retard.');
    }
    const tenant = p.lease.tenant;
    const email = tenant.email?.trim();
    if (!email) {
      throw new BadRequestException(
        'Aucune adresse e-mail pour ce locataire. Ajoutez-la dans la fiche Locataires.',
      );
    }
    const bu = p.lease.unit.building;
    const un = p.lease.unit;
    try {
      const due = p.amountDue.toNumber();
      const already = p.amountPaid?.toNumber() ?? 0;
      const remaining = Math.max(0, due - already);
      const { simulated } = await this.mail.sendOverdueRentReminder({
        to: email,
        tenantFirstName: tenant.firstName,
        periodLabel: `${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`,
        amountFcfa: remaining > 0 ? remaining : due,
        dueDateStr: p.dueDate.toISOString().slice(0, 10),
        buildingName: bu.name,
        unitLabel: un.label,
      });
      return {
        ok: true,
        simulated,
        message: simulated
          ? 'E-mail simulé : l’adresse du locataire est bien le destinataire, mais l’API n’a pas de compte d’envoi. Renseignez SMTP_USER et SMTP_PASS dans backend/.env (même compte que pour Outlook / le webmail), puis redémarrez le serveur.'
          : 'E-mail envoyé.',
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Envoi impossible';
      throw new BadRequestException(`Échec d’envoi e-mail : ${msg}`);
    }
  }

  /**
   * Gratuité : le montant dû reste en base (audit), aucun encaissement.
   * Réservé aux échéances encore exigibles (PENDING / LATE).
   */
  async waiveRent(id: string, organizationId: string, reason: string) {
    await this.ensure(id, organizationId);
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      throw new BadRequestException('Le motif de la gratuité doit contenir au moins 3 caractères.');
    }
    const cur = await this.prisma.payment.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException('Paiement introuvable');
    if (
      cur.status === PaymentStatus.PAID ||
      cur.status === PaymentStatus.CANCELLED ||
      String(cur.status) === 'WAIVED'
    ) {
      throw new BadRequestException('Cette échéance ne peut pas être marquée en gratuité dans son état actuel.');
    }
    if (!(PaymentStatus as { WAIVED?: string }).WAIVED) {
      throw new InternalServerErrorException(
        'Client Prisma obsolète : arrêtez le serveur backend, puis dans le dossier backend exécutez « npx prisma generate » et « npx prisma migrate deploy », puis redémarrez.',
      );
    }
    const today = startOfTodayUtc();
    return this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.WAIVED,
        waiveReason: trimmed,
        waivedAt: today,
        amountPaid: null,
        paidAt: null,
      },
      include: {
        lease: { include: { tenant: true, unit: { include: { building: true } } } },
      },
    });
  }

  async update(id: string, organizationId: string, dto: UpdatePaymentDto) {
    await this.ensure(id, organizationId);

    if (dto.status === PaymentStatus.WAIVED) {
      throw new BadRequestException(
        'Utilisez POST /payments/:id/waive avec un motif pour enregistrer une gratuité de loyer.',
      );
    }

    if (dto.addAmountPaid !== undefined && dto.amountPaid !== undefined) {
      throw new BadRequestException(
        'Utilisez soit « addAmountPaid » (versement à ajouter), soit « amountPaid » (total encaissé), pas les deux.',
      );
    }

    if (dto.addAmountPaid !== undefined) {
      if (dto.status !== undefined) {
        throw new BadRequestException(
          'Avec « addAmountPaid », n’envoyez pas « status » : il est calculé automatiquement.',
        );
      }
      const cur = await this.prisma.payment.findUnique({ where: { id } });
      if (!cur) throw new NotFoundException('Paiement introuvable');
      if (
        cur.status === PaymentStatus.PAID ||
        cur.status === PaymentStatus.CANCELLED ||
        cur.status === PaymentStatus.WAIVED
      ) {
        throw new BadRequestException('Cette échéance est déjà soldée, annulée ou marquée en gratuité.');
      }
      const due = cur.amountDue.toNumber();
      const already = cur.amountPaid?.toNumber() ?? 0;
      const add = dto.addAmountPaid;
      const remaining = due - already;
      const eps = 0.005;
      if (remaining <= eps) {
        throw new BadRequestException('Montant dû déjà couvert par les encaissements enregistrés.');
      }
      if (add > remaining + eps) {
        throw new BadRequestException(
          `Versement trop élevé : reste à payer ${new Intl.NumberFormat('fr-FR').format(Math.round(remaining))} FCFA.`,
        );
      }
      const newTotal = already + add;
      const paidFull = newTotal >= due - eps;
      const today = startOfTodayUtc();
      const data: Record<string, unknown> = {
        amountPaid: newTotal,
        status: paidFull ? PaymentStatus.PAID : cur.dueDate < today ? PaymentStatus.LATE : PaymentStatus.PENDING,
        paidAt: paidFull ? (dto.paidAt ? new Date(dto.paidAt) : new Date()) : null,
      };
      if (dto.notes !== undefined) data.notes = dto.notes;
      return this.prisma.payment.update({
        where: { id },
        data,
        include: {
          lease: { include: { tenant: true, unit: { include: { building: true } } } },
        },
      });
    }

    const data: Record<string, unknown> = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.paidAt !== undefined) data.paidAt = dto.paidAt ? new Date(dto.paidAt) : null;
    if (dto.amountPaid !== undefined) data.amountPaid = dto.amountPaid;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.status === PaymentStatus.PAID && !data.paidAt) {
      data.paidAt = new Date();
    }
    if (data.status === PaymentStatus.PAID) {
      const cur = await this.prisma.payment.findUnique({ where: { id }, select: { amountDue: true } });
      if (cur) {
        const due = cur.amountDue.toNumber();
        if (data.amountPaid !== undefined) {
          const ap = Number(data.amountPaid);
          if (ap + 0.005 < due) {
            throw new BadRequestException('Impossible de marquer payé si le montant encaissé est inférieur au loyer dû.');
          }
        } else {
          data.amountPaid = due;
        }
      }
    }
    return this.prisma.payment.update({
      where: { id },
      data,
      include: {
        lease: { include: { tenant: true, unit: { include: { building: true } } } },
      },
    });
  }

  private async ensure(id: string, organizationId: string) {
    const n = await this.prisma.payment.count({
      where: { id, lease: { unit: { building: { organizationId } } } },
    });
    if (!n) throw new NotFoundException('Paiement introuvable');
  }

  private fcfa(n: number) {
    return new Intl.NumberFormat('fr-CI', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
    }).format(n);
  }

  private formatBuildingAddress(b: {
    address: string | null;
    postalCode: string | null;
    commune: string;
    city: string;
  }): string {
    const locality = [b.commune, b.city].filter(Boolean).join(' ');
    const parts = [b.address?.trim() || null, b.postalCode?.trim() || null, locality].filter(Boolean);
    return parts.join(' · ') || '—';
  }

  private unitKindFr(kind: string): string {
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
    return m[kind] ?? kind;
  }

  /**
   * PDF « quittance » (1 à 24 échéances) : loyer soldé ou acompte. Reçu groupé = même bail uniquement.
   */
  async buildReceiptPdf(paymentIds: string[], organizationId: string): Promise<Buffer> {
    if (!paymentIds.length || paymentIds.length > 24) {
      throw new BadRequestException('Indiquez entre 1 et 24 échéances.');
    }
    const uniqueIds = [...new Set(paymentIds)];
    const payments = await this.prisma.payment.findMany({
      where: {
        id: { in: uniqueIds },
        lease: { unit: { building: { organizationId } } },
      },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { building: { include: { organization: { select: { name: true } } } } } },
          },
        },
      },
      orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
    });
    if (payments.length !== uniqueIds.length) {
      throw new NotFoundException('Une ou plusieurs échéances sont introuvables.');
    }
    const eps = 0.005;
    for (const p of payments) {
      const enc = p.amountPaid?.toNumber() ?? 0;
      if (enc <= eps) {
        throw new BadRequestException(
          `Reçu impossible : aucun encaissement enregistré pour ${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}.`,
        );
      }
    }
    const leaseIdFirst = payments[0]!.leaseId;
    if (!payments.every((p) => p.leaseId === leaseIdFirst)) {
      throw new BadRequestException('Un reçu groupé ne peut contenir que des loyers du même bail.');
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PDFDocument = require('pdfkit') as typeof import('pdfkit');
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    doc.on('data', (c: Buffer) => chunks.push(c));

    const first = payments[0]!;
    const t = first.lease.tenant;
    const u = first.lease.unit;
    const b = u.building;
    const orgName = b.organization?.name?.trim();
    const bailleurLabel = orgName || 'Le bailleur';
    const tenantName = `${t.firstName} ${t.lastName}`.trim();
    const lieuFait = [b.commune, b.city].filter(Boolean).join(' ') || '—';
    const adresseLogement = this.formatBuildingAddress(b);

    const anyPartial = payments.some((p) => {
      const enc = p.amountPaid?.toNumber() ?? 0;
      return enc + eps < p.amountDue.toNumber();
    });

    const totalEncaissé = payments.reduce((s, p) => s + (p.amountPaid?.toNumber() ?? 0), 0);
    const totalDû = payments.reduce((s, p) => s + p.amountDue.toNumber(), 0);

    const left = 48;
    const right = 547;
    const contentW = right - left;
    const lineGrey = '#c4c4c4';
    const blue = '#1e3a5f';

    const hr = () => {
      const y = doc.y + 4;
      doc.strokeColor(lineGrey).lineWidth(0.5).moveTo(left, y).lineTo(right, y).stroke();
      doc.strokeColor('#000000').lineWidth(1);
      doc.moveDown(0.85);
    };

    const boxBlock = (title: string, lines: string[]) => {
      const pad = 10;
      const startY = doc.y;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(blue).text(title.toUpperCase(), left, startY, {
        width: contentW,
      });
      doc.moveDown(0.35);
      doc.font('Helvetica').fontSize(10).fillColor('#111');
      for (const line of lines) {
        doc.text(line, { width: contentW - pad * 2, align: 'left' });
      }
      const endY = doc.y + 6;
      doc
        .rect(left, startY - 4, contentW, endY - startY + 8)
        .strokeColor(lineGrey)
        .lineWidth(0.75)
        .stroke();
      doc.strokeColor('#000000').lineWidth(1);
      doc.moveDown(1);
    };

    const ensureSpace = (need: number) => {
      if (doc.y + need > 780) {
        doc.addPage();
        doc.font('Helvetica').fillColor('#111');
      }
    };

    // — En-tête
    doc.font('Helvetica-Bold').fontSize(20).fillColor(blue).text('QUITTANCE DE LOYER', left, 48, {
      width: contentW,
      align: 'center',
    });
    doc.moveDown(0.35);
    doc
      .font('Helvetica-Oblique')
      .fontSize(10)
      .fillColor('#555')
      .text(
        anyPartial
          ? 'Reçu d’acompte sur loyer (solde non entièrement acquitté sur au moins une période)'
          : 'Attestation de paiement du loyer (solde acquitté pour les périodes concernées)',
        { width: contentW, align: 'center' },
      );
    doc.font('Helvetica').fillColor('#111');
    doc.moveDown(0.6);
    doc.fontSize(8).fillColor('#888').text('Document émis via ImmoPilot — gestion immobilière', {
      width: contentW,
      align: 'center',
    });
    doc.fillColor('#111');
    doc.moveDown(1);
    hr();

    boxBlock('Émetteur (bailleur)', [bailleurLabel, b.country?.trim() ? `Pays : ${b.country}` : ''].filter(Boolean));
    boxBlock('Locataire', [
      tenantName,
      ...(t.phone?.trim() ? [`Tél. : ${t.phone}`] : []),
      ...(t.email?.trim() ? [`E-mail : ${t.email}`] : []),
    ]);
    boxBlock('Logement loué', [
      `Immeuble / désignation : ${b.name}`,
      `Lot / unité : ${u.label} (${this.unitKindFr(String(u.kind))})`,
      `Adresse : ${adresseLogement}`,
    ]);

    ensureSpace(120);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(blue).text('Attestation', left, doc.y, { width: contentW });
    doc.moveDown(0.45);
    doc.font('Helvetica').fontSize(10).fillColor('#222');
    const attestationIntro = anyPartial
      ? `Le soussigné, ${bailleurLabel}, atteste avoir reçu de ${tenantName}, en qualité de locataire du logement désigné ci-dessus, les sommes détaillées ci-dessous, au titre du loyer (acompte ou versement partiel selon les périodes).`
      : `Le soussigné, ${bailleurLabel}, atteste avoir reçu de ${tenantName}, en qualité de locataire du logement désigné ci-dessus, les sommes détaillées ci-dessous, au titre du loyer pour les périodes indiquées, le solde étant acquitté pour ces périodes.`;
    doc.text(attestationIntro, { width: contentW, align: 'justify' });
    doc.moveDown(0.9);

    // Tableau
    ensureSpace(80);
    doc.font('Helvetica-Bold').fontSize(10).text('Détail des paiements', { underline: true });
    doc.moveDown(0.5);

    const col = { p: left, d: left + 78, e: left + 168, r: left + 268, date: left + 358, ref: left + 430 };
    const rowH = 14;
    const tableHeaderY = doc.y;
    doc.save();
    doc.fillColor('#e8eef5').rect(left, tableHeaderY - 2, contentW, rowH + 4).fill();
    doc.strokeColor(lineGrey).lineWidth(0.5).rect(left, tableHeaderY - 2, contentW, rowH + 4).stroke();
    doc.restore();
    doc.fillColor('#111');
    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('Période', col.p, tableHeaderY + 1, { width: 70 });
    doc.text('Montant dû', col.d, tableHeaderY + 1, { width: 88 });
    doc.text('Encaissé', col.e, tableHeaderY + 1, { width: 96 });
    doc.text('Solde', col.r, tableHeaderY + 1, { width: 86 });
    doc.text('Date solde', col.date, tableHeaderY + 1, { width: 68 });
    doc.text('Réf.', col.ref, tableHeaderY + 1, { width: right - col.ref });
    doc.font('Helvetica');
    let rowY = tableHeaderY + rowH + 6;

    for (const p of payments) {
      ensureSpace(28);
      if (rowY > 760) {
        doc.addPage();
        rowY = 60;
      }
      const dueN = p.amountDue.toNumber();
      const encN = p.amountPaid?.toNumber() ?? 0;
      const rest = Math.max(0, dueN - encN);
      const periodShort = `${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`;
      const monthLong = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(
        new Date(p.periodYear, p.periodMonth - 1, 1),
      );
      const paidAtStr = p.paidAt ? p.paidAt.toISOString().slice(0, 10) : '—';
      doc.fontSize(8);
      doc.text(`${monthLong}`, col.p, rowY, { width: 70 });
      doc.text(this.fcfa(dueN), col.d, rowY, { width: 88 });
      doc.text(this.fcfa(encN), col.e, rowY, { width: 96 });
      doc.text(rest > eps ? this.fcfa(rest) : '0', col.r, rowY, { width: 86 });
      doc.text(paidAtStr, col.date, rowY, { width: 68 });
      doc.text(p.id.slice(0, 8) + '…', col.ref, rowY, { width: right - col.ref });
      doc.fontSize(7).fillColor('#666').text(`(${periodShort})`, col.p, rowY + 9, { width: 70 });
      doc.fillColor('#111');
      rowY += 22;
    }

    doc.y = rowY + 8;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`Total encaissé (ce document) : ${this.fcfa(totalEncaissé)}`, left, doc.y, { width: contentW });
    doc.moveDown(0.35);
    doc.font('Helvetica').fontSize(9).fillColor('#444');
    doc.text(`Somme des loyers dus sur les périodes listées : ${this.fcfa(totalDû)}`, { width: contentW });
    doc.fillColor('#111');
    doc.moveDown(1.1);

    ensureSpace(100);
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#333');
    doc.text(
      'Pour servir et valoir ce que de droit. La présente quittance annule et remplace tout reçu ou titre du même objet antérieur, le cas échéant.',
      { width: contentW, align: 'justify' },
    );
    doc.font('Helvetica').fillColor('#111');
    doc.moveDown(1);
    doc.fontSize(10).text(`Fait à ${lieuFait}, le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date())}.`);
    doc.moveDown(1.2);
    doc.text('Signature du bailleur (ou du mandataire)', { width: 220 });
    doc.moveDown(2.5);
    doc.strokeColor(lineGrey).lineWidth(0.5).moveTo(left, doc.y).lineTo(left + 220, doc.y).stroke();
    doc.strokeColor('#000000');
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor('#888').text(bailleurLabel, left, doc.y, { width: 220 });

    doc.moveDown(1.5);
    doc.font('Helvetica').fontSize(8).fillColor('#777');
    doc.text(
      'Document généré électroniquement à partir des données enregistrées dans ImmoPilot. Conservez-le pour votre comptabilité et vos obligations fiscales éventuelles.',
      left,
      doc.y,
      { width: contentW, align: 'left' },
    );
    doc.text(
      `Horodatage d’édition : ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}`,
      { width: contentW, align: 'right' },
    );

    doc.end();
    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    return Buffer.concat(chunks);
  }
}
