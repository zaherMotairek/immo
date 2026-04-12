import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    filters?: { overdueOnly?: boolean; leaseId?: string; periodYear?: number; periodMonth?: number },
  ) {
    await this.syncLateStatuses();
    const where: Record<string, unknown> = {
      /** Échéances des baux actifs uniquement (baux désactivés = historique hors vue liste). */
      lease: {
        active: true,
        ...(filters?.leaseId ? { id: filters.leaseId } : {}),
        unit: { building: { organizationId } },
      },
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
    if (p.status === PaymentStatus.PAID || p.status === PaymentStatus.CANCELLED) {
      throw new BadRequestException('Cette échéance est déjà soldée ou annulée.');
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

  async update(id: string, organizationId: string, dto: UpdatePaymentDto) {
    await this.ensure(id, organizationId);

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
      if (cur.status === PaymentStatus.PAID || cur.status === PaymentStatus.CANCELLED) {
        throw new BadRequestException('Cette échéance est déjà soldée ou annulée.');
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

  /**
   * Reçu PDF (1 à 24 échéances) : loyer soldé ou acompte (dès qu’un encaissement est enregistré). Reçu groupé = même bail uniquement.
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
      include: { lease: { include: { tenant: true, unit: { include: { building: true } } } } },
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
    const tenantName = `${t.firstName} ${t.lastName}`.trim();
    const loc = [b.commune, b.city].filter(Boolean).join(', ');

    const anyPartial = payments.some((p) => {
      const enc = p.amountPaid?.toNumber() ?? 0;
      return enc + eps < p.amountDue.toNumber();
    });
    doc
      .fontSize(20)
      .text(anyPartial ? 'Reçu d’acompte — loyer' : 'Reçu de paiement — loyer', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#444').text('ImmoPilot — Gestion immobilière', { align: 'center' });
    doc.fillColor('#000000');
    doc.moveDown(1.2);

    doc.fontSize(11).text(`Locataire : ${tenantName}`);
    if (t.phone?.trim()) doc.text(`Téléphone : ${t.phone}`);
    if (t.email?.trim()) doc.text(`E-mail : ${t.email}`);
    doc.moveDown(0.5);
    doc.text(`Bien : ${b.name}`);
    doc.text(`Local / unité : ${u.label}`);
    doc.text(`Lieu : ${loc || '—'}`);
    doc.moveDown(1);

    if (payments.length === 1) {
      const p = first;
      const periodLabel = `${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`;
      const monthLong = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
        new Date(p.periodYear, p.periodMonth - 1, 1),
      );
      const dueN = p.amountDue.toNumber();
      const encN = p.amountPaid?.toNumber() ?? 0;
      const rest = Math.max(0, dueN - encN);
      const paidAtStr = p.paidAt
        ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(p.paidAt)
        : '—';
      doc.fontSize(12).text('Détail', { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(10);
      doc.text(`Période facturée : ${monthLong} (${periodLabel})`);
      doc.text(`Échéance prévue : ${p.dueDate.toISOString().slice(0, 10)}`);
      doc.text(`Montant dû : ${this.fcfa(dueN)}`);
      doc.text(`Montant encaissé (cumul) : ${this.fcfa(encN)}`);
      if (rest > eps) {
        doc.text(`Solde restant dû : ${this.fcfa(rest)}`);
      } else {
        doc.text('Solde : acquitté');
      }
      doc.text(`Date d’encaissement enregistrée (solde) : ${paidAtStr}`);
      doc.text(`Réf. échéance : ${p.id}`);
    } else {
      doc.fontSize(12).text('Détail des versements', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9);
      let totalEnc = 0;
      let totalDue = 0;
      for (const p of payments) {
        const dueN = p.amountDue.toNumber();
        const encN = p.amountPaid?.toNumber() ?? 0;
        totalEnc += encN;
        totalDue += dueN;
        const periodLabel = `${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`;
        const paidAtStr = p.paidAt ? p.paidAt.toISOString().slice(0, 10) : '—';
        const restLine = Math.max(0, dueN - encN);
        doc.text(
          `• ${periodLabel} · encaissé ${this.fcfa(encN)} / dû ${this.fcfa(dueN)}${restLine > eps ? ` · reste ${this.fcfa(restLine)}` : ''} · solde le ${paidAtStr} · ref. ${p.id.slice(0, 8)}…`,
        );
        doc.moveDown(0.2);
      }
      doc.moveDown(0.4);
      doc.fontSize(11).text(`Total encaissé : ${this.fcfa(totalEnc)} · total dû (périodes) : ${this.fcfa(totalDue)}`);
    }

    doc.moveDown(1.2);
    doc
      .fontSize(9)
      .fillColor('#555555')
      .text(
        'Document généré par ImmoPilot à partir des données enregistrées. Conservez ce reçu pour votre comptabilité.',
        { align: 'left' },
      );
    doc.fillColor('#888888');
    doc.text(
      `Édition le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}`,
      { align: 'right' },
    );

    doc.end();
    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    return Buffer.concat(chunks);
  }
}
