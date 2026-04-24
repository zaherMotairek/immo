/** Libellés FR — alignés sur l’enum Prisma `CollectionMethod`. */
export function collectionMethodLabel(code: string | null | undefined): string {
  if (!code) return 'Espèces';
  const map: Record<string, string> = {
    CASH: 'Espèces',
    BANK_TRANSFER: 'Virement / dépôt banque',
    ORANGE_MONEY: 'Orange Money',
    MTN_MONEY: 'MTN Mobile Money',
    MOOV: 'Moov Money',
    WAVE: 'Wave',
    OTHER: 'Autre',
  };
  return map[code] ?? code;
}

export const COLLECTION_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '— Espèces (par défaut) —' },
  { value: 'CASH', label: 'Espèces' },
  { value: 'BANK_TRANSFER', label: 'Virement / dépôt banque' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'MTN_MONEY', label: 'MTN Mobile Money' },
  { value: 'MOOV', label: 'Moov Money' },
  { value: 'WAVE', label: 'Wave' },
  { value: 'OTHER', label: 'Autre' },
];

export function reminderChannelLabel(ch: string): string {
  return ch === 'WHATSAPP' ? 'WhatsApp' : ch === 'EMAIL' ? 'E-mail' : ch;
}
