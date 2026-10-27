import { LeaseContractSection } from '@/components/LeaseContractSection';
import { Button, cn } from '@/components/ui/index';
import type { LeaseRow } from './types';

const detailsClass =
  'rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)]';
const summaryClass =
  'flex min-h-9 cursor-pointer list-none items-center px-2.5 py-1.5 text-xs font-medium marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 [&::-webkit-details-marker]:hidden';

/** Menu « Contrat » d'un bail : joindre / consulter / supprimer le fichier de contrat. */
export function LeaseContractDetails({ lease, onChanged, className }: { lease: LeaseRow; onChanged: () => void; className?: string }) {
  return (
    <details className={cn(detailsClass, className)}>
      <summary className={summaryClass}>
        {lease.contractFileKey ? (
          <span className="text-[var(--status-paid)]">Contrat joint</span>
        ) : (
          <span className="text-[var(--color-muted)]">Joindre le contrat</span>
        )}
      </summary>
      <div className="border-t border-[var(--odoo-border)] px-2 py-2">
        <LeaseContractSection
          leaseId={lease.id}
          compact
          contract={
            lease.contractFileKey
              ? {
                  fileName: lease.contractFileOriginalName ?? null,
                  mimeType: lease.contractFileMime ?? null,
                  size: lease.contractFileSize ?? null,
                  uploadedAt: lease.contractUploadedAt ?? null,
                }
              : null
          }
          onChanged={onChanged}
        />
      </div>
    </details>
  );
}

type LeaseActionsMenuProps = {
  lease: LeaseRow;
  genYear: string;
  onGeneratePayments: (leaseId: string) => void;
  onToggleActive: (lease: LeaseRow) => void;
  className?: string;
};

/** Menu « Actions » d'un bail : génération des échéances de l'année choisie, (dés)activation. */
export function LeaseActionsMenu({ lease, genYear, onGeneratePayments, onToggleActive, className }: LeaseActionsMenuProps) {
  return (
    <details className={cn(detailsClass, 'text-left', className)}>
      <summary className={cn(summaryClass, 'text-[var(--color-ink)]')}>Actions</summary>
      <div className="border-t border-[var(--odoo-border)] px-2 py-2">
        <div className="flex flex-col gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="w-full flex-col gap-0.5 text-xs leading-snug"
            title={`Crée les lignes de loyer et d’échéances pour l’année ${genYear} (identique au champ « Année des échéances » dans les filtres).`}
            onClick={() => onGeneratePayments(lease.id)}
          >
            <span className="font-semibold">Générer les échéances</span>
            <span className="text-[10px] font-medium tabular-nums text-[var(--color-muted)]">Année {genYear}</span>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-center text-xs" onClick={() => onToggleActive(lease)}>
            {lease.active ? 'Désactiver le bail' : 'Réactiver le bail'}
          </Button>
        </div>
      </div>
    </details>
  );
}
