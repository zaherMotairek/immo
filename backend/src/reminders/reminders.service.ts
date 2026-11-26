import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  PaymentStatus,
  Prisma,
  ReminderChannel,
  ReminderOutboxStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { AutomationService } from '../automation/automation.service';
import {
  isInQuietHours,
  renderReminderTemplate,
} from '../automation/org-automation.types';
import { WHATSAPP_PROVIDER } from '../whatsapp/whatsapp.module';
import type { WhatsAppProvider } from '../whatsapp/whatsapp.provider';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { addDaysUtc, startOfTodayUtc } from '../common/date.util';

const PERIOD_FR = [
  '',
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly automation: AutomationService,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
  ) {}

  async list(
    organizationId: string,
    filters?: { status?: ReminderOutboxStatus },
  ) {
    const rows = await this.prisma.reminderOutbox.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: [{ status: 'asc' }, { scheduledFor: 'desc' }],
      take: 200,
      include: {
        payment: {
          include: {
            lease: {
              include: {
                tenant: true,
                unit: { include: { building: true } },
              },
            },
          },
        },
      },
    });
    return rows.map((r) => this.serialize(r));
  }

  async enqueueDueForOrganization(organizationId: string): Promise<{ created: number }> {
    const settings = await this.automation.getSettings(organizationId);
    if (!settings.autoRemindersEnabled) return { created: 0 };

    const today = startOfTodayUtc();
    const payments = await this.prisma.payment.findMany({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.LATE] },
        lease: { active: true, unit: { building: { organizationId } } },
      },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { building: true } },
          },
        },
      },
      take: 2000,
    });

    let created = 0;
    for (const p of payments) {
      for (const rule of settings.reminderRules) {
        const target = addDaysUtc(p.dueDate, rule.offsetDays);
        if (target.getTime() > today.getTime()) continue;
        for (const channel of settings.reminderChannels) {
          const vars = this.buildVars(p, settings.templates.reminder);
          const body = vars.body;
          try {
            await this.prisma.reminderOutbox.create({
              data: {
                organizationId,
                paymentId: p.id,
                channel,
                ruleOffsetDays: rule.offsetDays,
                tone: rule.tone ?? null,
                status: ReminderOutboxStatus.QUEUED,
                bodyPreview: body.slice(0, 2000),
                scheduledFor: target,
              },
            });
            created += 1;
          } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
              /* déjà en file — idempotent */
            } else {
              throw e;
            }
          }
        }
      }
    }
    return { created };
  }

  async processQueued(organizationId?: string): Promise<{ sent: number; skipped: number; failed: number }> {
    const now = new Date();
    const where: Prisma.ReminderOutboxWhereInput = {
      status: ReminderOutboxStatus.QUEUED,
      scheduledFor: { lte: now },
      ...(organizationId ? { organizationId } : {}),
    };
    const batch = await this.prisma.reminderOutbox.findMany({
      where,
      take: 100,
      orderBy: { scheduledFor: 'asc' },
      include: {
        payment: {
          include: {
            lease: {
              include: {
                tenant: true,
                unit: { include: { building: true } },
              },
            },
          },
        },
      },
    });

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of batch) {
      const settings = await this.automation.getSettings(row.organizationId);
      if (!settings.autoRemindersEnabled) {
        await this.mark(row.id, ReminderOutboxStatus.SKIPPED, 'Automation relances désactivée.');
        skipped += 1;
        continue;
      }
      if (isInQuietHours(now, settings.quietHoursStart, settings.quietHoursEnd)) {
        continue; /* laisser QUEUED pour plus tard */
      }
      const st = row.payment.status;
      if (
        st === PaymentStatus.PAID ||
        st === PaymentStatus.WAIVED ||
        st === PaymentStatus.CANCELLED
      ) {
        await this.mark(row.id, ReminderOutboxStatus.SKIPPED, `Paiement ${st}.`);
        skipped += 1;
        continue;
      }
      try {
        await this.deliver(row, settings.templates.reminder);
        sent += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await this.mark(row.id, ReminderOutboxStatus.FAILED, msg.slice(0, 500));
        failed += 1;
        this.logger.warn(`Relance ${row.id} échouée : ${msg}`);
      }
    }
    return { sent, skipped, failed };
  }

  async sendNow(id: string, organizationId: string, actor?: JwtAuthUser) {
    const row = await this.ensure(id, organizationId);
    if (row.status === ReminderOutboxStatus.SENT) {
      throw new BadRequestException('Relance déjà envoyée.');
    }
    if (row.status === ReminderOutboxStatus.SKIPPED) {
      throw new BadRequestException('Relance déjà ignorée.');
    }
    const settings = await this.automation.getSettings(organizationId);
    const st = row.payment.status;
    if (st === PaymentStatus.PAID || st === PaymentStatus.WAIVED) {
      await this.mark(id, ReminderOutboxStatus.SKIPPED, `Paiement ${st}.`);
      throw new BadRequestException('Paiement déjà réglé ou abandonné.');
    }
    await this.deliver(row, settings.templates.reminder, actor);
    return this.getOne(id, organizationId);
  }

  async skip(id: string, organizationId: string, actor?: JwtAuthUser) {
    await this.ensure(id, organizationId);
    await this.mark(id, ReminderOutboxStatus.SKIPPED, 'Ignoré manuellement.');
    await this.audit.log({
      organizationId,
      actor,
      action: 'REMINDER_SKIPPED',
      entityType: 'reminder_outbox',
      entityId: id,
      summary: 'Relance ignorée',
    });
    return this.getOne(id, organizationId);
  }

  private async getOne(id: string, organizationId: string) {
    const row = await this.ensure(id, organizationId);
    return this.serialize(row);
  }

  private async ensure(id: string, organizationId: string) {
    const row = await this.prisma.reminderOutbox.findFirst({
      where: { id, organizationId },
      include: {
        payment: {
          include: {
            lease: {
              include: {
                tenant: true,
                unit: { include: { building: true } },
              },
            },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Relance introuvable.');
    return row;
  }

  private async mark(id: string, status: ReminderOutboxStatus, errorMessage?: string) {
    await this.prisma.reminderOutbox.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage ?? null,
        processedAt: new Date(),
      },
    });
  }

  private async deliver(
    row: Awaited<ReturnType<RemindersService['ensure']>>,
    template: string,
    actor?: JwtAuthUser,
  ) {
    const demo = await this.prisma.organization.findUnique({
      where: { id: row.organizationId },
      select: { isDemo: true },
    });
    if (demo?.isDemo) {
      await this.mark(row.id, ReminderOutboxStatus.SKIPPED, 'Org démo : pas d’envoi réel.');
      return;
    }
    const vars = this.buildVars(row.payment, template);
    if (row.channel === ReminderChannel.EMAIL) {
      const email = row.payment.lease.tenant.email?.trim();
      if (!email) throw new Error('E-mail locataire manquant.');
      await this.mail.sendOverdueRentReminder({
        to: email,
        tenantFirstName: vars.prenom,
        periodLabel: vars.periode,
        amountFcfa: Number(row.payment.amountDue),
        dueDateStr: vars.echeance,
        buildingName: row.payment.lease.unit.building.name,
        unitLabel: row.payment.lease.unit.label,
      });
    } else {
      const phone = row.payment.lease.tenant.phone?.trim() || '';
      const res = await this.whatsapp.send({ phoneE164OrLocal: phone, body: vars.body });
      await this.prisma.reminderOutbox.update({
        where: { id: row.id },
        data: { waMeUrl: res.waMeUrl ?? null, bodyPreview: vars.body.slice(0, 2000) },
      });
      if (!res.ok && res.mode === 'cloud_api') {
        // wa.me toujours utile en file manuelle
        if (!res.waMeUrl) throw new Error(res.error);
      } else if (!res.ok) {
        throw new Error(res.error);
      }
    }

    await this.prisma.reminderOutbox.update({
      where: { id: row.id },
      data: {
        status: ReminderOutboxStatus.SENT,
        processedAt: new Date(),
        errorMessage: null,
        bodyPreview: vars.body.slice(0, 2000),
      },
    });

    await this.prisma.paymentReminder.create({
      data: { paymentId: row.paymentId, channel: row.channel },
    });

    await this.audit.log({
      organizationId: row.organizationId,
      actor,
      action: 'REMINDER_SENT',
      entityType: 'reminder_outbox',
      entityId: row.id,
      summary: `Relance ${row.channel} J${row.ruleOffsetDays >= 0 ? '+' : ''}${row.ruleOffsetDays}`,
      metadata: { paymentId: row.paymentId, channel: row.channel, ruleOffsetDays: row.ruleOffsetDays },
    });
  }

  private buildVars(
    payment: {
      amountDue: Prisma.Decimal;
      dueDate: Date;
      periodYear: number;
      periodMonth: number;
      lease: {
        tenant: { firstName: string; lastName: string };
        unit: { label: string; building: { name: string } };
      };
    },
    template: string,
  ) {
    const prenom = payment.lease.tenant.firstName?.trim() || 'locataire';
    const montant = new Intl.NumberFormat('fr-CI', { maximumFractionDigits: 0 }).format(
      Number(payment.amountDue),
    );
    const periode = `${PERIOD_FR[payment.periodMonth] || payment.periodMonth} ${payment.periodYear}`;
    const bien = `${payment.lease.unit.building.name} — ${payment.lease.unit.label}`;
    const echeance = payment.dueDate.toISOString().slice(0, 10);
    const lien_quittance = '';
    const body = renderReminderTemplate(template, {
      prenom,
      montant,
      periode,
      bien,
      echeance,
      lien_quittance,
    });
    return { prenom, montant, periode, bien, echeance, lien_quittance, body };
  }

  private serialize(
    r: Awaited<ReturnType<RemindersService['ensure']>>,
  ) {
    const t = r.payment.lease.tenant;
    return {
      id: r.id,
      status: r.status,
      channel: r.channel,
      ruleOffsetDays: r.ruleOffsetDays,
      tone: r.tone,
      bodyPreview: r.bodyPreview,
      waMeUrl: r.waMeUrl,
      errorMessage: r.errorMessage,
      scheduledFor: r.scheduledFor.toISOString(),
      processedAt: r.processedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      paymentId: r.paymentId,
      paymentStatus: r.payment.status,
      periodYear: r.payment.periodYear,
      periodMonth: r.payment.periodMonth,
      amountDue: Number(r.payment.amountDue),
      tenantName: `${t.firstName} ${t.lastName}`.trim(),
      buildingName: r.payment.lease.unit.building.name,
      unitLabel: r.payment.lease.unit.label,
    };
  }
}
