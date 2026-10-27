import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/ui/index';
import {
  closeAccountingPeriod,
  getAccountingClosures,
  getAccountingWorkspace,
  openAccountingPeriod,
  type AccountingClosure,
  type AccountingWorkspace,
} from '@/lib/api';
import { downloadCsv } from './comptabiliteUtils';

/** Année, workspace comptable, clôtures et exports CSV. */
export function useComptabilite() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState<AccountingWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<'resume' | 'ledger' | 'receivables'>('resume');
  const [closures, setClosures] = useState<AccountingClosure[]>([]);

  const yearChoices = useMemo(() => Array.from({ length: 6 }, (_, i) => thisYear - i), [thisYear]);

  const reload = useCallback(() => {
    setLoading(true);
    setErr(null);
    getAccountingWorkspace(year)
      .then(setData)
      .catch((e) => {
        setData(null);
        setErr(e instanceof Error ? e.message : 'Erreur de chargement');
      })
      .finally(() => setLoading(false));
    getAccountingClosures(year).then(setClosures).catch(() => setClosures([]));
  }, [year]);

  useEffect(() => {
    reload();
  }, [reload]);

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

  function exportLedgerCsv() {
    if (!data) return;
    downloadCsv(`grand-livre-${year}.csv`, [
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
    ]);
  }

  function exportReceivablesCsv() {
    if (!data) return;
    downloadCsv(`creances-${year}.csv`, [
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
    ]);
  }

  return {
    year,
    setYear,
    yearChoices,
    data,
    loading,
    err,
    reload,
    tab,
    setTab,
    closedMonths,
    toggleMonthClosure,
    exportLedgerCsv,
    exportReceivablesCsv,
  };
}
