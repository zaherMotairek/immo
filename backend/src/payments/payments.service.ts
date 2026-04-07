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

  async list(filters?: { overdueOnly?: boolean; leaseId?: string; periodYear?: number; periodMonth?: number }) {
    await this.syncLateStatuses();
    const where: Record<string, unknown> = {};
    if (filters?.leaseId) where.leaseId = filters.leaseId;
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

  async get(id: string) {
    const p = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        lease: { include: { tenant: true, unit: { include: { building: true } } } },
      },
    });
    if (!p) throw new NotFoundException('Paiement introuvable');
    return p;
  }

  /** Relance locataire par e-mail pour une échéance en retard (LATE ou PENDING dépassé). */
  async sendOverdueReminder(id: string) {
    await this.syncLateStatuses();
    const p = await this.prisma.payment.findUnique({
      where: { id },
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
      const { simulated } = await this.mail.sendOverdueRentReminder({
        to: email,
        tenantFirstName: tenant.firstName,
        periodLabel: `${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`,
        amountFcfa: p.amountDue.toNumber(),
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

  async update(id: string, dto: UpdatePaymentDto) {
    await this.ensure(id);
    const data: Record<string, unknown> = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.paidAt !== undefined) data.paidAt = dto.paidAt ? new Date(dto.paidAt) : null;
    if (dto.amountPaid !== undefined) data.amountPaid = dto.amountPaid;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.status === PaymentStatus.PAID && !data.paidAt) {
      data.paidAt = new Date();
    }
    return this.prisma.payment.update({
      where: { id },
      data,
      include: {
        lease: { include: { tenant: true, unit: { include: { building: true } } } },
      },
    });
  }

  private async ensure(id: string) {
    const n = await this.prisma.payment.count({ where: { id } });
    if (!n) throw new NotFoundException('Paiement introuvable');
  }
}
