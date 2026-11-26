import { toast } from '@/components/ui/Toast';

const TOKEN_KEY = 'immopilot_token';
const USER_KEY = 'immopilot_user';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  organizationId?: string;
  organizationName?: string | null;
  role?: 'USER' | 'PLATFORM_ADMIN';
  readOnly?: boolean;
  impersonatorId?: string;
  isDemo?: boolean;
};

export function getStoredUser(): SessionUser | null {
  try {
    const s = localStorage.getItem(USER_KEY);
    if (!s) return null;
    return JSON.parse(s) as SessionUser;
  } catch {
    return null;
  }
}

export function setStoredUser(u: SessionUser | null) {
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(USER_KEY);
}

/** En dev, le proxy Vite pointe vers l’API ; en prod, définir VITE_API_URL. */
export function apiBaseUrl(): string {
  const v = import.meta.env.VITE_API_URL as string | undefined;
  return v?.replace(/\/$/, '') ?? '';
}

function baseUrl(): string {
  return apiBaseUrl();
}

export async function api<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body = init?.body;
  if (init?.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${baseUrl()}${path}`, { ...init, headers, body });
  if (res.status === 401) {
    setToken(null);
    setStoredUser(null);
    window.dispatchEvent(new Event('immopilot:logout'));
  }
  if (!res.ok) {
    let msg = res.statusText;
    const errCt = res.headers.get('content-type');
    try {
      if (errCt?.includes('application/json')) {
        const j = (await res.json()) as { message?: string | string[] };
        if (j?.message) msg = Array.isArray(j.message) ? j.message.join(', ') : String(j.message);
      } else {
        const t = await res.text();
        if (t) msg = t;
      }
    } catch {
      /* ignore */
    }
    if (res.status === 404 && /Cannot (POST|GET|PATCH|DELETE)\s+\//.test(msg)) {
      msg =
        'Cette fonction n’existe pas encore sur l’API en ligne : redéployez le service API sur Render (pas seulement le front), puis réessayez.';
    }
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as T;
}

export type LeaseContractMeta = {
  fileKey?: string;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  uploadedAt: string | null;
};

export type TenantIdDocumentMeta = {
  fileKey?: string;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  uploadedAt: string | null;
};

export async function uploadLeaseContract(
  leaseId: string,
  file: File,
): Promise<{ ok: boolean; fileName: string; mimeType: string; size: number; uploadedAt: string }> {
  const token = getToken();
  const fd = new FormData();
  fd.append('file', file);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl()}/leases/${leaseId}/contract`, {
    method: 'POST',
    headers,
    body: fd,
  });
  if (res.status === 401) {
    setToken(null);
    setStoredUser(null);
    window.dispatchEvent(new Event('immopilot:logout'));
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      if (j?.message) msg = Array.isArray(j.message) ? j.message.join(', ') : String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as {
    ok: boolean;
    fileName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  };
}

export async function deleteLeaseContract(leaseId: string): Promise<void> {
  await api(`/leases/${leaseId}/contract`, { method: 'DELETE' });
}

export async function listLeaseContracts(leaseId: string): Promise<LeaseContractMeta[]> {
  return api<LeaseContractMeta[]>(`/leases/${leaseId}/contracts`);
}

export async function deleteLeaseContractByKey(leaseId: string, fileKey: string): Promise<void> {
  await api(`/leases/${leaseId}/contracts/${encodeURIComponent(fileKey)}`, { method: 'DELETE' });
}

export async function uploadTenantIdDocument(
  tenantId: string,
  file: File,
): Promise<{ ok: boolean; fileName: string; mimeType: string; size: number; uploadedAt: string }> {
  const token = getToken();
  const fd = new FormData();
  fd.append('file', file);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl()}/tenants/${tenantId}/id-document`, {
    method: 'POST',
    headers,
    body: fd,
  });
  if (res.status === 401) {
    setToken(null);
    setStoredUser(null);
    window.dispatchEvent(new Event('immopilot:logout'));
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      if (j?.message) msg = Array.isArray(j.message) ? j.message.join(', ') : String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as {
    ok: boolean;
    fileName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  };
}

export async function deleteTenantIdDocument(tenantId: string): Promise<void> {
  await api(`/tenants/${tenantId}/id-document`, { method: 'DELETE' });
}

export async function listTenantIdDocuments(tenantId: string): Promise<TenantIdDocumentMeta[]> {
  return api<TenantIdDocumentMeta[]>(`/tenants/${tenantId}/id-documents`);
}

export async function deleteTenantIdDocumentByKey(tenantId: string, fileKey: string): Promise<void> {
  await api(`/tenants/${tenantId}/id-documents/${encodeURIComponent(fileKey)}`, { method: 'DELETE' });
}

export function openTenantIdDocumentPreview(tenantId: string, fileKey?: string): void {
  const token = getToken();
  const url = fileKey
    ? `${baseUrl()}/tenants/${tenantId}/id-documents/${encodeURIComponent(fileKey)}`
    : `${baseUrl()}/tenants/${tenantId}/id-document`;
  fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((r) => {
      if (!r.ok) throw new Error('Impossible d’afficher le document');
      return r.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
    })
    .catch(() => toast('Impossible d’afficher la pièce d’identité.', { variant: 'error' }));
}

export function downloadTenantIdDocumentFile(tenantId: string, suggestedName: string, fileKey?: string): void {
  const token = getToken();
  const url = fileKey
    ? `${baseUrl()}/tenants/${tenantId}/id-documents/${encodeURIComponent(fileKey)}`
    : `${baseUrl()}/tenants/${tenantId}/id-document`;
  fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((r) => {
      if (!r.ok) throw new Error('Téléchargement impossible');
      return r.blob();
    })
    .then((blob) => {
      const a = document.createElement('a');
      const hasExt = /\.[a-z0-9]{2,4}$/i.test(suggestedName);
      const ext =
        hasExt ? '' : blob.type === 'application/pdf' ? '.pdf' : blob.type === 'image/png' ? '.png' : '.jpg';
      a.href = URL.createObjectURL(blob);
      a.download = hasExt ? suggestedName : `${suggestedName}${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(() => toast('Impossible de télécharger le fichier.', { variant: 'error' }));
}

/** Ouvre le contrat dans un nouvel onglet (session requise). */
export function openLeaseContractPreview(leaseId: string, fileKey?: string): void {
  const token = getToken();
  const url = fileKey
    ? `${baseUrl()}/leases/${leaseId}/contracts/${encodeURIComponent(fileKey)}`
    : `${baseUrl()}/leases/${leaseId}/contract`;
  fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((r) => {
      if (!r.ok) throw new Error('Impossible d’afficher le contrat');
      return r.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
    })
    .catch(() => toast('Impossible d’afficher le contrat.', { variant: 'error' }));
}

export function downloadLeaseContractFile(leaseId: string, suggestedName: string, fileKey?: string): void {
  const token = getToken();
  const url = fileKey
    ? `${baseUrl()}/leases/${leaseId}/contracts/${encodeURIComponent(fileKey)}`
    : `${baseUrl()}/leases/${leaseId}/contract`;
  fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((r) => {
      if (!r.ok) throw new Error('Téléchargement impossible');
      return r.blob();
    })
    .then((blob) => {
      const a = document.createElement('a');
      const hasExt = /\.[a-z0-9]{2,4}$/i.test(suggestedName);
      const ext =
        hasExt ? '' : blob.type === 'application/pdf' ? '.pdf' : blob.type === 'image/png' ? '.png' : '.jpg';
      a.href = URL.createObjectURL(blob);
      a.download = hasExt ? suggestedName : `${suggestedName}${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(() => toast('Impossible de télécharger le contrat.', { variant: 'error' }));
}

/** Télécharge le reçu PDF d’une échéance (acompte ou solde, session JWT). */
export function downloadPaymentReceipt(paymentId: string) {
  const token = getToken();
  if (!token) {
    toast('Connectez-vous pour télécharger le reçu.', { variant: 'warning' });
    return;
  }
  const url = `${baseUrl()}/payments/${encodeURIComponent(paymentId)}/receipt`;
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => {
      if (!r.ok) throw new Error('Reçu indisponible');
      return r.blob();
    })
    .then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `recu-loyer-${paymentId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(() =>
      toast('Impossible de télécharger le reçu (vérifiez qu’au moins un versement est enregistré sur l’échéance).', {
        variant: 'error',
      }),
    );
}

/** Reçu PDF unique pour plusieurs échéances payées (même bail), ex. prépaiement de plusieurs mois. */
export function downloadBulkPaymentReceipts(paymentIds: string[]) {
  const token = getToken();
  if (!token) {
    toast('Connectez-vous pour télécharger le reçu.', { variant: 'warning' });
    return;
  }
  if (!paymentIds.length) return;
  fetch(`${baseUrl()}/payments/receipts/bulk`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentIds }),
  })
    .then((r) => {
      if (!r.ok) throw new Error('Reçu indisponible');
      return r.blob();
    })
    .then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `recu-loyers-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(() =>
      toast('Impossible de générer le reçu groupé (même bail, échéances déjà payées uniquement).', {
        variant: 'error',
      }),
    );
}

function downloadAuthedBlob(path: string, filename: string, failMsg: string) {
  const token = getToken();
  const url = `${baseUrl()}${path}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  if (token) {
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error(failMsg);
        return r.blob();
      })
      .then((blob) => {
        a.href = URL.createObjectURL(blob);
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast(failMsg, { variant: 'error' }));
  } else {
    a.click();
  }
}

export function downloadReport(kind: 'pdf' | 'xlsx', year: number) {
  const q = `?year=${year}`;
  const path = kind === 'pdf' ? `/reports/summary.pdf${q}` : `/reports/summary.xlsx${q}`;
  downloadAuthedBlob(
    path,
    `immopilot-rapport-${year}.${kind === 'pdf' ? 'pdf' : 'xlsx'}`,
    'Export impossible. Vérifiez la connexion et votre session.',
  );
}

/** Modèle Excel vide (mêmes feuilles que l’export) pour premier import. */
export function downloadImportTemplate() {
  downloadAuthedBlob(
    '/reports/import-template.xlsx',
    'immopilot-modele-import.xlsx',
    'Modèle indisponible. Vérifiez la connexion, votre session et le plan (exports).',
  );
}

/** Exemple rempli (biens, baux, loyers janv. → mois en cours) — données fictives. */
export function downloadImportExample() {
  downloadAuthedBlob(
    '/reports/import-example.xlsx',
    'immopilot-exemple-import.xlsx',
    'Exemple indisponible. Vérifiez la connexion, votre session et le plan (exports).',
  );
}

/** Ouvre un PDF généré par l’API (JWT) dans un nouvel onglet — aperçu / impression. */
export function openPrintablePdf(path: string) {
  const token = getToken();
  fetch(`${baseUrl()}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((r) => {
      if (r.status === 401) {
        setToken(null);
        setStoredUser(null);
        window.dispatchEvent(new Event('immopilot:logout'));
      }
      if (!r.ok) throw new Error('PDF indisponible');
      return r.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    })
    .catch(() => toast('Impossible d’ouvrir le PDF. Vérifiez la connexion et votre session.', { variant: 'error' }));
}

export type ExcelImportResult = {
  ok: boolean;
  buildingsCreated: number;
  unitsCreated: number;
  tenantsCreated: number;
  leasesCreated: number;
  leasesUpdated: number;
  paymentsUpserted: number;
  chargesCreated: number;
  errors: string[];
  warnings: string[];
};

export type AccountingSummary = {
  year: number;
  totals: {
    due: number;
    paid: number;
    waived: number;
    charges: number;
    netEstimated: number;
  };
  estimatedProfit: number;
  monthly: Array<{
    month: number;
    due: number;
    paid: number;
    waived: number;
    charges: number;
    netEstimated: number;
  }>;
};

export async function getAccountingSummary(year: number): Promise<AccountingSummary> {
  return api<AccountingSummary>(`/reports/accounting-summary?year=${encodeURIComponent(String(year))}`);
}

export type AccountingWorkspace = AccountingSummary & {
  receivables: Array<{
    paymentId: string;
    tenantFullName: string;
    buildingName: string;
    unitLabel: string;
    periodYear: number;
    periodMonth: number;
    dueDate: string;
    status: string;
    amountDue: number;
    amountPaid: number;
    outstanding: number;
  }>;
  ledger: Array<{
    date: string;
    journal: string;
    piece: string;
    label: string;
    debit: number;
    credit: number;
    due: number;
    status: string;
  }>;
};

export async function getAccountingWorkspace(year: number): Promise<AccountingWorkspace> {
  return api<AccountingWorkspace>(`/reports/accounting-workspace?year=${encodeURIComponent(String(year))}`);
}

export type AccountingClosure = {
  periodYear: number;
  periodMonth: number;
  closedByUserId: string | null;
  closedByEmail: string | null;
  closedAt: string;
};

export async function getAccountingClosures(year: number): Promise<AccountingClosure[]> {
  return api<AccountingClosure[]>(`/reports/accounting-closures?year=${encodeURIComponent(String(year))}`);
}

export async function closeAccountingPeriod(year: number, month: number): Promise<void> {
  await api('/reports/accounting-closures/close', {
    method: 'POST',
    json: { year, month },
  });
}

export async function openAccountingPeriod(year: number, month: number): Promise<void> {
  await api('/reports/accounting-closures/open', {
    method: 'POST',
    json: { year, month },
  });
}

export type AuditLogEntry = {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export async function getAuditLogs(params?: {
  action?: string;
  actorUserId?: string;
  entityType?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const q = new URLSearchParams();
  if (params?.action) q.set('action', params.action);
  if (params?.actorUserId) q.set('actorUserId', params.actorUserId);
  if (params?.entityType) q.set('entityType', params.entityType);
  if (params?.limit != null) q.set('limit', String(params.limit));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return api<AuditLogEntry[]>(`/audit/logs${suffix}`);
}

export type ReceiptSignatureMeta = {
  hasSignature: boolean;
  fileKey: string | null;
  mimeType: string | null;
  uploadedAt: string | null;
};

export async function getReceiptSignatureMeta(): Promise<ReceiptSignatureMeta> {
  return api<ReceiptSignatureMeta>('/auth/receipt-signature');
}

export async function uploadReceiptSignature(file: File): Promise<ReceiptSignatureMeta> {
  const token = getToken();
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${baseUrl()}/auth/receipt-signature/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error('Upload signature impossible');
  return (await res.json()) as ReceiptSignatureMeta;
}

export async function saveDrawnReceiptSignature(dataUrl: string): Promise<ReceiptSignatureMeta> {
  return api<ReceiptSignatureMeta>('/auth/receipt-signature/draw', {
    method: 'POST',
    json: { dataUrl },
  });
}

export async function createPaymentReceiptShareLink(paymentId: string): Promise<{ shareUrl: string; expiresAt: string }> {
  const r = await api<{ ok: boolean; shareUrl: string; expiresAt: string }>(
    `/payments/${paymentId}/receipt-share-link`,
    {
      method: 'POST',
    },
  );
  /** Si l’API a encore généré un lien localhost, le réécrire vers l’API de prod (VITE_API_URL). */
  let shareUrl = r.shareUrl;
  const apiRoot = apiBaseUrl();
  if (apiRoot && /localhost|127\.0\.0\.1/i.test(shareUrl)) {
    shareUrl = shareUrl.replace(/^https?:\/\/[^/]+/i, apiRoot.replace(/\/$/, ''));
  }
  return { shareUrl, expiresAt: r.expiresAt };
}

/** Importe un classeur au même format que l’export (feuilles Biens, Baux, Paiements, Charges, etc.). */
export async function importReportExcel(file: File): Promise<ExcelImportResult> {
  const fd = new FormData();
  fd.append('file', file);
  const token = getToken();
  const res = await fetch(`${baseUrl()}/reports/import.xlsx`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (res.status === 401) {
    setToken(null);
    setStoredUser(null);
    window.dispatchEvent(new Event('immopilot:logout'));
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { message?: string | string[]; errors?: string[] };
      if (j?.message) {
        msg = Array.isArray(j.message) ? j.message.join(', ') : String(j.message);
      }
      if (j?.errors?.length) {
        msg = `${msg}\n${j.errors.slice(0, 20).join('\n')}`;
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as ExcelImportResult;
}

export type LeaseInspectionItemRow = {
  id: string;
  room: string;
  element: string;
  condition: 'GOOD' | 'WORN' | 'DAMAGED' | 'UNCHECKED';
  note: string | null;
  sortOrder: number;
};

export type LeaseInspectionRow = {
  id: string;
  leaseId: string;
  kind: 'MOVE_IN' | 'MOVE_OUT';
  status: 'DRAFT' | 'SIGNED';
  tenantSignatureName: string | null;
  signedAt: string | null;
  depositRefundDecision: 'PENDING' | 'FULL' | 'PARTIAL' | 'WITHHOLD' | null;
  depositRefundNote: string | null;
  createdAt: string;
  items: LeaseInspectionItemRow[];
};

export type RepairRequestRow = {
  id: string;
  title: string;
  urgency: 'LOW' | 'NORMAL' | 'HIGH';
  status: 'TODO' | 'QUOTE_RECEIVED' | 'IN_PROGRESS' | 'DONE';
  note: string | null;
  contractorName: string | null;
  contractorPhone: string | null;
  estimatedCost: string | number | null;
  finalCost: string | number | null;
  deadline: string | null;
  chargeId: string | null;
  building?: { id: string; name: string };
  unit?: { id: string; label: string } | null;
};

async function uploadMultipart(path: string, file: File, extraQuery?: string) {
  const token = getToken();
  const fd = new FormData();
  fd.append('file', file);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl()}${path}${extraQuery ?? ''}`, { method: 'POST', headers, body: fd });
  if (res.status === 401) {
    setToken(null);
    setStoredUser(null);
    window.dispatchEvent(new Event('immopilot:logout'));
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      if (j?.message) msg = Array.isArray(j.message) ? j.message.join(', ') : String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

export function uploadInspectionPhoto(inspectionId: string, file: File, itemId?: string) {
  const q = itemId ? `?itemId=${encodeURIComponent(itemId)}` : '';
  return uploadMultipart(`/inspections/${inspectionId}/photos`, file, q);
}

export function uploadRepairPhoto(repairId: string, file: File) {
  return uploadMultipart(`/repairs/${repairId}/photos`, file);
}

export async function downloadInspectionPdf(inspectionId: string) {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl()}/inspections/${inspectionId}/pdf`, { headers });
  if (!res.ok) throw new Error('PDF indisponible');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `etat-des-lieux-${inspectionId.slice(0, 8)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
