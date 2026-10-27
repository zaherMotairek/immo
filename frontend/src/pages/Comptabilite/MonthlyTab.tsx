import { Button } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import type { AccountingWorkspace } from '@/lib/api';
import { monthFr } from './comptabiliteUtils';

type MonthlyTabProps = {
  monthly: AccountingWorkspace['monthly'];
  closedMonths: Set<number>;
  onToggleClosure: (month: number, closed: boolean) => void;
};

/** Résumé mensuel : dus, encaissements, charges, clôture. */
export function MonthlyTab({ monthly, closedMonths, onToggleClosure }: MonthlyTabProps) {
  return (
    <div className="table-scroll overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Mois</th>
            <th>Loyers dus</th>
            <th>Encaissements</th>
            <th>Loyers offerts</th>
            <th>Charges</th>
            <th>Net estimé</th>
            <th>Clôture</th>
          </tr>
        </thead>
        <tbody>
          {monthly.map((m) => (
            <tr key={m.month}>
              <td className="font-medium capitalize">{monthFr(m.month)}</td>
              <td className="tabular-nums">{fcfa(m.due)}</td>
              <td className="tabular-nums">{fcfa(m.paid)}</td>
              <td className="tabular-nums">{fcfa(m.waived)}</td>
              <td className="tabular-nums">{fcfa(m.charges)}</td>
              <td className="tabular-nums">{fcfa(m.netEstimated)}</td>
              <td>
                <Button
                  type="button"
                  variant={closedMonths.has(m.month) ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => void onToggleClosure(m.month, closedMonths.has(m.month))}
                >
                  {closedMonths.has(m.month) ? 'Réouvrir' : 'Clôturer'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
