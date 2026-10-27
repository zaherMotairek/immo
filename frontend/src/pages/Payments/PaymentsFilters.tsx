import { useMemo, useState } from 'react';
import { Button, Card, Field, SegmentedControl, Select } from '@/components/ui/index';
import { HelpHint } from '@/components/ui';
import { MOIS_SELECT_OPTIONS } from './types';
import type { LeaseFocusSummary } from './types';
import type { PaymentsFilters as Filters } from './usePaymentsFilters';

type PaymentsFiltersProps = {
  f: Filters;
  leaseFocusSummary: LeaseFocusSummary | null;
};

const eyebrow = 'text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]';
const STATUS_OPTIONS = [
  { id: 'all', label: 'Tous les statuts' },
  { id: 'overdue', label: 'Impayés & retard' },
];

/** Critères d'affichage : période, statut, mode d'encaissement, périmètre (locataire / bien / unité) ou filtre bail. */
export function PaymentsFilters({ f, leaseFocusSummary }: PaymentsFiltersProps) {
  const [mobileCriteriaOpen, setMobileCriteriaOpen] = useState(false);
  const { updateParams, leaseIdFilter, buildingIdFilter, unitIdFilter, tenantIdFilter } = f;

  const yearOptions = useMemo(
    () => [{ id: 'all', label: 'Toutes les années' }, ...f.yearOptions.map((y) => ({ id: String(y), label: String(y) }))],
    [f.yearOptions],
  );
  const monthOptions = useMemo(() => MOIS_SELECT_OPTIONS.map((o) => ({ id: o.value, label: o.label })), []);
  const methodOptions = useMemo(() => f.methodFilterOptions.map((o) => ({ id: o.value, label: o.label })), [f.methodFilterOptions]);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-col gap-1.5 border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-[var(--color-ink)]">Critères d’affichage</p>
          <Button variant="secondary" size="sm" className="sm:hidden" aria-expanded={mobileCriteriaOpen} onClick={() => setMobileCriteriaOpen((v) => !v)}>
            {mobileCriteriaOpen ? 'Masquer' : 'Afficher'}
          </Button>
        </div>
        <p className="min-w-0 truncate text-xs font-medium tabular-nums text-[var(--color-muted)] sm:max-w-[60%] sm:text-right">
          <span>Vue · </span>
          {f.periodSummaryLabel}
          {f.overdueOnly ? <span className="text-[var(--status-pending)]"> · impayés / retard</span> : null}
        </p>
      </div>

      <div className={mobileCriteriaOpen ? 'block' : 'hidden sm:block'}>
        <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-12 lg:items-start lg:gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-7">
            <Field label="Année comptable" htmlFor="payments-year">
              <Select
                id="payments-year"
                options={yearOptions}
                value={f.yearFilter === 'all' ? 'all' : String(f.yearFilter)}
                onValueChange={(v) => updateParams((q) => q.set('year', v))}
              />
            </Field>
            <Field label="Mois de facturation" htmlFor="payments-month">
              <Select
                id="payments-month"
                options={monthOptions}
                value={f.monthFilter === 'all' ? 'all' : String(f.monthFilter)}
                onValueChange={(v) => updateParams((q) => q.set('month', v))}
              />
            </Field>
          </div>

          <div className="border-t border-[var(--odoo-border-subtle)] pt-3 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            <p className={`mb-1.5 ${eyebrow}`}>Statut</p>
            <SegmentedControl
              ariaLabel="Filtrer par statut de paiement"
              options={STATUS_OPTIONS}
              value={f.overdueOnly ? 'overdue' : 'all'}
              onChange={(id) => updateParams((q) => (id === 'overdue' ? q.set('overdue', '1') : q.delete('overdue')))}
              className="w-full"
            />
            <span className="sr-only">En mode impayés, la liste exclut les échéances soldées.</span>
            <Field label="Mode d'encaissement" htmlFor="payments-method" className="mt-3">
              <Select
                id="payments-method"
                options={methodOptions}
                value={f.methodFilter}
                onValueChange={(v) => updateParams((q) => (v === 'all' ? q.delete('method') : q.set('method', v)))}
              />
            </Field>
          </div>
        </div>

        {leaseIdFilter ? (
          <div className="border-t border-[var(--odoo-border)] px-3 py-3 text-xs text-[var(--color-muted)] sm:px-4">
            <p>
              <strong className="font-semibold text-[var(--color-ink)]">Périmètre (bien, locataire, unité)</strong> :
              indisponible tant qu’un <strong>seul bail</strong> est ciblé ci-dessous. Réinitialisez le filtre bail pour
              utiliser ces critères.
            </p>
          </div>
        ) : (
          <div className="border-t border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-3 py-3 sm:px-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className={eyebrow}>Périmètre</p>
              <HelpHint
                className="align-middle"
                title="Affinez la liste par locataire, par immeuble ou par lot. Choisissez d’abord le bien pour activer le filtre unité. Compatible avec l’année et le mois de facturation."
              />
              {buildingIdFilter || unitIdFilter || tenantIdFilter ? (
                <button
                  type="button"
                  onClick={f.clearScopeFilters}
                  className="ml-auto text-xs font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                >
                  Effacer périmètre
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Locataire" htmlFor="payments-tenant">
                <Select
                  searchable
                  id="payments-tenant"
                  emptyLabel="Tous les locataires"
                  placeholder="Nom du locataire…"
                  aria-label="Filtrer par locataire"
                  options={f.tenantSearchOptions}
                  value={tenantIdFilter}
                  onValueChange={(v) => updateParams((q) => (v ? q.set('tenantId', v) : q.delete('tenantId')))}
                />
              </Field>
              <Field label="Bien" htmlFor="payments-building">
                <Select
                  searchable
                  id="payments-building"
                  emptyLabel="Tous les biens"
                  placeholder="Nom du bien…"
                  aria-label="Filtrer par bien"
                  options={f.buildingSearchOptions}
                  value={buildingIdFilter}
                  onValueChange={(v) =>
                    updateParams((q) => {
                      if (v) q.set('buildingId', v);
                      else q.delete('buildingId');
                      q.delete('unitId');
                    })
                  }
                />
              </Field>
              <Field label="Unité (lot)" htmlFor="payments-unit">
                <Select
                  searchable
                  id="payments-unit"
                  disabled={!buildingIdFilter}
                  emptyLabel={buildingIdFilter ? 'Toutes les unités du bien' : 'Choisir un bien d’abord'}
                  placeholder="Lot / unité…"
                  aria-label="Filtrer par unité"
                  options={f.unitSearchOptions}
                  value={unitIdFilter}
                  onValueChange={(v) => updateParams((q) => (v ? q.set('unitId', v) : q.delete('unitId')))}
                />
              </Field>
            </div>
          </div>
        )}

        {leaseIdFilter ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-3 py-2.5 sm:px-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <span className="inline-flex w-fit max-w-full items-center gap-2 rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)]">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand-500" />
                <span className="truncate" title={leaseFocusSummary?.tenant ?? undefined}>
                  Filtre actif ·{' '}
                  {leaseFocusSummary?.tenant ? `paiements de ${leaseFocusSummary.tenant}` : 'un seul bail (loyers)'}
                </span>
              </span>
              <span className="text-xs text-[var(--color-muted)]">
                {leaseFocusSummary?.place ? (
                  <span className="line-clamp-2 sm:line-clamp-1" title={leaseFocusSummary.place}>
                    {leaseFocusSummary.place}
                  </span>
                ) : (
                  'Les autres locations sont masquées.'
                )}
              </span>
            </div>
            <Button variant="secondary" size="sm" className="shrink-0" onClick={f.clearLeaseFilter}>
              Réinitialiser le filtre
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
