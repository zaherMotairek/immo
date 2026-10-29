import { AddZoomModal } from '@/components/AddZoomModal';
import { NewBuildingStructureGuide } from './NewBuildingStructureGuide';
import type { NewBuilding } from './useNewBuilding';

/** Fenêtre zoom « Nouveau bien » : guide pas à pas (structure + identité + enregistrement). */
export function NewBuildingCard({ form }: { form: NewBuilding }) {
  return (
    <div ref={form.addFormRef} id="nouveau-bien" className="scroll-mt-24">
      <AddZoomModal
        open={form.addFormOpen}
        onClose={form.cancelNewBuilding}
        kicker="Ajouter"
        title="Nouveau bien"
        subtitle="Répondez aux questions — le bien se crée à la fin"
        size="xl"
        titleId="nouveau-bien-title"
      >
        <NewBuildingStructureGuide form={form} />
      </AddZoomModal>
    </div>
  );
}
