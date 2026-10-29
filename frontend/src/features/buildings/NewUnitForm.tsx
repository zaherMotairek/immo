import { HelpHint } from '@/components/ui';
import { Button, Callout, Field, Input, Select } from '@/components/ui/index';
import {
  IMMEUBLE_NEW_UNIT_KIND_OPTIONS,
  UNIT_KIND_OPTIONS,
  immeubleRdcUnitKindOptions,
  unitKindLabel,
} from '@/lib/unitKind';
import { BulkUnitsTable } from './BulkUnitsTable';
import { unitKindHintText } from './buildingHints';
import { HintedField } from './HintedField';
import { ImmeubleSlotFields } from './ImmeubleSlotFields';
import { TerrainLotPicker } from './TerrainLotPicker';
import type { Building } from './types';
import type { AddUnitForm } from './useAddUnitForm';
import type { BuildingLayout } from './useBuildingLayout';

type NewUnitFormProps = {
  b: Building;
  form: AddUnitForm;
  layout: BuildingLayout;
  onSubmit: (e: React.FormEvent) => void;
  onSubmitBatch: () => void;
};

const stepTitle = 'text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]';

function newUnitKindOptions(b: Building, immeubleEtage: string) {
  const raw =
    b.structureKind === 'IMMEUBLE'
      ? immeubleEtage === '0'
        ? immeubleRdcUnitKindOptions(b.rezApartmentCount)
        : b.hasRezDeChaussee === false
          ? [{ value: 'APARTMENT' as const, label: unitKindLabel('APARTMENT') }]
          : IMMEUBLE_NEW_UNIT_KIND_OPTIONS
      : UNIT_KIND_OPTIONS;
  return raw.map((o) => ({ id: o.value as string, label: o.label }));
}

/** Formulaire d'ajout d'une unité en 4 étapes (nature, emplacement, libellé, caractéristiques) ou tableau d'ajout multiple. */
export function NewUnitForm({ b, form, layout, onSubmit, onSubmitBatch }: NewUnitFormProps) {
  const { terrainPlanActive, terrainLotsFull, terrainLotRecap } = layout;
  const { tableOnlyEligible, immeubleSlotFlowActive, kind, err } = form;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] p-4 sm:p-5">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tableOnlyEligible ? (
          <BulkUnitsTable b={b} form={form} layout={layout} onSubmit={onSubmitBatch} />
        ) : (
          <>
            <div className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] p-3 sm:col-span-2 lg:col-span-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className={stepTitle}>1. Nature du local</p>
                <HelpHint title={unitKindHintText(b)} />
              </div>
              <Field label="Type de local" htmlFor="new-unit-kind" required className="mt-3 max-w-md">
                <Select
                  id="new-unit-kind"
                  options={newUnitKindOptions(b, form.immeubleEtage)}
                  value={kind}
                  required
                  onValueChange={form.setKind}
                />
              </Field>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className={stepTitle}>2. Emplacement sur le bien</p>
                {terrainPlanActive && !terrainLotsFull ? (
                  <HelpHint title="Le numéro de lot et le rappel du nombre de lots déclarés se trouvent en bas du formulaire (après les caractéristiques)." />
                ) : null}
              </div>
            </div>
            {immeubleSlotFlowActive ? <ImmeubleSlotFields b={b} form={form} layout={layout} /> : null}
            <div className="sm:col-span-2 lg:col-span-3">
              <p className={stepTitle}>3. Libellé</p>
            </div>
            <HintedField
              className="sm:col-span-2 lg:col-span-2"
              label="Surnom / nom du local"
              htmlFor="new-unit-label"
              help={
                immeubleSlotFlowActive || terrainPlanActive
                  ? 'Suggestion automatique selon l’emplacement. Vous pouvez le renommer librement (ex. « Appart. Amadou », « Studio vue cour »).'
                  : 'Donnez le nom que vous voulez (ex. « Appart. n° 1 », « Bureau direction »).'
              }
            >
              <Input
                id="new-unit-label"
                value={form.label}
                onChange={(e) => form.setLabelFromUser(e.target.value)}
                required
                placeholder="Ex. Appartement 1-1, Studio Amadou…"
              />
            </HintedField>
            {!immeubleSlotFlowActive && !terrainPlanActive ? (
              <Field label="Étage (si pertinent)" htmlFor="new-unit-floor">
                <Input
                  id="new-unit-floor"
                  value={form.floor}
                  onChange={(e) => form.setFloor(e.target.value)}
                  type="number"
                />
              </Field>
            ) : null}
            <div className="border-t border-[var(--odoo-border)] pt-4 sm:col-span-2 lg:col-span-3">
              <p className={stepTitle}>4. Description</p>
            </div>
            <Field label="Description simple (optionnel)" htmlFor="new-unit-description" className="sm:col-span-full">
              <Input
                id="new-unit-description"
                value={form.description}
                onChange={(e) => form.setDescription(e.target.value)}
                placeholder="Ex. balcon, parking, cave…"
              />
            </Field>
            {terrainPlanActive && !terrainLotsFull && terrainLotRecap ? (
              <TerrainLotPicker b={b} form={form} layout={layout} />
            ) : null}
          </>
        )}
        {err ? (
          <Callout variant="danger" className="sm:col-span-full">
            {err}
          </Callout>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-full">
          {!tableOnlyEligible ? <Button type="submit">Ajouter l&apos;unité</Button> : null}
          <Button variant="secondary" onClick={form.resetAddUnitForm}>
            Annuler
          </Button>
          <div className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
            <span>Loyer</span>
            <HelpHint title="Le loyer se saisit dans le bail / contrat (page Baux), pas dans ce formulaire d’unité." />
          </div>
        </div>
      </form>
    </div>
  );
}
