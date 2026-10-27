import { Button } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import type { AccountingWorkspace } from '@/lib/api';

type ReceivablesTabProps = {
  receivables: AccountingWorkspace['receivables'];
  onExport: () => void;
};

/** Créances / impayés + export CSV. */
export function ReceivablesTab({ receivables, onExport }: ReceivablesTabProps) {
  return (
    <>
      <div>
        <Button type="button" size="sm" onClick={onExport}>
          Export CSV créances
        </Button>
      </div>
      <div className="table-scroll overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Locataire</th>
              <th>Bien</th>
              <th>Unité</th>
              <th>Période</th>
              <th>Échéance</th>
              <th>Montant dû</th>
              <th>Montant payé</th>
              <th>Reste</th>
            </tr>
          </thead>
          <tbody>
            {receivables.map((x) => (
              <tr key={x.paymentId}>
                <td>{x.tenantFullName}</td>
                <td>{x.buildingName}</td>
                <td>{x.unitLabel}</td>
                <td>{`${String(x.periodMonth).padStart(2, '0')}/${x.periodYear}`}</td>
                <td>{x.dueDate}</td>
                <td className="tabular-nums">{fcfa(x.amountDue)}</td>
                <td className="tabular-nums">{fcfa(x.amountPaid)}</td>
                <td className="font-semibold tabular-nums text-[var(--status-late)]">{fcfa(x.outstanding)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
