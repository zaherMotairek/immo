import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FicheLocationLink } from '@/components/FicheLocationLink';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { AppPageTitle } from '@/components/AppPageTitle';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { Card } from '@/components/ui';
import { listTableCellClass, listTableDataRowClass, listTableFirstCellClass } from '@/lib/listTableStyles';

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

export function CautionsEncaisséesPage() {
  useRegisterRootSectionFallback();
  const [rows, setRows] = useState<DepositRow[]>([]);

  useEffect(() => {
    api<DepositRow[]>('/leases/deposits-collected')
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  const totals = useMemo(() => {
    const sum = rows.reduce((s, r) => s + r.depositAmount, 0);
    return { count: rows.length, sum };
  }, [rows]);

  return (
    <div className="space-y-6">
      <AppPageTitle
        className="max-w-3xl"
        iconTo="/cautions"
        title="Cautions encaissées"
        hintTitle="Baux avec dépôt marqué encaissé. Colonne « Mois » : équivalent en mois de loyer (caution ÷ loyer). Échéances : Paiements."
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
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Date encaissement</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Locataire</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Local</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                  Mois (équiv.)
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">Montant</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 dark:text-slate-200" title="Fiche du bail (location)">
                  Fiche location
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-600 dark:text-slate-400">
                    <p>Aucune caution encaissée enregistrée.</p>
                    <p className="mt-2 text-xs">
                      Renseignez le dépôt sur une{' '}
                      <Link to="/locations" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
                        fiche location
                      </Link>
                      , puis « Marquer la caution encaissée ».
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((r, rowIndex) => (
                  <tr key={r.leaseId} className={listTableDataRowClass(rowIndex)}>
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
