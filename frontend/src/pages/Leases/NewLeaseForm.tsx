import { useMemo } from 'react';
import { SmartLink } from '@/components/SmartLink';
import { Button, Callout, Field, Input, MoneyInput, Select } from '@/components/ui/index';
import { INPUT_AMOUNT_FCFA_LABEL } from '@/lib/format';
import { unitKindLabel } from '@/lib/unitKind';
import { HintedField } from './HintedField';
import { formatBuildingChoiceLabel } from './leaseUtils';
import { NEW_TENANT_OPTION_ID } from './types';
import type { BuildingOpt, DepositMonthsPreset, TenantOpt } from './types';
import type { NewLeaseForm as NewLeaseFormState } from './useNewLeaseForm';

type NewLeaseFormProps = {
  form: NewLeaseFormState;
  buildingsAvailable: BuildingOpt[];
  tenants: TenantOpt[];
  onOpenQuickTenant: () => void;
};

const DEPOSIT_OPTIONS = [
  { id: '0', label: 'Aucune caution calculée' },
  { id: '1', label: '1 mois de loyer' },
  { id: '2', label: '2 mois de loyer' },
  { id: '3', label: '3 mois de loyer' },
];

const START_HELP =
  'La fin de contrat est enregistrée automatiquement un an après cette date (même jour). Le premier loyer facturé est le mois suivant l’enregistrement du bail (sauf si la date de début est plus tard : on commence alors à ce mois-là). Chaque échéance tombe le jour indiqué dans le mois de la période (ex. mai → 1ᵉʳ mai si échéance le 1).';

/** Champs du formulaire « nouveau bail » (bien, lot, locataire, dates, loyer, caution). */
export function NewLeaseForm({ form: f, buildingsAvailable, tenants, onOpenQuickTenant }: NewLeaseFormProps) {
  const buildingOptions = useMemo(
    () =>
      [...buildingsAvailable]
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
        .map((b) => ({ id: b.id, label: formatBuildingChoiceLabel(b) })),
    [buildingsAvailable],
  );
  const unitOptions = useMemo(
    () =>
      f.vacantUnitsInSelectedBuilding.map((u) => ({
        id: u.id,
        label: `${unitKindLabel(u.kind)} — ${u.label}${u.apartmentSlot != null ? ` (n° ${u.apartmentSlot})` : ''}`,
      })),
    [f.vacantUnitsInSelectedBuilding],
  );
  const tenantOptions = useMemo(
    () => [
      ...tenants.map((t) => ({ id: t.id, label: `${t.firstName} ${t.lastName}` })),
      { id: NEW_TENANT_OPTION_ID, label: '+ Nouveau locataire…' },
    ],
    [tenants],
  );
  const single = f.vacantUnitsInSelectedBuilding[0];

  return (
    <form noValidate onSubmit={f.create} className="grid gap-4 sm:grid-cols-2">
      <HintedField label="Bien" htmlFor="lease-building" help={f.immeubleIndicatifHint || undefined} className="sm:col-span-2">
        <Select
          id="lease-building"
          options={buildingOptions}
          emptyLabel="Choisir le bien…"
          value={f.buildingIdForLease}
          onValueChange={(v) => {
            f.setBuildingIdForLease(v);
            f.setUnitId('');
          }}
          required
        />
      </HintedField>

      {f.showLeaseUnitSelect ? (
        <HintedField
          label={f.isMultiLotSelected ? 'Lot / unité à louer' : 'Unité concernée'}
          htmlFor="lease-unit"
          className="sm:col-span-2"
          aside={
            f.nUnitsInBuilding > 1 ? (
              <span className="rounded-md border border-brand-600/30 bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800 dark:border-brand-500/40 dark:bg-brand-950/40 dark:text-brand-100">
                {f.nVacantUnits} libre{f.nVacantUnits !== 1 ? 's' : ''} sur {f.nUnitsInBuilding} lot
                {f.nUnitsInBuilding !== 1 ? 's' : ''}
              </span>
            ) : null
          }
        >
          <Select
            id="lease-unit"
            options={unitOptions}
            emptyLabel={f.buildingIdForLease ? "Choisir l'unité ou le lot…" : "Choisissez d'abord un bien"}
            value={f.unitId}
            onValueChange={f.setUnitId}
            required
            disabled={!f.buildingIdForLease}
          />
        </HintedField>
      ) : f.needsUnitsOnBuildingFirst ? (
        <Callout variant="warning" title="Aucune unité enregistrée sur ce bien multi locataires." className="sm:col-span-2">
          <p>Créez d’abord les lots (unités) sur la fiche « Biens », puis revenez pour attacher le bail au bon lot.</p>
          {f.selectedBuilding ? (
            <SmartLink
              className="mt-2 inline-flex font-semibold underline-offset-2 hover:underline"
              to={`/biens/${f.selectedBuilding.id}`}
            >
              Ouvrir la fiche du bien « {f.selectedBuilding.name} »
            </SmartLink>
          ) : null}
        </Callout>
      ) : f.allUnitsLeased ? (
        <Callout variant="info" title="Aucun lot libre sur ce bien." className="sm:col-span-2">
          Tous les lots ont déjà un bail actif. Pour enregistrer un nouveau bail ici, terminez ou désactivez d’abord un bail
          existant sur la fiche location concernée.
        </Callout>
      ) : f.selectedBuilding && !f.isMultiLotSelected ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-muted)] sm:col-span-2">
          {f.monoLotBlocksLease ? (
            <>
              <span className="font-medium text-[var(--color-ink)]">Aucun lot sur ce bien.</span> Créez l’unité (villa,
              parcelle, local unique…) sur la{' '}
              <SmartLink className="font-semibold text-brand-700 underline dark:text-brand-300" to={`/biens/${f.selectedBuilding.id}`}>
                fiche du bien
              </SmartLink>
              , puis enregistrez le bail.
            </>
          ) : f.unitsInSelectedBuilding.length === 1 && f.nVacantUnits === 1 && single ? (
            <>
              <span className="font-medium text-[var(--color-ink)]">Bail sur l’unique lot :</span>{' '}
              {unitKindLabel(single.kind)} — {single.label}
              {single.apartmentSlot != null ? ` (n° ${single.apartmentSlot})` : ''}.
            </>
          ) : null}
        </div>
      ) : null}

      <Field
        label="Locataire"
        htmlFor="lease-tenant"
        className="sm:col-span-2"
        hint={
          <>
            <button
              type="button"
              className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
              onClick={onOpenQuickTenant}
            >
              Nouveau locataire rapide…
            </button>{' '}
            (création sans quitter cette page)
          </>
        }
      >
        <Select
          id="lease-tenant"
          options={tenantOptions}
          emptyLabel="Choisir…"
          value={f.tenantId}
          onValueChange={(next) => {
            if (next === NEW_TENANT_OPTION_ID) {
              onOpenQuickTenant();
              return;
            }
            f.setTenantId(next);
          }}
          required
        />
      </Field>

      <HintedField
        label="Début du bail"
        htmlFor="lease-start"
        help={START_HELP}
        hint={f.leaseEndPreviewFr ? `Fin de contrat (automatique) : ${f.leaseEndPreviewFr}` : undefined}
      >
        <Input id="lease-start" type="date" value={f.startDate} onChange={(e) => f.setStartDate(e.target.value)} required />
      </HintedField>

      <Field label={`${INPUT_AMOUNT_FCFA_LABEL} — loyer mensuel`} htmlFor="lease-rent">
        <MoneyInput id="lease-rent" value={f.monthlyRent} onChange={(e) => f.setMonthlyRent(e.target.value)} required />
      </Field>

      <HintedField
        label="Caution (dépôt) — nombre de loyers"
        htmlFor="lease-deposit-months"
        help="Caution = loyer × le nombre de mois choisi. « Aucune » si pas de dépôt contractuel."
      >
        <Select
          id="lease-deposit-months"
          options={DEPOSIT_OPTIONS}
          value={f.depositMonthsPreset}
          onValueChange={(v) => f.setDepositMonthsPreset(v as DepositMonthsPreset)}
        />
      </HintedField>

      <Field label="Jour d’échéance (1–31)" htmlFor="lease-due-day">
        <Input
          id="lease-due-day"
          type="number"
          min={1}
          max={31}
          value={f.rentDueDay}
          onChange={(e) => f.setRentDueDay(e.target.value)}
        />
      </Field>

      {f.err ? (
        <Callout variant="danger" className="sm:col-span-2">
          {f.err}
        </Callout>
      ) : null}

      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={f.monoLotBlocksLease || f.needsUnitsOnBuildingFirst}>
          Créer le bail
        </Button>
        <Button type="button" variant="secondary" onClick={f.cancelNewLease}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
