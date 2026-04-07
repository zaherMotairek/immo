import { useRef, useState } from 'react';
import type { LeaseContractMeta } from '@/lib/api';
import {
  deleteLeaseContract,
  downloadLeaseContractFile,
  openLeaseContractPreview,
  uploadLeaseContract,
} from '@/lib/api';
import { Button } from './ui';

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

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      await uploadLeaseContract(leaseId, file);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    if (!contract) return;
    if (!confirm('Supprimer le fichier de contrat enregistré ?')) return;
    setBusy(true);
    try {
      await deleteLeaseContract(leaseId);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Suppression impossible.');
    } finally {
      setBusy(false);
    }
  }

  const name = contract?.fileName ?? 'contrat';

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
          className="py-2 text-xs"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {contract ? 'Remplacer le contrat' : 'Ajouter un contrat'}
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
      <p className="text-xs text-slate-500">
        PDF ou image (JPEG, PNG, WebP), max. 15 Mo. Sur téléphone, « Prendre une photo » ouvre l’appareil photo.
      </p>
      {contract && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm">
          <p className="font-medium text-slate-900">{contract.fileName ?? 'Fichier'}</p>
          <p className="text-xs text-slate-600">
            {contract.mimeType ?? '—'} · {formatBytes(contract.size)}
            {contract.uploadedAt && ` · envoyé le ${contract.uploadedAt.slice(0, 10)}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" className="py-1.5 text-xs" disabled={busy} onClick={() => openLeaseContractPreview(leaseId)}>
              Ouvrir / afficher
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="py-1.5 text-xs"
              disabled={busy}
              onClick={() => downloadLeaseContractFile(leaseId, name)}
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
