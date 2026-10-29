import { AddZoomModal } from '@/components/AddZoomModal';
import { HelpHint } from '@/components/ui';
import { immeubleStructureHintText } from './buildingHints';
import { UNIT_SECTION_HINT } from './buildingUtils';
import { NewUnitForm } from './NewUnitForm';
import type { Building } from './types';
import type { AddUnitForm } from './useAddUnitForm';
import type { BuildingLayout } from './useBuildingLayout';

type NewUnitTabProps = {
  b: Building;
  form: AddUnitForm;
  layout: BuildingLayout;
  onSubmit: (e: React.FormEvent) => void;
  onSubmitBatch: () => void;
};

/** Fenêtre zoom « Nouvelle unité » (même pattern que les autres Ajouter). */
export function NewUnitTab({ b, form, layout, onSubmit, onSubmitBatch }: NewUnitTabProps) {
  const open = form.addUnitFormOpen;
  const { immeubleFloorPickerActive, terrainPlanActive, terrainLotsFull } = layout;
  const immeubleStructureHint = immeubleFloorPickerActive ? immeubleStructureHintText(b) : '';
  const terrainLotsHint = terrainPlanActive
    ? `${b.terrainLotCount} lot(s) déclaré(s) sur ce terrain : ajoutez au plus une unité par numéro (unité 1, unité 2…). Les numéros déjà utilisés sont masqués ; pas d’étage.`
    : '';

  function close() {
    form.setAddUnitFormOpen(false);
  }

  return (
    <div ref={form.addUnitFormRef} id="fiche-nouvelle-unite" className="scroll-mt-24">
      <AddZoomModal
        open={open}
        onClose={close}
        kicker="Ajouter"
        title="Nouvelle unité"
        subtitle="Appartement, local ou lot sur ce bien"
        size="xl"
        titleId="nouvelle-unite-title"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <HelpHint title={UNIT_SECTION_HINT} className="align-middle" />
          {form.immeubleSlotFlowActive ? <HelpHint title={immeubleStructureHint} className="align-middle" /> : null}
          {terrainPlanActive ? <HelpHint title={terrainLotsHint} className="align-middle" /> : null}
        </div>
        {terrainLotsFull ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--status-pending)]">
            <span>
              Nombre maximum d’unités atteint ({b.terrainLotCount} lot
              {b.terrainLotCount !== 1 ? 's' : ''} déclaré{b.terrainLotCount !== 1 ? 's' : ''} sur ce terrain).
            </span>
            <HelpHint title="Pour ajouter un lot, augmentez d’abord le nombre de lots dans « Organisation du bien », ou supprimez une unité existante." />
          </p>
        ) : b.structureKind === 'MONO_LOT' && b.units.length >= 1 ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-muted)]">
            <span>Ce bien est en un seul lot : une seule unité suffit.</span>
            <HelpHint title="Pour plusieurs lots sur le même terrain ou le même bâtiment, passez le type à « Immeuble ou bâtiment multi locataires » ou « Terrain avec plusieurs locataires » dans Organisation du bien." />
          </p>
        ) : (
          <NewUnitForm b={b} form={form} layout={layout} onSubmit={onSubmit} onSubmitBatch={onSubmitBatch} />
        )}
      </AddZoomModal>
    </div>
  );
}
