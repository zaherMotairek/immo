import { FicheLocationLink } from '@/components/FicheLocationLink';
import { SmartLink } from '@/components/SmartLink';
import { Button } from '@/components/ui/index';
import type { Unit } from './types';

type UnitRowActionsProps = {
  buildingId: string;
  unit: Unit;
  onRemove: (unitId: string) => void;
};

/** Actions d'une unité : fiche du bail (si louée) ou création d'un bail pré-rempli, et suppression. */
export function UnitRowActions({ buildingId, unit, onRemove }: UnitRowActionsProps) {
  const lease0 = unit.leases?.[0];
  return (
    <div className="inline-flex flex-col items-end gap-1.5 sm:flex-row sm:items-center">
      {lease0?.id ? (
        <FicheLocationLink leaseId={lease0.id} />
      ) : (
        <SmartLink
          to={`/baux?buildingId=${encodeURIComponent(buildingId)}&unitId=${encodeURIComponent(unit.id)}&hintUnitLabel=${encodeURIComponent(unit.label)}&returnLocation=${encodeURIComponent(`/biens/${buildingId}`)}#nouveau-bail`}
          className="odoo-btn-secondary inline-flex min-h-9 items-center justify-center rounded-[var(--radius-input)] px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          title="Ouvrir la création de bail avec ce bien et cette unité déjà sélectionnés"
        >
          Baux
        </SmartLink>
      )}
      <Button variant="danger" size="sm" onClick={() => onRemove(unit.id)}>
        Supprimer
      </Button>
    </div>
  );
}
