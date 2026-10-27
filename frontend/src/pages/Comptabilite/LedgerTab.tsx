import { Button } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import type { AccountingWorkspace } from '@/lib/api';

type LedgerTabProps = {
  ledger: AccountingWorkspace['ledger'];
  onExport: () => void;
};

/** Grand livre + export CSV. */
export function LedgerTab({ ledger, onExport }: LedgerTabProps) {
  return (
    <>
      <div>
        <Button type="button" size="sm" onClick={onExport}>
          Export CSV grand livre
        </Button>
      </div>
      <div className="table-scroll overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Journal</th>
              <th>Pièce</th>
              <th>Libellé</th>
              <th>Débit</th>
              <th>Crédit</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((x, idx) => (
              <tr key={`${x.piece}-${idx}`}>
                <td>{x.date}</td>
                <td>{x.journal}</td>
                <td>{x.piece}</td>
                <td>{x.label}</td>
                <td className="tabular-nums">{x.debit ? fcfa(x.debit) : '—'}</td>
                <td className="tabular-nums">{x.credit ? fcfa(x.credit) : '—'}</td>
                <td>{x.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
