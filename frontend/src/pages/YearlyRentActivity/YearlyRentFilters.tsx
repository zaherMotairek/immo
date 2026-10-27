import { SmartLink } from '@/components/SmartLink';
import { HelpHint } from '@/components/ui';
import { Callout, Card, Field, SegmentedControl, Select } from '@/components/ui/index';
import type { UiSelectOption } from '@/components/ui/index';

type YearlyRentFiltersProps = {
  scope: 'tenant' | 'building';
  onScopeChange: (scope: 'tenant' | 'building') => void;
  year: number;
  yearOptions: number[];
  onYearChange: (y: number) => void;
  tenantId: string;
  tenantOptions: UiSelectOption[];
  onTenantChange: (id: string) => void;
  buildingId: string;
  buildingOptions: UiSelectOption[];
  onBuildingChange: (id: string) => void;
  listsErr: string | null;
  paymentsListHref: string;
};

/** Scope locataire/bien, année, sélection et lien Paiements. */
export function YearlyRentFilters({
  scope,
  onScopeChange,
  year,
  yearOptions,
  onYearChange,
  tenantId,
  tenantOptions,
  onTenantChange,
  buildingId,
  buildingOptions,
  onBuildingChange,
  listsErr,
  paymentsListHref,
}: YearlyRentFiltersProps) {
  const yearSelectOptions: UiSelectOption[] = yearOptions.map((y) => ({ id: String(y), label: String(y) }));

  return (
    <Card className="space-y-4 print:hidden">
      <SegmentedControl
        ariaLabel="Périmètre d’affichage"
        options={[
          { id: 'tenant', label: 'Par locataire' },
          { id: 'building', label: 'Par bien' },
        ]}
        value={scope}
        onChange={(id) => onScopeChange(id as 'tenant' | 'building')}
      />

      {listsErr ? <Callout variant="warning">{listsErr}</Callout> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Année" htmlFor="yra-year">
          <Select
            id="yra-year"
            options={yearSelectOptions}
            value={String(year)}
            onValueChange={(v) => onYearChange(Number(v))}
          />
        </Field>
        {scope === 'tenant' ? (
          <Field
            label={`Locataire (${tenantOptions.length})`}
            htmlFor="yra-tenant"
            className="sm:col-span-2"
          >
            <Select
              id="yra-tenant"
              searchable
              options={tenantOptions}
              emptyLabel="— Choisir un locataire —"
              value={tenantId}
              onValueChange={onTenantChange}
              aria-label={`Choisir un locataire parmi ${tenantOptions.length} locataires`}
            />
          </Field>
        ) : (
          <Field label={`Bien (${buildingOptions.length})`} htmlFor="yra-building" className="sm:col-span-2">
            <Select
              id="yra-building"
              searchable
              options={buildingOptions}
              emptyLabel="— Choisir un bien —"
              value={buildingId}
              onValueChange={onBuildingChange}
              aria-label={`Choisir un bien parmi ${buildingOptions.length} biens`}
            />
          </Field>
        )}
      </div>
      <div className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
            <HelpHint
              title="Chaque colonne = la période de facturation du mois. « — » = pas d’échéance enregistrée pour ce bail sur ce mois."
              className="align-middle"
            />
            <span>
              Le bouton ci-contre ouvre la liste{' '}
              <strong className="font-semibold text-[var(--color-ink)]">Paiements</strong> avec l’année{' '}
              <strong className="tabular-nums">{year}</strong>, le filtre « tous les mois », et le locataire ou le bien
              déjà choisis lorsque c’est possible.
            </span>
          </p>
          <SmartLink
            to={paymentsListHref}
            className="inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400"
          >
            Voir les paiements (mêmes critères) →
          </SmartLink>
        </div>
      </div>
    </Card>
  );
}
