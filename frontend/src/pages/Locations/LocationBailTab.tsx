import { HelpHint } from '@/components/ui';
import { Button } from '@/components/ui/index';
import { LeaseContractSection } from '@/components/LeaseContractSection';
import { LocationLeaseForm } from './LocationLeaseForm';
import { LocationReviseSection } from './LocationReviseSection';
import type { Fiche } from './types';
import type { LocationFicheModel } from './useLocationFiche';

type LocationBailTabProps = {
  data: Fiche;
  lease: LocationFicheModel['lease'];
  revise: LocationFicheModel['revise'];
  onReload: () => void;
  onDelete: () => void;
};

function SectionHeader({ title, hintTitle }: { title: string; hintTitle?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[var(--odoo-border)] pb-3">
      <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">{title}</h2>
      {hintTitle ? <HelpHint title={hintTitle} className="shrink-0" /> : null}
    </div>
  );
}

/** Onglet « Contrat & bail » : pièce jointe, conditions, révision, zone danger. */
export function LocationBailTab({ data, lease, revise, onReload, onDelete }: LocationBailTabProps) {
  return (
    <div className="text-[15px] leading-relaxed text-[var(--color-ink)]">
      <div className="!p-1 sm:!p-2">
        <SectionHeader title="Contrat signé" hintTitle="PDF ou image, 15 Mo max." />
        <LeaseContractSection leaseId={data.leaseId} contract={data.contract} onChanged={onReload} />
      </div>

      <LocationLeaseForm lease={lease} />
      <LocationReviseSection revise={revise} />

      <div className="border-t border-[var(--status-late)]/40 bg-[var(--status-late-bg)] !px-5 !py-4">
        <h2 className="text-base font-bold text-[var(--status-late)]">Supprimer ce bail</h2>
        <p className="mt-1.5 text-sm font-medium text-[var(--color-ink)]">
          Retire échéances et contrat. Locataire et bien conservés.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-3 border-[var(--status-late)]/40 py-2.5 text-sm font-semibold text-[var(--status-late)] hover:bg-[var(--status-late-bg)]"
          onClick={onDelete}
        >
          Supprimer définitivement…
        </Button>
      </div>
    </div>
  );
}
