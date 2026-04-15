/** Badges & libellés FR pour statuts d’échéance (alignés Prisma PaymentStatus). */

export function statusStyle(status: string) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200';
    case 'LATE':
      return 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200';
    case 'PENDING':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/65 dark:text-amber-200';
    case 'CANCELLED':
      return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    case 'WAIVED':
      return 'bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function statusLabel(status: string) {
  switch (status) {
    case 'PAID':
      return 'Payé';
    case 'LATE':
      return 'En retard';
    case 'PENDING':
      return 'À venir';
    case 'CANCELLED':
      return 'Annulé';
    case 'WAIVED':
      return 'Loyer offert';
    default:
      return status;
  }
}

export function monthTitle(periodYear: number, periodMonth: number) {
  const raw = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
    new Date(periodYear, periodMonth - 1, 1),
  );
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
