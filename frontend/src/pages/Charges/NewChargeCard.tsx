import { AddZoomModal } from '@/components/AddZoomModal';
import { HelpHint } from '@/components/ui';
import { Button, Callout, Checkbox, Field, Input, Label, MoneyInput, Select, Textarea } from '@/components/ui/index';
import type { UiSelectOption } from '@/components/ui/index';
import { chargeCategoryOptions } from '@/lib/chargeCategories';
import { INPUT_AMOUNT_FCFA_LABEL } from '@/lib/format';
import { unitKindLabel } from '@/lib/unitKind';
import { MOIS_LONGS, capitalize } from './chargeUtils';
import type { NewChargeForm } from './useNewChargeForm';
import type { BuildingOpt } from './types';

const CATEGORY_OPTIONS: UiSelectOption[] = chargeCategoryOptions().map(({ value, label }) => ({ id: value, label }));

const MONTH_OPTIONS: UiSelectOption[] = Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
  id: String(m),
  label: `${capitalize(MOIS_LONGS[m - 1])} (${m})`,
}));

/** Fenêtre zoom « Nouvelle charge ». */
export function NewChargeCard({ form, buildings }: { form: NewChargeForm; buildings: BuildingOpt[] }) {
  const buildingOptions: UiSelectOption[] = buildings.map((b) => ({ id: b.id, label: b.name }));
  const unitOptions: UiSelectOption[] = form.units.map((u) => ({ id: u.id, label: `${unitKindLabel(u.kind)} — ${u.label}` }));

  return (
    <AddZoomModal
      open={form.addOpen}
      onClose={form.cancelAdd}
      kicker="Ajouter"
      title="Nouvelle charge"
      subtitle="Dépense liée à un bien"
      size="lg"
      titleId="nouvelle-charge-title"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <HelpHint
          className="align-middle"
          title="Cochez « Déjà réglée » si vous enregistrez la charge au moment du paiement. Sinon, ajoutez-la puis, dans la liste, utilisez « Marquer comme payé »."
        />
      </div>
      <form onSubmit={form.submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Bien concerné" htmlFor="charge-building" required>
          <Select
            id="charge-building"
            options={buildingOptions}
            emptyLabel="Choisir…"
            value={form.buildingId}
            onValueChange={form.selectBuilding}
            required
          />
        </Field>
        <Field label="Unité (optionnel)" htmlFor="charge-unit">
          <Select
            id="charge-unit"
            options={unitOptions}
            emptyLabel="Tout le bien"
            value={form.unitId}
            onValueChange={form.setUnitId}
          />
        </Field>
        <Field label="Catégorie" htmlFor="charge-category">
          <Select id="charge-category" options={CATEGORY_OPTIONS} value={form.category} onValueChange={form.setCategory} />
        </Field>
        <div className="grid">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Label htmlFor="charge-imputation-month" className="mb-0">
              Imputation (mois)
            </Label>
            <HelpHint
              className="align-middle"
              title="S’aligne sur le mois affiché en haut de page. « Année entière » pour une taxe ou charge unique sur tout l’exercice."
            />
          </div>
          <Select
            id="charge-imputation-month"
            options={MONTH_OPTIONS}
            emptyLabel="Année entière"
            value={form.periodMonth}
            onValueChange={form.setPeriodMonth}
          />
        </div>
        <Field label="Libellé" htmlFor="charge-label" required className="sm:col-span-2">
          <Input
            id="charge-label"
            value={form.label}
            onChange={(e) => form.setLabel(e.target.value)}
            required
            placeholder="Ex. Facture vigile Janvier — Société X"
          />
        </Field>
        <Field label={INPUT_AMOUNT_FCFA_LABEL} htmlFor="charge-amount" required>
          <MoneyInput id="charge-amount" value={form.amount} onChange={(e) => form.setAmount(e.target.value)} required />
        </Field>
        <Checkbox
          id="charge-paid-on-create"
          className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-3 py-2 sm:col-span-2"
          checked={form.paidOnCreate}
          onChange={(e) => form.setPaidOnCreate(e.target.checked)}
          label="Déjà réglée (payée)"
          description="À cocher si vous avez déjà payé cette dépense."
        />
        <Field label="Notes (optionnel)" htmlFor="charge-notes" className="sm:col-span-2">
          <Textarea
            id="charge-notes"
            value={form.notes}
            onChange={(e) => form.setNotes(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Réf. contrat, N° de facture…"
          />
        </Field>
        {form.err ? (
          <Callout variant="danger" className="sm:col-span-2">
            {form.err}
          </Callout>
        ) : null}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit">Ajouter</Button>
          <Button type="button" variant="secondary" onClick={form.cancelAdd}>
            Annuler
          </Button>
        </div>
      </form>
    </AddZoomModal>
  );
}
