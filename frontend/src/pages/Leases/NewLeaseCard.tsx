import { AddZoomModal } from '@/components/AddZoomModal';
import type { BuildingOpt, TenantOpt } from './types';
import { NewLeaseForm } from './NewLeaseForm';
import type { NewLeaseForm as NewLeaseFormState } from './useNewLeaseForm';

type NewLeaseCardProps = {
  form: NewLeaseFormState;
  buildingsAvailable: BuildingOpt[];
  tenants: TenantOpt[];
  onOpenQuickTenant: () => void;
};

/** Fenêtre zoom « Enregistrer un nouveau bail ». */
export function NewLeaseCard({ form, buildingsAvailable, tenants, onOpenQuickTenant }: NewLeaseCardProps) {
  return (
    <div ref={form.addLeaseFormRef} id="nouveau-bail" className="scroll-mt-24">
      <AddZoomModal
        open={form.addLeaseOpen}
        onClose={form.cancelNewLease}
        kicker="Ajouter"
        title="Nouveau bail"
        subtitle="Bien, locataire et loyer"
        size="xl"
        titleId="nouveau-bail-title"
      >
        <NewLeaseForm
          form={form}
          buildingsAvailable={buildingsAvailable}
          tenants={tenants}
          onOpenQuickTenant={onOpenQuickTenant}
        />
      </AddZoomModal>
    </div>
  );
}
