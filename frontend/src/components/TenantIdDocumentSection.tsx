import { useCallback, useEffect, useRef, useState } from 'react';
import type { TenantIdDocumentMeta } from '@/lib/api';
import {
  deleteTenantIdDocument,
  deleteTenantIdDocumentByKey,
  listTenantIdDocuments,
  downloadTenantIdDocumentFile,
  openTenantIdDocumentPreview,
  uploadTenantIdDocument,
} from '@/lib/api';
import { formatDateFr } from '@/lib/format';
import { Button } from './ui/index';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';

function formatBytes(n: number | null | undefined) {
  if (n == null) return '—';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
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
  const [documents, setDocuments] = useState<TenantIdDocumentMeta[]>([]);

  const loadDocuments = useCallback(async () => {
    try {
      const list = await listTenantIdDocuments(tenantId);
      setDocuments(list.slice().reverse());
    } catch {
      setDocuments(idDocument ? [idDocument] : []);
    }
  }, [tenantId, idDocument]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      await uploadTenantIdDocument(tenantId, file);
      await loadDocuments();
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Envoi impossible.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(fileKey?: string) {
    const ok = await confirmDialog({
      title: 'Supprimer la pièce d’identité',
      message: 'Supprimer la pièce d’identité enregistrée ?',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      if (fileKey) {
        await deleteTenantIdDocumentByKey(tenantId, fileKey);
      } else {
        await deleteTenantIdDocument(tenantId);
      }
      await loadDocuments();
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Suppression impossible.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const entries = documents.length > 0 ? documents : idDocument ? [idDocument] : [];

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-[13px] font-semibold text-[var(--color-ink)]">CNI / passeport / titre</p>
        <p className="text-xs text-[var(--color-muted)]">
          Scan ou photo (PDF, JPEG, PNG, WebP), max. 15 Mo. Données sensibles : accès réservé aux utilisateurs connectés.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          aria-label="Choisir un fichier (PDF ou image)"
          accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
          disabled={busy}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <input
          ref={camRef}
          type="file"
          className="sr-only"
          aria-label="Prendre une photo avec l’appareil"
          accept="image/*"
          capture="environment"
          disabled={busy}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          {idDocument ? 'Remplacer le fichier' : 'Ajouter une pièce d’identité'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => camRef.current?.click()}
        >
          Prendre une photo
        </Button>
      </div>
      {entries.map((entry) => (
        <div key={entry.fileKey ?? `${entry.fileName}-${entry.uploadedAt}`} className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-3 py-2 text-sm dark:border-zinc-600">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[var(--color-ink)]">{entry.fileName ?? 'Fichier'}</p>
              <p className="text-xs text-[var(--color-muted)]">
                {entry.mimeType ?? '—'} · {formatBytes(entry.size)}
                {entry.uploadedAt && ` · envoyé le ${formatDateFr(entry.uploadedAt)}`}
              </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => openTenantIdDocumentPreview(tenantId, entry.fileKey)}>
              Ouvrir / afficher
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => downloadTenantIdDocumentFile(tenantId, entry.fileName ?? 'document', entry.fileKey)}
            >
              Télécharger
            </Button>
            <Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => void onRemove(entry.fileKey)}>
              Supprimer le fichier
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
