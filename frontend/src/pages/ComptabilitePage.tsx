import { useEffect, useMemo, useState } from 'react';
import { AppPageTitle } from '@/components/AppPageTitle';
import { OdooTabBar } from '@/components/OdooKit';
import { Button, Card, Label, Select, StatTile } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import {
  closeAccountingPeriod,
  downloadReport,
  getAccountingClosures,
  getAccountingWorkspace,
  openAccountingPeriod,
  type AccountingClosure,
  type AccountingWorkspace,
} from '@/lib/api';
import { fcfa } from '@/lib/format';

function monthFr(m: number) {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2026, m - 1, 1));
}

export function ComptabilitePage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState<AccountingWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<'resume' | 'ledger' | 'receivables'>('resume');
  const [closures, setClosures] = useState<AccountingClosure[]>([]);

  const yearChoices = useMemo(() => Array.from({ length: 6 }, (_, i) => thisYear - i), [thisYear]);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    getAccountingWorkspace(year)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
    getAccountingClosures(year).then(setClosures).catch(() => setClosures([]));
  }, [year]);

  const closedMonths = useMemo(() => new Set(closures.map((c) => c.periodMonth)), [closures]);

  async function toggleMonthClosure(month: number, closed: boolean) {
    try {
      if (closed) await openAccountingPeriod(year, month);
      else await closeAccountingPeriod(year, month);
      const fresh = await getAccountingClosures(year);
      setClosures(fresh);
      const ws = await getAccountingWorkspace(year);
      setData(ws);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Action impossible', { variant: 'error' });
    }
  }

  function downloadCsv(name: string, rows: string[][]) {
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const content = rows.map((r) => r.map(escape).join(';')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportLedgerCsv() {
    if (!data) return;
    downloadCsv(
      `grand-livre-${year}.csv`,
      [
        ['Date', 'Journal', 'Piece', 'Libelle', 'Debit', 'Credit', 'Statut'],
        ...data.ledger.map((x) => [
          x.date,
          x.journal,
          x.piece,
          x.label,
          String(Math.round(x.debit)),
          String(Math.round(x.credit)),
          x.status,
        ]),
      ],
    );
  }

  function exportReceivablesCsv() {
    if (!data) return;
    downloadCsv(
      `creances-${year}.csv`,
      [
        ['Locataire', 'Bien', 'Unite', 'Periode', 'Echeance', 'Du', 'Paye', 'Reste'],
        ...data.receivables.map((x) => [
          x.tenantFullName,
          x.buildingName,
          x.unitLabel,
          `${String(x.periodMonth).padStart(2, '0')}/${x.periodYear}`,
          x.dueDate,
          String(Math.round(x.amountDue)),
          String(Math.round(x.amountPaid)),
          String(Math.round(x.outstanding)),
        ]),
      ],
    );
  }

  return (
    <section className="space-y-4">
      <AppPageTitle
        iconTo="/comptabilite"
        title="Mode comptable"
        hintTitle="Résumé annuel clair pour la comptabilité avec bénéfice estimé et exports."
        subtitle="Synthèse annuelle, clôtures de période et exports comptables."
      />
      <Card className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="comp-year">Année</Label>
            <Select
              id="comp-year"
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {yearChoices.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" className="py-2 text-xs" onClick={() => downloadReport('xlsx', year)}>
            Export Excel comptable
          </Button>
          <Button type="button" variant="secondary" className="py-2 text-xs" onClick={() => downloadReport('pdf', year)}>
            Export PDF synthèse
          </Button>
        </div>
        {loading ? <p className="text-sm text-slate-500">Chargement…</p> : null}
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
      </Card>

      {data ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Loyers attendus" value={fcfa(data.totals.due)} />
            <StatTile label="Loyers encaissés" value={fcfa(data.totals.paid)} />
            <StatTile label="Charges" value={fcfa(data.totals.charges)} />
            <StatTile label="Bénéfice estimé" value={fcfa(data.estimatedProfit)} />
          </div>
          <Card className="overflow-hidden !p-0">
            <OdooTabBar
              tabs={[
                { id: 'resume', label: 'Résumé mensuel' },
                { id: 'ledger', label: 'Grand livre' },
                { id: 'receivables', label: 'Créances / impayés' },
              ]}
              activeId={tab}
              onChange={(id) => setTab(id as typeof tab)}
              ariaLabel="Sections comptables"
            />
            <div className="space-y-3 p-3 sm:p-4">
            {tab === 'resume' ? (
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
                    {data.monthly.map((m) => (
                      <tr key={m.month}>
                        <td className="font-medium capitalize">{monthFr(m.month)}</td>
                        <td>{fcfa(m.due)}</td>
                        <td>{fcfa(m.paid)}</td>
                        <td>{fcfa(m.waived)}</td>
                        <td>{fcfa(m.charges)}</td>
                        <td>{fcfa(m.netEstimated)}</td>
                        <td>
                          <Button
                            type="button"
                            variant={closedMonths.has(m.month) ? 'secondary' : 'primary'}
                            className="py-1 text-[11px]"
                            onClick={() => void toggleMonthClosure(m.month, closedMonths.has(m.month))}
                          >
                            {closedMonths.has(m.month) ? 'Réouvrir' : 'Clôturer'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {tab === 'ledger' ? (
              <>
                <div>
                  <Button type="button" className="py-1.5 text-xs" onClick={exportLedgerCsv}>
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
                      {data.ledger.map((x, idx) => (
                        <tr key={`${x.piece}-${idx}`}>
                          <td>{x.date}</td>
                          <td>{x.journal}</td>
                          <td>{x.piece}</td>
                          <td>{x.label}</td>
                          <td>{x.debit ? fcfa(x.debit) : '—'}</td>
                          <td>{x.credit ? fcfa(x.credit) : '—'}</td>
                          <td>{x.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            {tab === 'receivables' ? (
              <>
                <div>
                  <Button type="button" className="py-1.5 text-xs" onClick={exportReceivablesCsv}>
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
                      {data.receivables.map((x) => (
                        <tr key={x.paymentId}>
                          <td>{x.tenantFullName}</td>
                          <td>{x.buildingName}</td>
                          <td>{x.unitLabel}</td>
                          <td>{`${String(x.periodMonth).padStart(2, '0')}/${x.periodYear}`}</td>
                          <td>{x.dueDate}</td>
                          <td>{fcfa(x.amountDue)}</td>
                          <td>{fcfa(x.amountPaid)}</td>
                          <td className="font-semibold text-rose-700 dark:text-rose-300">{fcfa(x.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
            </div>
          </Card>
        </>
      ) : null}
    </section>
  );
}
