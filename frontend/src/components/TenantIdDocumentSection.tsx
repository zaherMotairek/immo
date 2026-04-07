import { useEffect, useRef, useState } from 'react';
import type { TenantIdDocumentMeta } from '@/lib/api';
import {
  apiBaseUrl,
  deleteTenantIdDocument,
  downloadTenantIdDocumentFile,
  getToken,
  openTenantIdDocumentPreview,
  uploadTenantIdDocument,
} from '@/lib/api';
import { Button } from './ui';

function formatBytes(n: number | null | undefined) {
  if (n == null) return '—';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Miniature pour la liste (lecture seule) : image ou pastille PDF. */
export function TenantIdDocumentThumb({
  tenantId,
  mimeType,
}: {
  tenantId: string;
  mimeType: string | null | undefined;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const isImage = Boolean(mimeType?.startsWith('image/'));

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    const token = getToken();
    fetch(`${apiBaseUrl()}/tenants/${tenantId}/id-document`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        if (!r.ok) throw new Error('fetch');
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [tenantId, isImage]);

  if (!isImage) {
    return (
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
        title="Document PDF"
      >
        PDF
      </div>
    );
  }
  if (!url) {
    return <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-slate-100" aria-hidden />;
  }
  return (
    <img
      src={url}
      alt=""
      className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover shadow-sm"
    />
  );
}

type Props = {
  tenantId: string;
  idDocument: TenantIdDocumentMeta | null;
  onChanged: () => void;
};

export function TenantIdDocumentSection({ tenantId, idDocument, onChanged }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      await uploadTenantIdDocument(tenantId, file);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    if (!idDocument) return;
    if (!confirm('Supprimer la pièce d’identité enregistrée ?')) return;
    setBusy(true);
    try {
      await deleteTenantIdDocument(tenantId);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Suppression impossible.');
    } finally {
      setBusy(false);
    }
  }

  const name = idDocument?.fileName ?? 'document';

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-xs font-medium text-slate-700">CNI / passeport / titre</p>
        <p className="text-xs text-slate-500">
          Scan ou photo (PDF, JPEG, PNG, WebP), max. 15 Mo. Données sensibles : accès réservé aux utilisateurs connectés.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
          disabled={busy}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <input
          ref={camRef}
          type="file"
          className="sr-only"
          accept="image/*"
          capture="environment"
          disabled={busy}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="secondary"
          className="py-2 text-xs"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {idDocument ? 'Remplacer le fichier' : 'Ajouter une pièce d’identité'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="py-2 text-xs"
          disabled={busy}
          onClick={() => camRef.current?.click()}
        >
          Prendre une photo
        </Button>
      </div>
      {idDocument && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm">
          <div className="flex flex-wrap gap-3">
            <TenantIdDocumentThumb tenantId={tenantId} mimeType={idDocument.mimeType} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">{idDocument.fileName ?? 'Fichier'}</p>
              <p className="text-xs text-slate-600">
                {idDocument.mimeType ?? '—'} · {formatBytes(idDocument.size)}
                {idDocument.uploadedAt && ` · envoyé le ${idDocument.uploadedAt.slice(0, 10)}`}
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" className="py-1.5 text-xs" disabled={busy} onClick={() => openTenantIdDocumentPreview(tenantId)}>
              Ouvrir / afficher
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="py-1.5 text-xs"
              disabled={busy}
              onClick={() => downloadTenantIdDocumentFile(tenantId, name)}
            >
              Télécharger
            </Button>
            <Button type="button" variant="danger" className="py-1.5 text-xs" disabled={busy} onClick={() => void onRemove()}>
              Supprimer le fichier
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
