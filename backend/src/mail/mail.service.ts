import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export type ReminderMailPayload = {
  to: string;
  tenantFirstName: string;
  periodLabel: string;
  amountFcfa: number;
  dueDateStr: string;
  buildingName: string;
  unitLabel: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  /** Envoie un e-mail réel (SMTP) ou l’enregistre dans les logs si MAIL_MODE=log ou SMTP absent. */
  async sendOverdueRentReminder(payload: ReminderMailPayload): Promise<{ simulated: boolean }> {
    const subject = `ImmoPilot — rappel de loyer ${payload.periodLabel}`;
    const amountStr = new Intl.NumberFormat('fr-CI', {
      maximumFractionDigits: 0,
    }).format(payload.amountFcfa);

    const text = [
      `Bonjour ${payload.tenantFirstName},`,
      '',
      `Concernant le bien : ${payload.buildingName} — unité ${payload.unitLabel}.`,
      '',
      `Nous n’avons pas encore enregistré le règlement de votre loyer pour la période ${payload.periodLabel},`,
      `d’un montant de ${amountStr} FCFA, avec échéance le ${payload.dueDateStr}.`,
      '',
      `Merci de procéder au paiement dans les meilleurs délais ou de nous contacter en cas de difficulté.`,
      '',
      `Cordialement,`,
      `L’équipe de gestion (ImmoPilot)`,
    ].join('\n');

    const html = `
<p>Bonjour ${escapeHtml(payload.tenantFirstName)},</p>
<p>Concernant le bien : <strong>${escapeHtml(payload.buildingName)}</strong> — unité <strong>${escapeHtml(payload.unitLabel)}</strong>.</p>
<p>Nous n’avons pas encore enregistré le règlement de votre loyer pour la période <strong>${escapeHtml(payload.periodLabel)}</strong>,
d’un montant de <strong>${escapeHtml(amountStr)} FCFA</strong>, avec échéance le <strong>${escapeHtml(payload.dueDateStr)}</strong>.</p>
<p>Merci de procéder au paiement dans les meilleurs délais ou de nous contacter en cas de difficulté.</p>
<p>Cordialement,<br/>L’équipe de gestion (ImmoPilot)</p>
`.trim();

    const mode = (this.config.get<string>('MAIL_MODE') ?? '').toLowerCase();
    const host = this.config.get<string>('SMTP_HOST');
    const useSmtp = mode !== 'log' && host && host.length > 0;

    if (!useSmtp) {
      this.logger.warn(`[MAIL SIMULATION] À : ${payload.to} — ${subject}`);
      this.logger.log(text);
      return { simulated: true };
    }

    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    const secure = this.config.get<string>('SMTP_SECURE') === 'true' || port === 465;
    const user = (this.config.get<string>('SMTP_USER') ?? '').trim();
    const pass = (this.config.get<string>('SMTP_PASS') ?? '').trim();
    const fromRaw = this.config.get<string>('MAIL_FROM');
    const from = (fromRaw && fromRaw.trim()) || user || `"ImmoPilot" <${user}>`;

    if (!user || !pass) {
      this.logger.warn('SMTP_USER ou SMTP_PASS manquant — bascule en simulation.');
      this.logger.warn(`[MAIL SIMULATION] À : ${payload.to} — ${subject}`);
      this.logger.log(text);
      return { simulated: true };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from,
      to: payload.to,
      subject,
      text,
      html,
    });
    this.logger.log(`E-mail envoyé à ${payload.to} (id ${info.messageId ?? '—'})`);

    return { simulated: false };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
