export type PaymentRow = {
  id: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  status: string;
  amountDue: unknown;
  amountPaid: unknown | null;
  paidAt: string | null;
  lease: {
    tenant: { firstName: string; lastName: string; email: string | null; phone: string | null };
    unit: { label: string; kind: string; building: { name: string; commune: string; city: string } };
  };
};

export function isOverduePayment(p: PaymentRow) {
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
