import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, ReminderChannel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { startOfTodayUtc } from '../common/date.util';
import { amountXofToFrenchWords } from '../common/number-to-french-words';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {
  drawFooter,
  drawPaymentsListKpiSummary,
  drawPaymentsListWorksheetTable,
  drawPaymentsWorksheetInstructionBox,
  drawSectionHeading,
  drawTopBanner,
  drawWorksheetLegend,
  formatFcfaPdf,
  type PaymentsWorksheetRow,
} from '../common/immo-pdf';

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
      include: this.paymentDetailInclude(),
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
      await this.prisma.paymentReminder.create({
        data: { paymentId: p.id, channel: ReminderChannel.EMAIL },
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

  /** Enregistre une relance WhatsApp (après envoi manuel depuis le lien — pas d’API WhatsApp). */
  async logReminder(id: string, organizationId: string, channel: ReminderChannel) {
    await this.syncLateStatuses();
    await this.ensure(id, organizationId);
    const p = await this.prisma.payment.findFirst({
      where: { id, lease: { unit: { building: { organizationId } } } },
      select: { status: true },
    });
    if (!p) throw new NotFoundException('Paiement introuvable');
    if (
      p.status === PaymentStatus.PAID ||
      p.status === PaymentStatus.CANCELLED ||
      p.status === PaymentStatus.WAIVED
    ) {
      throw new BadRequestException('Cette échéance est déjà soldée ou close : inutile de noter une relance.');
    }
    await this.prisma.paymentReminder.create({
      data: { paymentId: id, channel },
    });
    return { ok: true };
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
      include: this.paymentDetailInclude(),
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
      this.mergeCollectionFields(dto, data);
      return this.prisma.payment.update({
        where: { id },
        data,
        include: this.paymentDetailInclude(),
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
    this.mergeCollectionFields(dto, data);
    return this.prisma.payment.update({
      where: { id },
      data,
      include: this.paymentDetailInclude(),
    });
  }

  private paymentDetailInclude() {
    return {
      lease: { include: { tenant: true, unit: { include: { building: true } } } },
      reminders: { orderBy: { createdAt: 'desc' as const }, take: 40 },
    };
  }

  private mergeCollectionFields(dto: UpdatePaymentDto, data: Record<string, unknown>) {
    if (dto.collectionMethod !== undefined) data.collectionMethod = dto.collectionMethod;
    if (dto.collectionReference !== undefined) {
      const t = dto.collectionReference?.trim();
      data.collectionReference = t && t.length > 0 ? t : null;
    }
  }

  private async ensure(id: string, organizationId: string) {
    const n = await this.prisma.payment.count({
      where: { id, lease: { unit: { building: { organizationId } } } },
    });
    if (!n) throw new NotFoundException('Paiement introuvable');
  }

  private formatPeriodRef(month: number, year: number) {
    return `${String(month).padStart(2, '0')} – ${year}`;
  }

  private formatDateNoSlash(d: Date) {
    const pad = (x: number) => String(x).padStart(2, '0');
    return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
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
      GARAGE: 'Garage (parking)',
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
          `Reçu impossible : aucun encaissement enregistré pour ${this.formatPeriodRef(p.periodMonth, p.periodYear)}.`,
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
    const doc = new PDFDocument({ margin: 36, size: 'A4' });
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

    const left = 36;
    const right = 559;
    const contentW = right - left;
    const lineGrey = '#b8c0cc';
    const blue = '#152a45';
    const blueLight = '#2d4a6f';
    const paper = '#faf8f5';
    const ink = '#0f172a';

    const drawChequeFrame = (y0: number, y1: number) => {
      const h = y1 - y0;
      doc.save();
      doc.fillColor(paper).rect(left, y0, contentW, h).fill();
      doc.restore();
      doc.strokeColor(blue).lineWidth(1.25).rect(left, y0, contentW, h).stroke();
      doc.strokeColor(lineGrey).lineWidth(0.55).rect(left + 3, y0 + 3, contentW - 6, h - 6).stroke();
      const tick = 14;
      doc.strokeColor(blue).lineWidth(1);
      doc.moveTo(left, y0 + tick).lineTo(left, y0).lineTo(left + tick, y0).stroke();
      doc.moveTo(right - tick, y0).lineTo(right, y0).lineTo(right, y0 + tick).stroke();
      doc.moveTo(right, y1 - tick).lineTo(right, y1).lineTo(right - tick, y1).stroke();
      doc.moveTo(left + tick, y1).lineTo(left, y1).lineTo(left, y1 - tick).stroke();
    };

    const drawDiagonalGuilloche = (y0: number, y1: number) => {
      doc.save();
      doc.opacity(0.045);
      doc.strokeColor(blue).lineWidth(0.35);
      for (let x = -80; x < contentW + 120; x += 14) {
        doc.moveTo(left + x, y0).lineTo(left + x + (y1 - y0) * 1.15, y1);
        doc.stroke();
      }
      doc.restore();
    };

    const dottedLine = (x1: number, x2: number, y: number) => {
      doc.save();
      doc.strokeColor('#94a3b8').lineWidth(0.6).dash(2, { space: 3 });
      doc.moveTo(x1, y).lineTo(x2, y).stroke();
      doc.undash();
      doc.restore();
    };

    const micrStrip = (y: number, text: string) => {
      const stripH = 22;
      doc.save();
      doc.fillColor('#e8ecf1').rect(left, y, contentW, stripH).fill();
      doc.strokeColor(lineGrey).lineWidth(0.4).moveTo(left, y).lineTo(right, y).stroke();
      doc.restore();
      doc.font('Courier').fontSize(7.5).fillColor('#1e293b').text(text, left + 8, y + 7, {
        width: contentW - 16,
        align: 'center',
        characterSpacing: 0.4,
      });
    };

    const ensureSpace = (need: number) => {
      if (doc.y + need > 780) {
        doc.addPage();
        doc.font('Helvetica').fillColor('#111');
      }
    };

    const frameTop = 42;
    const frameBottom = 800;

    drawChequeFrame(frameTop, frameBottom);
    drawDiagonalGuilloche(frameTop, frameBottom);

    let y = frameTop + 14;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(blueLight).text('QUITTANCE DE LOYER', left + 12, y, {
      width: contentW - 24,
      align: 'center',
    });
    y += 16;
    doc
      .font('Helvetica-Oblique')
      .fontSize(8.5)
      .fillColor('#475569')
      .text(
        anyPartial
          ? 'Reçu d’acompte — solde non entièrement acquitté sur au moins une période'
          : 'Attestation de paiement — solde acquitté pour les périodes concernées',
        left + 12,
        y,
        { width: contentW - 24, align: 'center' },
      );
    y += 14;
    doc.font('Helvetica').fontSize(7).fillColor('#64748b').text('Document émis via ImmoPilot', left + 12, y, {
      width: contentW - 24,
      align: 'center',
    });
    y += 18;

    doc.strokeColor(lineGrey).lineWidth(0.5).moveTo(left + 10, y).lineTo(right - 10, y).stroke();
    y += 10;

    const amountBoxW = 198;
    const amountBoxLeft = right - 12 - amountBoxW;
    const amountBoxTop = y;
    const encWords = amountXofToFrenchWords(totalEncaissé);
    doc.font('Helvetica').fontSize(7);
    const letterBlockH = doc.heightOfString(encWords, { width: amountBoxW - 16 });
    const leftColMinH = b.country?.trim() ? 88 : 74;
    const amountBoxH = Math.max(leftColMinH, 72 + letterBlockH + 10);

    doc.save();
    doc.fillColor('#f8fafc').rect(amountBoxLeft, amountBoxTop, amountBoxW, amountBoxH).fill();
    doc.strokeColor(blue).lineWidth(0.9).rect(amountBoxLeft, amountBoxTop, amountBoxW, amountBoxH).stroke();
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(7).fillColor(blue).text('MONTANT TOTAL ENCAISSÉ', amountBoxLeft + 8, amountBoxTop + 6, {
      width: amountBoxW - 16,
    });
    doc.font('Helvetica-Bold').fontSize(20).fillColor(ink).text(formatFcfaPdf(totalEncaissé), amountBoxLeft + 8, amountBoxTop + 22, {
      width: amountBoxW - 16,
      align: 'right',
    });
    doc.font('Helvetica').fontSize(7).fillColor('#64748b').text('Francs CFA (XOF)', amountBoxLeft + 8, amountBoxTop + 46, {
      width: amountBoxW - 16,
      align: 'right',
    });
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(blue).text('Montant en lettres', amountBoxLeft + 8, amountBoxTop + 56, {
      width: amountBoxW - 16,
    });
    doc.font('Helvetica').fontSize(7).fillColor('#1e293b').text(encWords, amountBoxLeft + 8, amountBoxTop + 64, {
      width: amountBoxW - 16,
      lineGap: 1,
    });

    const textColW = amountBoxLeft - left - 22;
    doc.font('Helvetica-Bold').fontSize(7).fillColor(blue).text('À L’ORDRE DE (locataire)', left + 12, y, { width: textColW });
    doc.font('Helvetica').fontSize(10).fillColor('#0f172a').text(tenantName, left + 12, y + 11, { width: textColW });
    dottedLine(left + 12, left + 12 + textColW, y + 26);

    doc.font('Helvetica-Bold').fontSize(7).fillColor(blue).text('ÉMETTEUR (bailleur)', left + 12, y + 36, { width: textColW });
    doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(bailleurLabel, left + 12, y + 47, { width: textColW });
    if (b.country?.trim()) {
      doc.fontSize(8).fillColor('#334155').text(`Pays : ${b.country}`, left + 12, y + 60, { width: textColW });
    }

    y = amountBoxTop + amountBoxH + 14;

    doc.font('Helvetica-Bold').fontSize(7).fillColor(blue).text('OBJET — LOGEMENT LOUÉ', left + 12, y, { width: contentW - 24 });
    y += 12;
    doc.font('Helvetica').fontSize(9).fillColor('#1e293b').text(`${b.name} — ${u.label} (${this.unitKindFr(String(u.kind))})`, left + 12, y, {
      width: contentW - 24,
    });
    y += 12;
    doc.fontSize(8).fillColor('#475569').text(adresseLogement, left + 12, y, { width: contentW - 24 });
    y += 14;
    if (t.phone?.trim() || t.email?.trim()) {
      doc.fontSize(8).fillColor('#475569').text([t.phone?.trim() ? `Tél. ${t.phone}` : '', t.email?.trim() ? t.email : ''].filter(Boolean).join(' · '), left + 12, y, {
        width: contentW - 24,
      });
      y += 12;
    }

    doc.font('Helvetica').fontSize(9).fillColor('#334155').text(
      anyPartial
        ? `Le soussigné, ${bailleurLabel}, reconnaît avoir reçu de ${tenantName} les sommes ci-dessous au titre du loyer (acompte ou versement partiel selon les périodes).`
        : `Le soussigné, ${bailleurLabel}, reconnaît avoir reçu de ${tenantName} les sommes ci-dessous au titre du loyer ; le solde est acquitté pour les périodes indiquées.`,
      left + 12,
      y,
      { width: contentW - 24, align: 'justify' },
    );
    y = doc.y + 12;

    doc.y = y;
    ensureSpace(80);
    y = doc.y;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(blue).text('DÉTAIL DES PAIEMENTS', left + 12, y, { width: contentW - 24 });
    y += 14;

    const tableInnerLeft = left + 12;
    const tableInnerW = contentW - 24;
    const col = {
      p: tableInnerLeft,
      d: tableInnerLeft + 72,
      e: tableInnerLeft + 148,
      r: tableInnerLeft + 232,
      date: tableInnerLeft + 310,
      ref: tableInnerLeft + 400,
    };
    const rowH = 13;
    const tableHeaderY = y;
    doc.save();
    doc.fillColor('#e8eef5').rect(tableInnerLeft, tableHeaderY - 1, tableInnerW, rowH + 5).fill();
    doc.strokeColor(lineGrey).lineWidth(0.5).rect(tableInnerLeft, tableHeaderY - 1, tableInnerW, rowH + 5).stroke();
    doc.restore();
    doc.fillColor('#111');
    doc.font('Helvetica-Bold').fontSize(7.5);
    doc.text('Période', col.p, tableHeaderY + 2, { width: 68 });
    doc.text('Montant dû', col.d, tableHeaderY + 2, { width: 72 });
    doc.text('Encaissé', col.e, tableHeaderY + 2, { width: 80 });
    doc.text('Solde', col.r, tableHeaderY + 2, { width: 72 });
    doc.text('Date', col.date, tableHeaderY + 2, { width: 82 });
    doc.text('Réf.', col.ref, tableHeaderY + 2, { width: right - 12 - col.ref });
    doc.font('Helvetica');
    let rowY = tableHeaderY + rowH + 7;

    for (const p of payments) {
      ensureSpace(28);
      if (rowY > 720) {
        doc.addPage();
        doc.font('Helvetica').fillColor('#111');
        rowY = 52;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(blue).text('Quittance — suite du détail', left, rowY, { width: contentW });
        rowY += 22;
      }
      const dueN = p.amountDue.toNumber();
      const encN = p.amountPaid?.toNumber() ?? 0;
      const rest = Math.max(0, dueN - encN);
      const periodShort = this.formatPeriodRef(p.periodMonth, p.periodYear);
      const monthLong = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(
        new Date(p.periodYear, p.periodMonth - 1, 1),
      );
      const paidAtStr = p.paidAt ? this.formatDateNoSlash(p.paidAt) : '—';
      doc.fontSize(7.5);
      doc.text(`${monthLong}`, col.p, rowY, { width: 68 });
      doc.text(formatFcfaPdf(dueN), col.d, rowY, { width: 72 });
      doc.text(formatFcfaPdf(encN), col.e, rowY, { width: 80 });
      doc.text(rest > eps ? formatFcfaPdf(rest) : '0', col.r, rowY, { width: 72 });
      doc.text(paidAtStr, col.date, rowY, { width: 82 });
      doc.text(p.id.slice(0, 8) + '…', col.ref, rowY, { width: right - 12 - col.ref });
      doc.fontSize(6.5).fillColor('#64748b').text(`(${periodShort})`, col.p, rowY + 9, { width: 68 });
      doc.fillColor('#111');
      rowY += 20;
    }

    doc.y = rowY + 6;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text(`Total encaissé (ce document) : ${formatFcfaPdf(totalEncaissé)}`, tableInnerLeft, doc.y, { width: tableInnerW });
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(7.5).fillColor('#475569');
    doc.text(`Arrêté à : ${amountXofToFrenchWords(totalEncaissé)}`, { width: tableInnerW });
    doc.moveDown(0.35);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#111');
    doc.text(`Somme des loyers dus (périodes listées) : ${formatFcfaPdf(totalDû)}`, { width: tableInnerW });
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(7.5).fillColor('#475569');
    doc.text(`Arrêté à : ${amountXofToFrenchWords(totalDû)}`, { width: tableInnerW });
    doc.fillColor('#111');
    doc.moveDown(0.75);

    ensureSpace(88);
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#334155');
    doc.text(
      'Pour servir et valoir ce que de droit. La présente quittance annule et remplace tout reçu ou titre du même objet antérieur, le cas échéant.',
      left + 12,
      doc.y,
      { width: contentW - 24, align: 'justify' },
    );
    doc.font('Helvetica').fillColor('#111');
    doc.moveDown(0.7);
    doc.fontSize(9).text(
      `Fait à ${lieuFait}, le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date())}.`,
      left + 12,
      doc.y,
      { width: contentW - 24,
      },
    );
    doc.moveDown(0.9);
    doc.text('Signature du bailleur (ou mandataire)', left + 12, doc.y, { width: 240 });
    const sigY = doc.y + 20;
    doc.strokeColor(lineGrey).lineWidth(0.5).moveTo(left + 12, sigY).lineTo(left + 240, sigY).stroke();
    doc.fontSize(7.5).fillColor('#64748b').text(bailleurLabel, left + 12, sigY + 4, { width: 240 });

    doc.y = sigY + 36;
    doc.font('Helvetica').fontSize(7).fillColor('#64748b');
    doc.text(
      'Document généré électroniquement (ImmoPilot). Conservez-le pour votre comptabilité.',
      left + 12,
      doc.y,
      { width: contentW - 24 },
    );
    const stamp = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
    doc.moveDown(0.35);
    doc.text(stamp, left + 12, doc.y, { width: contentW - 24, align: 'right' });

    const stripH = 22;
    let micrY = doc.y + 18;
    if (micrY + stripH > doc.page.height - 36) {
      doc.addPage();
      doc.font('Helvetica').fillColor('#111');
      micrY = doc.page.height - 36 - stripH;
    }
    const refDoc = `${first.id.slice(0, 8).toUpperCase()}${payments.length > 1 ? `+${payments.length - 1}` : ''}`;
    const micr = `:: QUIT ${refDoc} :: ${String(Math.round(totalEncaissé)).padStart(10, '0')} :: ${leaseIdFirst.slice(0, 8).toUpperCase()} :: XOF ::`;
    doc.save();
    doc.strokeColor(lineGrey).lineWidth(0.45).dash(5, { space: 4 });
    doc.moveTo(left + 16, micrY - 5).lineTo(right - 16, micrY - 5).stroke();
    doc.undash();
    doc.restore();
    micrStrip(micrY, micr);

    doc.end();
    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    return Buffer.concat(chunks);
  }

  private paymentStatusShortFr(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.PAID:
        return 'Payé';
      case PaymentStatus.LATE:
        return 'En retard';
      case PaymentStatus.PENDING:
        return 'À venir';
      case PaymentStatus.CANCELLED:
        return 'Annulé';
      case PaymentStatus.WAIVED:
        return 'Loyer offert';
      default:
        return String(status);
    }
  }

  /** Libellé période lisible (évite MM/AAAA au milieu d’une phrase). */
  private monthYearTitleFr(month: number, year: number): string {
    const raw = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  private paymentsWorksheetFilterCaption(filters?: {
    overdueOnly?: boolean;
    leaseId?: string;
    periodYear?: number;
    periodMonth?: number;
    buildingId?: string;
    unitId?: string;
    tenantId?: string;
  }): string {
    const parts: string[] = [];
    if (filters?.overdueOnly) parts.push('Impayés et retards');
    if (filters?.leaseId?.trim()) parts.push('Un bail spécifique');
    if (filters?.tenantId?.trim()) parts.push('Locataire filtré');
    if (filters?.buildingId?.trim()) parts.push('Bien filtré');
    if (filters?.unitId?.trim()) parts.push('Local filtré');
    if (filters?.periodYear !== undefined && Number.isInteger(filters.periodYear)) {
      if (filters?.periodMonth !== undefined && Number.isInteger(filters.periodMonth)) {
        parts.push(`Période : ${this.monthYearTitleFr(filters.periodMonth, filters.periodYear)}`);
      } else {
        parts.push(`Année : ${filters.periodYear}`);
      }
    }
    return parts.length ? parts.join(' · ') : 'Vue large (sans filtre restrictif sur la période)';
  }

  /**
   * PDF « feuille de route » : même périmètre que GET /payments (filtres query identiques).
   */
  async buildWorksheetPdf(
    organizationId: string,
    filters?: {
      overdueOnly?: boolean;
      leaseId?: string;
      periodYear?: number;
      periodMonth?: number;
      buildingId?: string;
      unitId?: string;
      tenantId?: string;
    },
  ): Promise<Buffer> {
    const all = await this.list(organizationId, filters);
    const MAX = 400;
    const truncated = all.length > MAX;
    const slice = all.slice(0, MAX);

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    let totalDue = 0;
    let totalPaid = 0;
    let totalRemain = 0;
    const rows: PaymentsWorksheetRow[] = [];
    for (const p of slice) {
      const due = p.amountDue.toNumber();
      const paid = p.amountPaid?.toNumber() ?? 0;
      const rem = Math.max(0, due - paid);
      totalDue += due;
      totalPaid += paid;
      totalRemain += rem;

      const tenant = p.lease.tenant ? `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`.trim() : '—';
      const building = p.lease.unit?.building?.name;
      const unit = p.lease.unit?.label;
      const place = [building, unit].filter(Boolean).join(' — ') || '—';
      const period = this.monthYearTitleFr(p.periodMonth, p.periodYear);
      const dueDate =
        p.dueDate instanceof Date ? p.dueDate.toISOString().slice(0, 10) : String(p.dueDate).slice(0, 10);

      rows.push({
        tenant,
        place,
        period,
        dueDate,
        status: this.paymentStatusShortFr(p.status),
        remaining: formatFcfaPdf(rem),
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
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

    const filterCaption = this.paymentsWorksheetFilterCaption(filters);
    const subBits = [
      new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      filterCaption,
    ];
    if (truncated) subBits.push(`PDF : ${MAX} premières lignes sur ${all.length}`);
    const subtitle = subBits.join(' · ');

    drawTopBanner(doc, margin, contentW, {
      eyebrow: org?.name?.trim() || 'Organisation',
      title: 'Feuille de route — Liste des paiements',
      subtitle,
    });

    drawPaymentsWorksheetInstructionBox(doc, margin, contentW);
    drawPaymentsListKpiSummary(
      doc,
      margin,
      contentW,
      {
        filterLabel: filterCaption,
        lineCount: slice.length,
        matchTotal: all.length,
        truncated,
        totalDue,
        totalPaid,
        totalRemain,
      },
      formatFcfaPdf,
    );
    drawSectionHeading(doc, margin, contentW, 'Échéances (même liste que à l’écran)', '1');

    const startY = doc.y;
    drawPaymentsListWorksheetTable(doc, margin, contentW, pageTop, pageBottom, startY, rows);

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
