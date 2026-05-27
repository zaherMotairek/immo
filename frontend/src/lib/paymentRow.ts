export type PaymentReminderRow = {
  id: string;
  channel: 'EMAIL' | 'WHATSAPP';
  createdAt: string;
};

export type PaymentRow = {
  id: string;
  /** Présent sur les listes API (regroupement par bail). */
  leaseId?: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  status: string;
  amountDue: unknown;
  amountPaid: unknown | null;
  paidAt: string | null;
  /** Si statut WAIVED : motif et date du geste commercial. */
  waiveReason?: string | null;
  waivedAt?: string | null;
  /** Mode d’encaissement saisi à la main (hors banque). */
  collectionMethod?: string | null;
  collectionReference?: string | null;
  /** Présent uniquement sur POST /payments/:id/collection si notification WhatsApp générée. */
  collectorNotifyUrl?: string;
  /** Présent sur GET /payments/:id — historique relances. */
  reminders?: PaymentReminderRow[];
  collectionTask?: {
    paymentId: string;
    collectorId: string | null;
    status: 'NONE' | 'ASSIGNED' | 'IN_PROGRESS' | 'COLLECTED_REPORTED' | 'CLOSED_PAID';
    assignedAt?: string | null;
    collectedReportedAt?: string | null;
    closedPaidAt?: string | null;
    lastNotifiedAt?: string | null;
    lastMessage?: string | null;
    lastNote?: string | null;
    collectorName?: string | null;
    collectorPhone?: string | null;
    collectorActive?: boolean | null;
  } | null;
  collectionEvents?: Array<{
    id: string;
    eventType: string;
    statusAfter?: string | null;
    note?: string | null;
    messagePayload?: string | null;
    createdAt: string;
    collectorName?: string | null;
  }>;
  lease: {
    tenant: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    };
    unit: { label: string; kind: string; building: { name: string; commune: string; city: string } };
  };
};

export function isOverduePayment(p: PaymentRow) {
  if (p.status === 'WAIVED' || p.status === 'CANCELLED') return false;
  if (p.status === 'LATE') return true;
  if (p.status !== 'PENDING') return false;
  const d = p.dueDate.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return d < today;
}

/** Solde restant (loyer dû − versements enregistrés). */
export function paymentRemaining(p: PaymentRow): number {
  const due = Number(p.amountDue);
  const paid = Number(p.amountPaid ?? 0);
  return Math.max(0, due - paid);
}

export function monthGroupKey(p: PaymentRow) {
  return `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`;
}

/** Résumé affichable (liste / dashboard) — même logique que `collectionTask` sur GET /payments. */
export type CollectionTaskSummary = {
  status: string;
  collectorName?: string | null;
};

/**
 * Badge « mission collecteur » sur une ligne de paiement (loyer pas encore soldé côté collecte terrain).
 */
export function collectionCollectBadge(task: CollectionTaskSummary | null | undefined): {
  label: string;
  className: string;
} | null {
  const st = task?.status;
  if (!st || st === 'NONE' || st === 'CLOSED_PAID') return null;
  const name = task?.collectorName?.trim();
  const who = name ? ` · ${name}` : '';
  switch (st) {
    case 'ASSIGNED':
      return {
        label: `Assigné pour collecter${who}`,
        className:
          'border border-sky-300/90 bg-sky-50 text-sky-900 dark:border-sky-700/80 dark:bg-sky-950/50 dark:text-sky-100',
      };
    case 'IN_PROGRESS':
      return {
        label: `Collecte en cours${who}`,
        className:
          'border border-amber-300/90 bg-amber-50 text-amber-950 dark:border-amber-700/80 dark:bg-amber-950/45 dark:text-amber-100',
      };
    case 'COLLECTED_REPORTED':
      return {
        label: `À marquer payé${who}`,
        className:
          'border border-violet-300/90 bg-violet-50 text-violet-950 dark:border-violet-700/80 dark:bg-violet-950/40 dark:text-violet-100',
      };
    default:
      return null;
  }
}
