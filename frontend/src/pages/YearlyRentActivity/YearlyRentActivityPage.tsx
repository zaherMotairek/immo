import { AppPageTitle, PageHeaderKpi } from '@/components/AppPageTitle';
import { SmartLink } from '@/components/SmartLink';
import { Button, Callout, Card, EmptyState } from '@/components/ui/index';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { YearlyRentFilters } from './YearlyRentFilters';
import { YearlyRentTable } from './YearlyRentTable';
import { useYearlyRentActivity } from './useYearlyRentActivity';

/** Calendrier annuel des encaissements / retards par bail. */
export function YearlyRentActivityPage() {
  useRegisterRootSectionFallback();
  const y = useYearlyRentActivity();

  return (
    <div className="space-y-6">
      <AppPageTitle
        className="print:hidden"
        iconTo="/paiements"
        title="Activité loyers (vue annuelle)"
        hintTitle="Une ligne par bail actif : statut et montants (FCFA) mois par mois. Le lien vers Paiements reprend la même année, le même locataire ou le même bien, et tous les mois. Les baux inactifs ne sont pas listés par l’API."
        subtitle="Calendrier des encaissements et retards, mois par mois."
        actions={<PageHeaderKpi label="Total" value={String(y.sortedLeaseRows.length)} />}
      />

      <YearlyRentFilters
        scope={y.scope}
        onScopeChange={y.setScope}
        year={y.year}
        yearOptions={y.yearOptions}
        onYearChange={y.setYear}
        tenantId={y.tenantId}
        tenantOptions={y.tenantOptions}
        onTenantChange={y.setTenantId}
        buildingId={y.buildingId}
        buildingOptions={y.buildingOptions}
        onBuildingChange={y.setBuildingId}
        listsErr={y.listsErr}
        onRetryLists={() => void y.loadLists()}
        paymentsListHref={y.paymentsListHref}
      />

      {y.err ? (
        <Callout variant="danger" className="print:hidden" title="Le calendrier n’a pas pu être chargé">
          <p>{y.err}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={y.loadPayments}>
            Réessayer
          </Button>
        </Callout>
      ) : null}

      {!y.selectionOk ? (
        <Card className="print:hidden">
          <EmptyState
            className="border-0 bg-transparent"
            title={`Choisissez un locataire ou un bien pour afficher le tableau janvier → décembre ${y.year}.`}
          />
        </Card>
      ) : y.loading ? (
        <p className="text-[var(--color-muted)] print:hidden">Chargement…</p>
      ) : y.sortedLeaseRows.length === 0 ? (
        <Card className="print:hidden">
          <EmptyState
            className="border-0 bg-transparent"
            title={`Aucune échéance pour cette sélection sur l’année ${y.year} (baux actifs uniquement).`}
            action={
              <SmartLink
                to={y.paymentsListHref}
                className="inline-flex w-fit items-center rounded-[var(--radius-control)] border border-brand-400/80 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-900 transition hover:bg-brand-100 dark:border-brand-500/50 dark:bg-brand-950/40 dark:text-brand-100 dark:hover:bg-brand-900/50"
              >
                Consulter quand même Paiements (même année & périmètre) →
              </SmartLink>
            }
          />
        </Card>
      ) : (
        <YearlyRentTable
          year={y.year}
          scope={y.scope}
          tenantId={y.tenantId}
          buildingId={y.buildingId}
          sortedLeaseRows={y.sortedLeaseRows}
          yearlyLeaseSortKey={y.yearlyLeaseSortKey}
          yearlyLeaseSortDir={y.yearlyLeaseSortDir}
          onSort={y.toggleYearlyLeaseSort}
          paymentsListHref={y.paymentsListHref}
          printContextLine={y.printContextLine}
          printDateLabel={y.printDateLabel}
        />
      )}
    </div>
  );
}
