import { HelpHint } from '@/components/ui';
import { Card, cn } from '@/components/ui/index';
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

/** Onglet « Nouvelle unité » : carte repliable, messages de capacité (terrain plein / un seul lot) puis formulaire. */
export function NewUnitTab({ b, form, layout, onSubmit, onSubmitBatch }: NewUnitTabProps) {
  const open = form.addUnitFormOpen;
  const { immeubleFloorPickerActive, terrainPlanActive, terrainLotsFull } = layout;
  const immeubleStructureHint = immeubleFloorPickerActive ? immeubleStructureHintText(b) : '';
  const terrainLotsHint = terrainPlanActive
    ? `${b.terrainLotCount} lot(s) déclaré(s) sur ce terrain : ajoutez au plus une unité par numéro (unité 1, unité 2…). Les numéros déjà utilisés sont masqués ; pas d’étage.`
    : '';

  return (
    <div ref={form.addUnitFormRef} id="fiche-nouvelle-unite" className="scroll-mt-24">
      <Card padding="none" className="overflow-hidden">
        <button
          type="button"
          onClick={() => form.setAddUnitFormOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors duration-[var(--duration-fast)] hover:bg-[var(--odoo-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600 sm:px-5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/12 text-lg font-bold leading-none text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              +
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">Nouvelle unité</h2>
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                {open ? 'Masquer le formulaire' : 'Afficher le formulaire d’ajout'}
              </p>
            </div>
          </div>
          <svg
            className={cn('size-5 shrink-0 text-[var(--color-muted)] transition-transform duration-200', open && 'rotate-180')}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open ? (
          <div className="border-t border-[var(--odoo-border)] px-4 pb-5 pt-2 sm:px-5">
            <div className="mb-3 flex flex-wrap items-center gap-2 pt-2">
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
          </div>
        ) : null}
      </Card>
    </div>
  );
}
