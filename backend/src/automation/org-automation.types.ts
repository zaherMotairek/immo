import { ReminderChannel } from '@prisma/client';

export type ReminderTone = 'friendly' | 'neutral' | 'firm';

export type ReminderRule = {
  /** Jours relatifs à l’échéance : -3 = J-3, 0 = jour J, 5 = J+5. */
  offsetDays: number;
  tone?: ReminderTone;
};

export type OrgAutomationSettings = {
  /** C1 : étendre les échéances open-ended / horizon 12 mois + job annuel. */
  autoGenerateSchedules: boolean;
  /** C2 : file de relances automatiques. */
  autoRemindersEnabled: boolean;
  /** C3 : envoyer le lien quittance à l’encaissement (PAID). */
  autoReceiptEnabled: boolean;
  reminderRules: ReminderRule[];
  reminderChannels: ReminderChannel[];
  /** Canaux pour la quittance auto (défaut = same as reminderChannels). */
  receiptChannels: ReminderChannel[];
  /** Heure locale Africa/Abidjan : début quiet hours (inclus). */
  quietHoursStart: number;
  /** Heure locale : fin quiet hours (exclusive). Ex. 20→7 = nuit. */
  quietHoursEnd: number;
  templates: {
    reminder: string;
    receipt: string;
  };
};

export const DEFAULT_AUTOMATION_SETTINGS: OrgAutomationSettings = {
  autoGenerateSchedules: false,
  autoRemindersEnabled: false,
  autoReceiptEnabled: false,
  reminderRules: [
    { offsetDays: -3, tone: 'friendly' },
    { offsetDays: 0, tone: 'neutral' },
    { offsetDays: 5, tone: 'firm' },
    { offsetDays: 15, tone: 'firm' },
  ],
  reminderChannels: [ReminderChannel.EMAIL, ReminderChannel.WHATSAPP],
  receiptChannels: [ReminderChannel.EMAIL, ReminderChannel.WHATSAPP],
  quietHoursStart: 20,
  quietHoursEnd: 7,
  templates: {
    reminder:
      'Bonjour {prenom},\n\nRappel loyer {periode} — {montant} FCFA — échéance {echeance}.\nBien : {bien}.\n{lien_quittance}\n\nCordialement',
    receipt:
      'Bonjour {prenom},\n\nNous confirmons la réception de votre loyer {periode} ({montant} FCFA).\nBien : {bien}.\nQuittance : {lien_quittance}\n\nMerci — ImmoPilot',
  },
};

function parseChannels(raw: unknown): ReminderChannel[] | null {
  if (!Array.isArray(raw)) return null;
  const ch = raw.filter(
    (c): c is ReminderChannel => c === ReminderChannel.EMAIL || c === ReminderChannel.WHATSAPP,
  );
  return ch.length ? ch : null;
}

export function parseAutomationSettings(raw: unknown): OrgAutomationSettings {
  const base = { ...DEFAULT_AUTOMATION_SETTINGS, templates: { ...DEFAULT_AUTOMATION_SETTINGS.templates } };
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  if (typeof o.autoGenerateSchedules === 'boolean') base.autoGenerateSchedules = o.autoGenerateSchedules;
  if (typeof o.autoRemindersEnabled === 'boolean') base.autoRemindersEnabled = o.autoRemindersEnabled;
  if (typeof o.autoReceiptEnabled === 'boolean') base.autoReceiptEnabled = o.autoReceiptEnabled;
  if (Array.isArray(o.reminderRules)) {
    base.reminderRules = o.reminderRules
      .filter((r): r is ReminderRule => !!r && typeof r === 'object' && typeof (r as ReminderRule).offsetDays === 'number')
      .map((r) => ({
        offsetDays: Math.trunc(r.offsetDays),
        tone: r.tone === 'friendly' || r.tone === 'firm' || r.tone === 'neutral' ? r.tone : 'neutral',
      }));
  }
  const remCh = parseChannels(o.reminderChannels);
  if (remCh) base.reminderChannels = remCh;
  const recCh = parseChannels(o.receiptChannels);
  if (recCh) base.receiptChannels = recCh;
  if (typeof o.quietHoursStart === 'number' && o.quietHoursStart >= 0 && o.quietHoursStart <= 23) {
    base.quietHoursStart = Math.trunc(o.quietHoursStart);
  }
  if (typeof o.quietHoursEnd === 'number' && o.quietHoursEnd >= 0 && o.quietHoursEnd <= 23) {
    base.quietHoursEnd = Math.trunc(o.quietHoursEnd);
  }
  if (o.templates && typeof o.templates === 'object') {
    const t = o.templates as Record<string, unknown>;
    if (typeof t.reminder === 'string' && t.reminder.trim()) base.templates.reminder = t.reminder;
    if (typeof t.receipt === 'string' && t.receipt.trim()) base.templates.receipt = t.receipt;
  }
  return base;
}

export function renderReminderTemplate(
  template: string,
  vars: {
    prenom: string;
    montant: string;
    periode: string;
    bien: string;
    echeance: string;
    lien_quittance: string;
  },
): string {
  return template
    .replaceAll('{prenom}', vars.prenom)
    .replaceAll('{montant}', vars.montant)
    .replaceAll('{periode}', vars.periode)
    .replaceAll('{bien}', vars.bien)
    .replaceAll('{echeance}', vars.echeance)
    .replaceAll('{lien_quittance}', vars.lien_quittance);
}

/** Quiet hours Africa/Abidjan (= UTC) : true si on ne doit pas envoyer. */
export function isInQuietHours(now: Date, startHour: number, endHour: number): boolean {
  const h = now.getUTCHours();
  if (startHour === endHour) return false;
  if (startHour < endHour) return h >= startHour && h < endHour;
  return h >= startHour || h < endHour;
}
