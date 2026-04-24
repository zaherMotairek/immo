import { useEffect, useMemo, useState } from 'react';
import { FicheLocationLink } from '@/components/FicheLocationLink';
import { SmartLink } from '@/components/SmartLink';
import { useReturnRowFocus } from '@/hooks/useReturnRowFocus';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { AppPageTitle } from '@/components/AppPageTitle';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { Card, StatTile } from '@/components/ui';
import { listTableCellClass, listTableDataRowClass, listTableFirstCellClass } from '@/lib/listTableStyles';
import { SortableTh } from '@/components/SortableTh';
import { toggleTableSortColumn } from '@/lib/tableSort';
import type { TableSortDir } from '@/lib/tableSort';

type DepositRow = {
  leaseId: string;
  active: boolean;
  monthlyRent: number;
  depositAmount: number;
  depositPaidAt: string;
  tenantFullName: string;
  buildingName: string;
  unitLabel: string;
  localizationLine: string;
};

function cautionMoisLabel(monthlyRent: number, depositAmount: number): string {
  if (monthlyRent <= 0 || depositAmount <= 0) return '—';
  const m = depositAmount / monthlyRent;
  const entier = Math.round(m);
  if (Math.abs(m - entier) < 0.051) {
    return `${entier} mois`;
  }
  return `${Number(m.toFixed(1)).toLocaleString('fr-FR')} mois`;
}

function cautionRowFlash(active: boolean) {
  return active
    ? 'ring-2 ring-inset ring-brand-500/90 bg-brand-50/90 shadow-[0_0_0_1px_rgba(59,130,246,0.35)] dark:bg-brand-950/45 dark:ring-brand-400/80'
    : '';
}

type CautionSortKey = 'date' | 'tenant' | 'local' | 'moisEquiv' | 'amount' | 'lease';

function cautionMoisRatio(monthlyRent: number, depositAmount: number): number {
  if (monthlyRent <= 0 || depositAmount <= 0) return -1;
  return depositAmount / monthlyRent;
}

function compareCautionRows(a: DepositRow, b: DepositRow, key: CautionSortKey, dir: TableSortDir): number {
  const sign = dir === 'asc' ? 1 : -1;
  let c = 0;
  switch (key) {
    case 'date':
      c = a.depositPaidAt.localeCompare(b.depositPaidAt);
      break;
    case 'tenant':
      c = a.tenantFullName.localeCompare(b.tenantFullName, 'fr', { sensitivity: 'base' });
      break;
    case 'local':
      c = `${a.localizationLine} ${a.buildingName} ${a.unitLabel}`
        .trim()
        .localeCompare(`${b.localizationLine} ${b.buildingName} ${b.unitLabel}`.trim(), 'fr', { sensitivity: 'base' });
      break;
    case 'moisEquiv':
      c = cautionMoisRatio(a.monthlyRent, a.depositAmount) - cautionMoisRatio(b.monthlyRent, b.depositAmount);
      break;
    case 'amount':
      c = a.depositAmount - b.depositAmount;
      break;
    case 'lease':
      c = a.leaseId.localeCompare(b.leaseId);
      break;
    default:
      c = 0;
  }
  if (c === 0) c = a.leaseId.localeCompare(b.leaseId);
  return c * sign;
}

export function CautionsEncaisséesPage() {
  useRegisterRootSectionFallback();
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [listFetched, setListFetched] = useState(false);
  const [cautionSortKey, setCautionSortKey] = useState<CautionSortKey>('date');
  const [cautionSortDir, setCautionSortDir] = useState<TableSortDir>('desc');

  function toggleCautionSort(key: CautionSortKey) {
    const n = toggleTableSortColumn(cautionSortKey, cautionSortDir, key);
    setCautionSortKey(n.key);
    setCautionSortDir(n.dir);
  }

  useEffect(() => {
    setListFetched(false);
    api<DepositRow[]>('/leases/deposits-collected')
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setListFetched(true));
  }, []);

  const flashLeaseId = useReturnRowFocus({ rowIdPrefix: 'caution-row-', ready: listFetched });

  const totals = useMemo(() => {
    const sum = rows.reduce((s, r) => s + r.depositAmount, 0);
    return { count: rows.length, sum };
  }, [rows]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => compareCautionRows(a, b, cautionSortKey, cautionSortDir));
    return copy;
  }, [rows, cautionSortKey, cautionSortDir]);

  return (
    <div className="space-y-6">
      <AppPageTitle
        className="max-w-3xl"
        iconTo="/cautions"
        title="Cautions encaissées"
        hintTitle="Baux avec dépôt marqué encaissé. Colonne « Mois » : équivalent en mois de loyer (caution ÷ loyer). Échéances : Paiements."
        titleExtra={<StatTile className="shrink-0" label="Total" value={String(rows.length)} />}
      />

      {rows.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Nombre</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{totals.count}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Total encaissé</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fcfa(totals.sum)}</p>
          </Card>
        </div>
      ) : null}

      <Card className="!overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/95 dark:border-slate-700 dark:bg-slate-800/60">
                <SortableTh
                  label="Date encaissement"
                  columnKey="date"
                  activeKey={cautionSortKey}
                  dir={cautionSortDir}
                  onSort={toggleCautionSort}
                  thClassName="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200"
                />
                <SortableTh
                  label="Locataire"
                  columnKey="tenant"
                  activeKey={cautionSortKey}
                  dir={cautionSortDir}
                  onSort={toggleCautionSort}
                  thClassName="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200"
                />
                <SortableTh
                  label="Local"
                  columnKey="local"
                  activeKey={cautionSortKey}
                  dir={cautionSortDir}
                  onSort={toggleCautionSort}
                  thClassName="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200"
                />
                <SortableTh
                  label="Mois (équiv.)"
                  columnKey="moisEquiv"
                  activeKey={cautionSortKey}
                  dir={cautionSortDir}
                  onSort={toggleCautionSort}
                  align="end"
                  thClassName="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 dark:text-slate-200"
                />
                <SortableTh
                  label="Montant"
                  columnKey="amount"
                  activeKey={cautionSortKey}
                  dir={cautionSortDir}
                  onSort={toggleCautionSort}
                  align="end"
                  thClassName="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200"
                />
                <SortableTh
                  label="Fiche location"
                  columnKey="lease"
                  activeKey={cautionSortKey}
                  dir={cautionSortDir}
                  onSort={toggleCautionSort}
                  thClassName="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 dark:text-slate-200"
                />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-600 dark:text-slate-400">
                    <p>Aucune caution encaissée enregistrée.</p>
                    <p className="mt-2 text-xs">
                      Renseignez le dépôt sur une{' '}
                      <SmartLink to="/locations" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
                        fiche location
                      </SmartLink>
                      , puis « Marquer la caution encaissée ».
                    </p>
                  </td>
                </tr>
              ) : (
                sortedRows.map((r, rowIndex) => (
                  <tr
                    key={r.leaseId}
                    id={`caution-row-${r.leaseId}`}
                    className={`scroll-mt-28 ${listTableDataRowClass(rowIndex)} ${cautionRowFlash(flashLeaseId === r.leaseId)}`}
                  >
                    <td className={`${listTableFirstCellClass} whitespace-nowrap tabular-nums text-slate-800 dark:text-slate-200`}>
                      {r.depositPaidAt}
                    </td>
                    <td className={`${listTableCellClass} font-medium text-slate-900 dark:text-slate-100`}>{r.tenantFullName}</td>
                    <td className={`${listTableCellClass} text-slate-700 dark:text-slate-300`}>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{r.localizationLine}</span>
                      <span>
                        {r.buildingName} — {r.unitLabel}
                      </span>
                      {!r.active ? (
                        <span className="ml-2 rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          Bail inactif
                        </span>
                      ) : null}
                    </td>
                    <td className={`${listTableCellClass} whitespace-nowrap text-right tabular-nums text-slate-800 dark:text-slate-200`}>
                      {cautionMoisLabel(r.monthlyRent, r.depositAmount)}
                    </td>
                    <td className={`${listTableCellClass} whitespace-nowrap text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100`}>
                      {fcfa(r.depositAmount)}
                    </td>
                    <td className={listTableCellClass}>
                      <FicheLocationLink leaseId={r.leaseId} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
