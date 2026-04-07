/** Prépare un numéro pour https://wa.me/ (chiffres uniquement, indicatif pays requis). */
export function formatPhoneForWhatsApp(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let d = raw.replace(/\D/g, '');
  if (!d) return null;
  // Côte d’Ivoire : 10 chiffres commençant par 0 (ex. 07 XX XX XX XX)
  if (d.length === 10 && d.startsWith('0')) {
    d = '225' + d.slice(1);
  }
  if (d.length < 8 || d.length > 15) return null;
  return d;
}

export function overdueReminderWhatsAppText(params: {
  firstName: string;
  periodLabel: string;
  amountFcfa: number;
  dueDateStr: string;
  buildingName: string;
  unitLabel: string;
}): string {
  const amountStr = new Intl.NumberFormat('fr-CI', { maximumFractionDigits: 0 }).format(params.amountFcfa);
  return [
    `Bonjour ${params.firstName},`,
    '',
    `Rappel loyer ${params.periodLabel} — ${amountStr} FCFA — échéance ${params.dueDateStr}.`,
    `Bien : ${params.buildingName}, unité ${params.unitLabel}.`,
    '',
    'Merci de procéder au règlement ou de nous contacter.',
    '— ImmoPilot',
  ].join('\n');
}

export function whatsAppWebUrl(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}
