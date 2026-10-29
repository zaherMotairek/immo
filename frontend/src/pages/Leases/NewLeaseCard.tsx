import { AddZoomModal } from '@/components/AddZoomModal';
import { SegmentedControl } from '@/components/ui/index';
import { BulkLeaseForm } from './BulkLeaseForm';
import type { BuildingOpt, TenantOpt } from './types';
import { NewLeaseForm } from './NewLeaseForm';
import type { BulkLeaseFormState } from './useBulkLeaseForm';
import type { NewLeaseForm as NewLeaseFormState } from './useNewLeaseForm';

type NewLeaseCardProps = {
  form: NewLeaseFormState;
  bulk: BulkLeaseFormState;
  buildingsAvailable: BuildingOpt[];
  tenants: TenantOpt[];
  onOpenQuickTenant: () => void;
};

/** Fenêtre zoom « Enregistrer un nouveau bail » (unitaire ou plusieurs lots). */
export function NewLeaseCard({
  form,
  bulk,
  buildingsAvailable,
  tenants,
  onOpenQuickTenant,
}: NewLeaseCardProps) {
  const isBulk = form.createMode === 'bulk';

  function handleClose() {
    bulk.resetBulk();
    form.cancelNewLease();
  }

  return (
    <div ref={form.addLeaseFormRef} id="nouveau-bail" className="scroll-mt-24">
      <AddZoomModal
        open={form.addLeaseOpen}
        onClose={handleClose}
        kicker="Ajouter"
        title={isBulk ? 'Plusieurs lots d’un coup' : 'Nouveau bail'}
        subtitle={
          isBulk
            ? 'Terrain ou immeuble : locataire, loyer et date par lot'
            : 'Bien, locataire et loyer'
        }
        size="xl"
        titleId="nouveau-bail-title"
      >
        <div className="mb-4">
          <SegmentedControl
            ariaLabel="Mode d’ajout de bail"
            value={form.createMode}
            onChange={(id) => {
              form.setCreateMode(id as 'single' | 'bulk');
              form.setErr(null);
              if (id === 'single') bulk.resetBulk();
            }}
            options={[
              { id: 'single', label: 'Un bail' },
              { id: 'bulk', label: 'Plusieurs lots' },
            ]}
          />
        </div>
        {isBulk ? (
          <BulkLeaseForm
            bulk={bulk}
            tenants={tenants}
            onOpenQuickTenant={onOpenQuickTenant}
            onCancel={handleClose}
          />
        ) : (
          <NewLeaseForm
            form={form}
            buildingsAvailable={buildingsAvailable}
            tenants={tenants}
            onOpenQuickTenant={() => {
              bulk.clearPendingTenant();
              onOpenQuickTenant();
            }}
          />
        )}
      </AddZoomModal>
    </div>
  );
}
