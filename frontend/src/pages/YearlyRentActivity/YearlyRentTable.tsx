import { SmartLink } from '@/components/SmartLink';
import { Button, Card } from '@/components/ui/index';
import type { TableSortDir } from '@/lib/tableSort';
import { YearlyFirstColSortControls } from './YearlyFirstColSortControls';
import type { LeaseRowModel, YearlyLeaseSortKey } from './types';
import { MONTHS, cellContent, monthShortLabel } from './yearlyRentUtils';

type YearlyRentTableProps = {
  year: number;
  scope: 'tenant' | 'building';
  tenantId: string;
  buildingId: string;
  sortedLeaseRows: LeaseRowModel[];
  yearlyLeaseSortKey: YearlyLeaseSortKey;
  yearlyLeaseSortDir: TableSortDir;
  onSort: (key: YearlyLeaseSortKey) => void;
  paymentsListHref: string;
  printContextLine: string;
  printDateLabel: string;
};

/** Calendrier annuel janvier → décembre (impression paysage). */
export function YearlyRentTable({
  year,
  scope,
  tenantId,
  buildingId,
  sortedLeaseRows,
  yearlyLeaseSortKey,
  yearlyLeaseSortDir,
  onSort,
  paymentsListHref,
  printContextLine,
  printDateLabel,
}: YearlyRentTableProps) {
  return (
    <Card padding="none" className="overflow-hidden shadow-[var(--shadow-soft)] print:max-w-none print:overflow-visible print:shadow-none">
      <div className="hidden border-b border-[var(--odoo-border)] px-4 py-4 print:block print:bg-white">
        <h2 className="text-lg font-bold text-[var(--color-ink)]">ImmoPilot — Activité loyers (vue annuelle)</h2>
        <p className="mt-1 text-sm text-[var(--color-ink)]">Année {year}</p>
        {printContextLine ? <p className="mt-0.5 text-sm text-[var(--color-ink)]">{printContextLine}</p> : null}
        <p className="mt-2 text-xs text-[var(--color-muted)]">Imprimé le {printDateLabel}</p>
      </div>
      <div className="flex flex-col gap-2 border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 print:hidden">
        <p className="text-sm text-[var(--color-muted)]">
          <span className="font-semibold text-[var(--color-ink)]">Liste détaillée</span>
          {' · '}
          année {year}
          {scope === 'tenant' && tenantId
            ? ', locataire sélectionné'
            : scope === 'building' && buildingId
              ? ', bien sélectionné'
              : ''}
          , tous les mois.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={() => window.print()}>
            Imprimer le tableau
          </Button>
          <SmartLink
            to={paymentsListHref}
            className="inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-brand-600 px-3 py-2 text-xs font-bold text-white shadow-[var(--shadow-soft)] hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400"
          >
            Ouvrir Paiements →
          </SmartLink>
        </div>
      </div>
      <div className="table-scroll overflow-x-auto print:max-w-none print:overflow-visible">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm print:table-fixed print:w-full print:min-w-0 print:text-[10px] print:text-black md:min-w-[1100px]">
          <colgroup>
            <col className="print:w-[22%]" />
            {MONTHS.map((m) => (
              <col key={m} className="print:w-[6.5%]" />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)] print:text-[8px]">
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-[14rem] bg-[var(--odoo-table-head-bg)] px-3 py-2.5 align-top shadow-[1px_0_0_0_var(--odoo-border)] print:static print:min-w-0 print:max-w-none print:bg-white print:px-1.5 print:py-1 print:align-bottom print:font-bold print:normal-case print:shadow-none"
              >
                <YearlyFirstColSortControls
                  scope={scope}
                  activeKey={yearlyLeaseSortKey}
                  dir={yearlyLeaseSortDir}
                  onSort={onSort}
                />
              </th>
              {MONTHS.map((m) => (
                <th key={m} className="whitespace-nowrap px-1.5 py-2.5 text-center print:px-0.5 print:py-1 print:leading-none">
                  {monthShortLabel(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedLeaseRows.map((lr) => (
              <tr
                key={lr.key}
                className="border-b border-[var(--odoo-border)] odd:bg-[var(--color-surface)] even:bg-[var(--odoo-table-head-bg)] print:break-inside-avoid"
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-[18rem] bg-inherit px-3 py-3 text-left align-top shadow-[1px_0_0_0_var(--odoo-border)] print:static print:min-w-0 print:max-w-none print:overflow-hidden print:px-1.5 print:py-1.5 print:align-top print:shadow-none"
                >
                  <p className="font-semibold text-[var(--color-ink)] print:text-[10px] print:leading-snug">{lr.label}</p>
                  <p className="mt-0.5 text-xs font-normal text-[var(--color-muted)] print:text-[8px] print:leading-tight">
                    {lr.sub}
                  </p>
                </th>
                {MONTHS.map((m) => {
                  const p = lr.byMonth.get(m);
                  const cell = cellContent(p);
                  return (
                    <td key={m} className="px-1 py-2 text-center align-middle print:px-0.5 print:py-1">
                      <div
                        className="inline-flex min-w-[4.5rem] max-w-[7.5rem] flex-col items-center gap-0.5 print:min-w-0 print:max-w-full print:gap-0"
                        title={cell.title}
                      >
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-tight print:rounded print:px-0.5 print:py-0 print:text-[8px] print:leading-tight ${cell.className}`}
                        >
                          {cell.statusText}
                        </span>
                        {cell.amountLines.map((line, i) => (
                          <span
                            key={`${m}-amt-${i}`}
                            className="max-w-full break-words text-[10px] font-medium leading-tight tabular-nums text-[var(--color-muted)] print:text-[7px] print:leading-tight"
                          >
                            {line}
                          </span>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
