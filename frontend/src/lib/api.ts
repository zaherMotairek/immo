const TOKEN_KEY = 'immopilot_token';
const USER_KEY = 'immopilot_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): { id: string; email: string; name: string | null } | null {
  try {
    const s = localStorage.getItem(USER_KEY);
    if (!s) return null;
    return JSON.parse(s) as { id: string; email: string; name: string | null };
  } catch {
    return null;
  }
}

export function setStoredUser(u: { id: string; email: string; name: string | null } | null) {
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
    try {
      const j = await res.json();
      if (j?.message) msg = Array.isArray(j.message) ? j.message.join(', ') : String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as T;
}

export type LeaseContractMeta = {
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  uploadedAt: string | null;
};

export type TenantIdDocumentMeta = {
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

export function openTenantIdDocumentPreview(tenantId: string): void {
  const token = getToken();
  const url = `${baseUrl()}/tenants/${tenantId}/id-document`;
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
    .catch(() => alert('Impossible d’afficher la pièce d’identité.'));
}

export function downloadTenantIdDocumentFile(tenantId: string, suggestedName: string): void {
  const token = getToken();
  const url = `${baseUrl()}/tenants/${tenantId}/id-document`;
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
    .catch(() => alert('Impossible de télécharger le fichier.'));
}

/** Ouvre le contrat dans un nouvel onglet (session requise). */
export function openLeaseContractPreview(leaseId: string): void {
  const token = getToken();
  const url = `${baseUrl()}/leases/${leaseId}/contract`;
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
    .catch(() => alert('Impossible d’afficher le contrat.'));
}

export function downloadLeaseContractFile(leaseId: string, suggestedName: string): void {
  const token = getToken();
  const url = `${baseUrl()}/leases/${leaseId}/contract`;
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
    .catch(() => alert('Impossible de télécharger le contrat.'));
}

/** Télécharge le reçu PDF d’une échéance (acompte ou solde, session JWT). */
export function downloadPaymentReceipt(paymentId: string) {
  const token = getToken();
  if (!token) {
    alert('Connectez-vous pour télécharger le reçu.');
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
      alert('Impossible de télécharger le reçu (vérifiez qu’au moins un versement est enregistré sur l’échéance).'),
    );
}

/** Reçu PDF unique pour plusieurs échéances payées (même bail), ex. prépaiement de plusieurs mois. */
export function downloadBulkPaymentReceipts(paymentIds: string[]) {
  const token = getToken();
  if (!token) {
    alert('Connectez-vous pour télécharger le reçu.');
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
      alert('Impossible de générer le reçu groupé (même bail, échéances déjà payées uniquement).'),
    );
}

export function downloadReport(kind: 'pdf' | 'xlsx', year: number) {
  const token = getToken();
  const q = `?year=${year}`;
  const path = kind === 'pdf' ? `/reports/summary.pdf${q}` : `/reports/summary.xlsx${q}`;
  const url = `${baseUrl()}${path}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `immopilot-rapport-${year}.${kind === 'pdf' ? 'pdf' : 'xlsx'}`;
  if (token) {
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('Export impossible');
        return r.blob();
      })
      .then((blob) => {
        a.href = URL.createObjectURL(blob);
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => alert('Export impossible. Vérifiez la connexion et votre session.'));
  } else {
    a.click();
  }
}
