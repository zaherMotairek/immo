import { Card, StatTile, Tabs } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import { ComptabiliteHeader } from './ComptabiliteHeader';
import { LedgerTab } from './LedgerTab';
import { MonthlyTab } from './MonthlyTab';
import { ReceivablesTab } from './ReceivablesTab';
import { useComptabilite } from './useComptabilite';

/** Mode comptable : synthèse annuelle, grand livre, créances et clôtures. */
export function ComptabilitePage() {
  const c = useComptabilite();

  return (
    <section className="space-y-4">
      <ComptabiliteHeader
        year={c.year}
        yearChoices={c.yearChoices}
        loading={c.loading}
        err={c.err}
        onYearChange={c.setYear}
        onRetry={c.reload}
      />

      {c.data ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Loyers attendus" value={fcfa(c.data.totals.due)} />
            <StatTile label="Loyers encaissés" value={fcfa(c.data.totals.paid)} />
            <StatTile label="Charges" value={fcfa(c.data.totals.charges)} />
            <StatTile label="Bénéfice estimé" value={fcfa(c.data.estimatedProfit)} />
          </div>
          <Card padding="none" className="overflow-hidden">
            <Tabs
              tabs={[
                { id: 'resume', label: 'Résumé mensuel' },
                { id: 'ledger', label: 'Grand livre' },
                { id: 'receivables', label: 'Créances / impayés' },
              ]}
              activeId={c.tab}
              onChange={(id) => c.setTab(id as typeof c.tab)}
              ariaLabel="Sections comptables"
            />
            <div className="space-y-3 p-3 sm:p-4">
              {c.tab === 'resume' ? (
                <MonthlyTab
                  monthly={c.data.monthly}
                  closedMonths={c.closedMonths}
                  onToggleClosure={c.toggleMonthClosure}
                />
              ) : null}
              {c.tab === 'ledger' ? (
                <LedgerTab ledger={c.data.ledger} onExport={c.exportLedgerCsv} />
              ) : null}
              {c.tab === 'receivables' ? (
                <ReceivablesTab receivables={c.data.receivables} onExport={c.exportReceivablesCsv} />
              ) : null}
            </div>
          </Card>
        </>
      ) : null}
    </section>
  );
}
