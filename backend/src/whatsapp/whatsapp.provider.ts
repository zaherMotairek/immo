export type WhatsAppSendInput = {
  phoneE164OrLocal: string;
  body: string;
};

export type WhatsAppSendResult =
  | { ok: true; mode: 'wa_me' | 'cloud_api'; waMeUrl?: string; providerMessageId?: string }
  | { ok: false; mode: 'wa_me' | 'cloud_api'; error: string; waMeUrl?: string };

/**
 * Adapter WhatsApp : wa.me (file manuelle) + stub Cloud API derrière env.
 */
export interface WhatsAppProvider {
  send(input: WhatsAppSendInput): Promise<WhatsAppSendResult>;
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Normalise CI / intl grossièrement pour wa.me. */
export function normalizePhoneForWaMe(phone: string): string {
  let d = digitsOnly(phone);
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('0')) d = `225${d.slice(1)}`;
  if (d.length === 8) d = `225${d}`;
  return d;
}

export function buildWaMeUrl(phone: string, body: string): string {
  const n = normalizePhoneForWaMe(phone);
  return `https://wa.me/${n}?text=${encodeURIComponent(body)}`;
}

export class WaMeManualWhatsAppProvider implements WhatsAppProvider {
  async send(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    if (!input.phoneE164OrLocal?.trim()) {
      return { ok: false, mode: 'wa_me', error: 'Téléphone locataire manquant.' };
    }
    const waMeUrl = buildWaMeUrl(input.phoneE164OrLocal, input.body);
    return { ok: true, mode: 'wa_me', waMeUrl };
  }
}

/**
 * Stub Cloud API : si WHATSAPP_CLOUD_TOKEN + WHATSAPP_CLOUD_PHONE_ID absents → fallback wa.me.
 * N’envoie jamais vraiment tant que WHATSAPP_CLOUD_ENABLED !== 'true'.
 */
export class WhatsAppCloudApiStubProvider implements WhatsAppProvider {
  constructor(private readonly fallback = new WaMeManualWhatsAppProvider()) {}

  async send(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    const enabled = (process.env.WHATSAPP_CLOUD_ENABLED || '').toLowerCase() === 'true';
    const token = process.env.WHATSAPP_CLOUD_TOKEN?.trim();
    const phoneId = process.env.WHATSAPP_CLOUD_PHONE_ID?.trim();
    if (!enabled || !token || !phoneId) {
      return this.fallback.send(input);
    }
    // Stub : pas d’appel HTTP réel en Phase C2 (éviter envois accidentels).
    const waMeUrl = buildWaMeUrl(input.phoneE164OrLocal || '000', input.body);
    return {
      ok: false,
      mode: 'cloud_api',
      error: 'WhatsApp Cloud API stub : non branché (utiliser wa.me / file manuelle).',
      waMeUrl,
    };
  }
}
