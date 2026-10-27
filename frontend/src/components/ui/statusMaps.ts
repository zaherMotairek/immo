/** Statuts de paiement reconnus (autres valeurs : affichage neutre avec le texte brut). */
export type PaymentStatusKey = 'PAID' | 'LATE' | 'PENDING' | 'WAIVED' | 'CANCELLED';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusKey, string> = {
  PAID: 'Payé',
  LATE: 'En retard',
  PENDING: 'En attente',
  WAIVED: 'Abandonné',
  CANCELLED: 'Annulé',
};

const STATUS_ALIASES: Record<string, PaymentStatusKey> = {
  PAID: 'PAID',
  LATE: 'LATE',
  OVERDUE: 'LATE',
  PENDING: 'PENDING',
  WAIVED: 'WAIVED',
  CANCELLED: 'CANCELLED',
  CANCELED: 'CANCELLED',
};

/** Normalise un statut libre vers une clé connue, ou `null`. */
export function normalizePaymentStatus(status: string): PaymentStatusKey | null {
  return STATUS_ALIASES[status.trim().toUpperCase()] ?? null;
}

export const COLLECTION_METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  TRANSFER: 'Virement',
  MOBILE_MONEY: 'Mobile money',
  CHECK: 'Chèque',
  OTHER: 'Autre',
};

/** Libellé français d'un mode d'encaissement ; renvoie la valeur brute si inconnue. */
export function getCollectionMethodLabel(method: string): string {
  return COLLECTION_METHOD_LABELS[method.trim().toUpperCase()] ?? method;
}
