import { useCallback, useEffect, useRef, useState } from 'react';
import type { LeaseContractMeta } from '@/lib/api';
import {
  deleteLeaseContract,
  deleteLeaseContractByKey,
  listLeaseContracts,
  downloadLeaseContractFile,
  openLeaseContractPreview,
  uploadLeaseContract,
} from '@/lib/api';
import { formatDateFr } from '@/lib/format';
import { Button } from '@/components/ui/index';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';

function formatBytes(n: number | null | undefined) {
  if (n == null) return '—';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

type Props = {
  leaseId: string;
  contract: LeaseContractMeta | null;
  onChanged: () => void;
  compact?: boolean;
};

export function LeaseContractSection({ leaseId, contract, onChanged, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [contracts, setContracts] = useState<LeaseContractMeta[]>([]);

  const loadContracts = useCallback(async () => {
    try {
      const list = await listLeaseContracts(leaseId);
      setContracts(list.slice().reverse());
    } catch {
      setContracts(contract ? [contract] : []);
    }
  }, [leaseId, contract]);

  useEffect(() => {
    void loadContracts();
  }, [loadContracts]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      await uploadLeaseContract(leaseId, file);
      await loadContracts();
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Envoi impossible.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(fileKey?: string) {
    const ok = await confirmDialog({
      title: 'Supprimer le contrat',
      message: 'Supprimer le fichier de contrat enregistré ?',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      if (fileKey) {
        await deleteLeaseContractByKey(leaseId, fileKey);
      } else {
        await deleteLeaseContract(leaseId);
      }
      await loadContracts();
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Suppression impossible.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const entries = contracts.length > 0 ? contracts : contract ? [contract] : [];

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
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
          size="sm"
          className="text-xs"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {entries.length > 0 ? 'Ajouter un autre contrat' : 'Ajouter un contrat'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          disabled={busy}
          onClick={() => camRef.current?.click()}
        >
          Prendre une photo
        </Button>
      </div>
      {entries.map((entry) => (
        <div
          key={entry.fileKey ?? `${entry.fileName}-${entry.uploadedAt}`}
          className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          <p className="font-medium text-[var(--color-ink)]">{entry.fileName ?? 'Fichier'}</p>
          <p className="text-xs text-[var(--color-muted)]">
            {entry.mimeType ?? '—'} · {formatBytes(entry.size)}
            {entry.uploadedAt && ` · envoyé le ${formatDateFr(entry.uploadedAt)}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" className="text-xs" disabled={busy} onClick={() => openLeaseContractPreview(leaseId, entry.fileKey)}>
              Ouvrir / afficher
            </Button>
            <Button type="button" variant="secondary" size="sm" className="text-xs" disabled={busy} onClick={() => downloadLeaseContractFile(leaseId, entry.fileName ?? 'contrat', entry.fileKey)}>
              Télécharger
            </Button>
            <Button type="button" variant="danger" size="sm" className="text-xs" disabled={busy} onClick={() => void onRemove(entry.fileKey)}>
              Supprimer le fichier
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
