import { Logger } from '@nestjs/common';
import { ReminderChannel } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { MailService } from '../mail/mail.service';
import type { AuditService } from '../audit/audit.service';
import type { AutomationService } from '../automation/automation.service';
import { renderReminderTemplate } from '../automation/org-automation.types';
import type { WhatsAppProvider } from '../whatsapp/whatsapp.provider';
import type { JwtAuthUser } from '../auth/jwt-user.types';

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

const logger = new Logger('AutoReceipt');

type ShareLinkFactory = (
  paymentId: string,
  organizationId: string,
  actor?: JwtAuthUser,
) => Promise<{ shareUrl: string }>;

/**
 * C3 : après passage PAID, envoie le lien quittance si opt-in org.
 * Erreurs soft (log) — n’annule pas l’encaissement.
 */
export async function maybeSendAutoReceipt(deps: {
  prisma: PrismaService;
  mail: MailService;
  audit: AuditService;
  automation: AutomationService;
  whatsapp: WhatsAppProvider;
  createShareLink: ShareLinkFactory;
  paymentId: string;
  organizationId: string;
  actor?: JwtAuthUser;
}): Promise<void> {
  try {
    const org = await deps.prisma.organization.findUnique({
      where: { id: deps.organizationId },
      select: { isDemo: true },
    });
    if (org?.isDemo) return;

    const settings = await deps.automation.getSettings(deps.organizationId);
    if (!settings.autoReceiptEnabled) return;

    const payment = await deps.prisma.payment.findFirst({
      where: {
        id: deps.paymentId,
        lease: { unit: { building: { organizationId: deps.organizationId } } },
      },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { building: true } },
          },
        },
      },
    });
    if (!payment) return;

    const { shareUrl } = await deps.createShareLink(
      deps.paymentId,
      deps.organizationId,
      deps.actor,
    );

    const prenom = payment.lease.tenant.firstName?.trim() || 'locataire';
    const montant = new Intl.NumberFormat('fr-CI', { maximumFractionDigits: 0 }).format(
      Number(payment.amountPaid ?? payment.amountDue),
    );
    const periode = `${PERIOD_FR[payment.periodMonth] || payment.periodMonth} ${payment.periodYear}`;
    const bien = `${payment.lease.unit.building.name} — ${payment.lease.unit.label}`;
    const echeance = payment.dueDate.toISOString().slice(0, 10);
    const body = renderReminderTemplate(settings.templates.receipt, {
      prenom,
      montant,
      periode,
      bien,
      echeance,
      lien_quittance: shareUrl,
    });

    const channels = settings.receiptChannels?.length
      ? settings.receiptChannels
      : settings.reminderChannels;

    for (const channel of channels) {
      if (channel === ReminderChannel.EMAIL) {
        const email = payment.lease.tenant.email?.trim();
        if (!email) {
          logger.warn(`Quittance auto : e-mail manquant (${deps.paymentId})`);
          continue;
        }
        await deps.mail.sendTextEmail(email, `ImmoPilot — quittance ${periode}`, body);
      } else {
        const phone = payment.lease.tenant.phone?.trim() || '';
        const res = await deps.whatsapp.send({ phoneE164OrLocal: phone, body });
        if (!res.ok && !res.waMeUrl) {
          logger.warn(`Quittance auto WA : ${res.error}`);
        }
      }
    }

    await deps.audit.log({
      organizationId: deps.organizationId,
      actor: deps.actor,
      action: 'PAYMENT_AUTO_RECEIPT_SENT',
      entityType: 'payment',
      entityId: deps.paymentId,
      summary: 'Quittance auto envoyée',
      metadata: { channels, shareUrl },
    });
  } catch (err) {
    logger.warn(
      `Quittance auto échouée (${deps.paymentId}) : ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
