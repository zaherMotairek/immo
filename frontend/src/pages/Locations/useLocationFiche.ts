import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { fcfa, formatDateFr } from '@/lib/format';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { useEscapeCancel } from '@/lib/useEscapeCancel';
import { toggleTableSortColumn } from '@/lib/tableSort';
import type { TableSortDir } from '@/lib/tableSort';
import { compareScheduleRows, isoDateFromUnknown } from './locationUtils';
import type { Fiche, ScheduleSortKey } from './types';

/** Chargement fiche location + édition bail, caution, gratuité, prépaiement. */
export function useLocationFiche(id: string | undefined) {
  const navigate = useNavigate();
  const [data, setData] = useState<Fiche | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [savingLease, setSavingLease] = useState(false);
  const [leaseErr, setLeaseErr] = useState<string | null>(null);
  const [monthlyRent, setMonthlyRent] = useState('');
  const [rentDueDay, setRentDueDay] = useState('1');
  const [depositAmount, setDepositAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [prepayMonths, setPrepayMonths] = useState('1');
  const [prepayBusy, setPrepayBusy] = useState(false);
  const [prepayErr, setPrepayErr] = useState<string | null>(null);
  const [depositActBusy, setDepositActBusy] = useState(false);
  const [waiveTargetId, setWaiveTargetId] = useState<string | null>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [waiveBusy, setWaiveBusy] = useState(false);
  const [waiveErr, setWaiveErr] = useState<string | null>(null);
  const [scheduleSortKey, setScheduleSortKey] = useState<ScheduleSortKey>('period');
  const [scheduleSortDir, setScheduleSortDir] = useState<TableSortDir>('asc');

  const sortedPaymentSchedule = useMemo(() => {
    const raw = data?.paymentSchedule ?? [];
    const copy = [...raw];
    copy.sort((a, b) => compareScheduleRows(a, b, scheduleSortKey, scheduleSortDir));
    return copy;
  }, [data?.paymentSchedule, scheduleSortKey, scheduleSortDir]);

  function toggleScheduleSort(key: ScheduleSortKey) {
    const n = toggleTableSortColumn(scheduleSortKey, scheduleSortDir, key);
    setScheduleSortKey(n.key);
    setScheduleSortDir(n.dir);
  }

  const reload = useCallback(() => {
    if (!id) return;
    setErr(null);
    setData(null);
    api<Fiche>(`/leases/${id}/fiche`)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Erreur'));
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!data) return;
    setMonthlyRent(String(Math.round(Number(data.financial.monthlyRent))));
    setRentDueDay(String(data.financial.rentDueDay));
    setDepositAmount(
      data.financial.depositAmount != null ? String(Math.round(Number(data.financial.depositAmount))) : '',
    );
    setStartDate(formatDateFr(data.startDate));
    setEndDate(data.endDate ? formatDateFr(data.endDate) : '');
    setLeaseErr(null);
  }, [data]);

  const leaseFormDirty = useMemo(() => {
    if (!data) return false;
    const dep = depositAmount.trim() === '' ? null : Math.round(Number(depositAmount));
    const serverDep =
      data.financial.depositAmount != null ? Math.round(Number(data.financial.depositAmount)) : null;
    const startIso = isoDateFromUnknown(startDate);
    const endIso = isoDateFromUnknown(endDate.trim());
    const serverStartIso = data.startDate.slice(0, 10);
    const serverEndIso = data.endDate ? data.endDate.slice(0, 10) : '';
    return (
      monthlyRent !== String(Math.round(Number(data.financial.monthlyRent))) ||
      rentDueDay !== String(data.financial.rentDueDay) ||
      dep !== serverDep ||
      (startIso ?? '') !== serverStartIso ||
      (endIso ?? '') !== serverEndIso
    );
  }, [data, monthlyRent, rentDueDay, depositAmount, startDate, endDate]);

  function resetLeaseEditForm() {
    if (!data) return;
    setMonthlyRent(String(Math.round(Number(data.financial.monthlyRent))));
    setRentDueDay(String(data.financial.rentDueDay));
    setDepositAmount(
      data.financial.depositAmount != null ? String(Math.round(Number(data.financial.depositAmount))) : '',
    );
    setStartDate(formatDateFr(data.startDate));
    setEndDate(data.endDate ? formatDateFr(data.endDate) : '');
    setLeaseErr(null);
  }

  useEscapeCancel(leaseFormDirty, resetLeaseEditForm);

  async function saveLeaseConditions(e: FormEvent) {
    e.preventDefault();
    if (!data) return;
    setLeaseErr(null);
    const rent = Number(monthlyRent);
    if (!Number.isFinite(rent) || rent < 0) {
      setLeaseErr('Loyer mensuel invalide.');
      return;
    }
    const due = Number(rentDueDay);
    if (!Number.isInteger(due) || due < 1 || due > 31) {
      setLeaseErr('Jour d’échéance : entre 1 et 31.');
      return;
    }
    let depositPayload: number | null;
    if (depositAmount.trim() === '') {
      depositPayload = null;
    } else {
      const d = Number(depositAmount);
      if (!Number.isFinite(d) || d < 0) {
        setLeaseErr('Dépôt de garantie invalide.');
        return;
      }
      depositPayload = Math.round(d);
    }
    const startIso = isoDateFromUnknown(startDate);
    if (!startIso) {
      setLeaseErr('Date de début invalide. Format attendu : jj/mm/aaaa.');
      return;
    }
    const endRaw = endDate.trim();
    const endIso = endRaw ? isoDateFromUnknown(endRaw) : null;
    if (endRaw && !endIso) {
      setLeaseErr('Date de fin invalide. Format attendu : jj/mm/aaaa.');
      return;
    }
    setSavingLease(true);
    try {
      await api(`/leases/${data.leaseId}`, {
        method: 'PATCH',
        json: {
          monthlyRent: Math.round(rent),
          rentDueDay: due,
          startDate: startIso,
          endDate: endIso,
          depositAmount: depositPayload,
        },
      });
      await reload();
    } catch (e2) {
      setLeaseErr(e2 instanceof Error ? e2.message : 'Enregistrement impossible.');
    } finally {
      setSavingLease(false);
    }
  }

  async function markDepositReceived(todayIsoDate: string) {
    if (!data) return;
    setDepositActBusy(true);
    try {
      await api(`/leases/${data.leaseId}`, { method: 'PATCH', json: { depositPaidAt: todayIsoDate } });
      await reload();
    } catch (e2) {
      toast(e2 instanceof Error ? e2.message : 'Action impossible.', { variant: 'error' });
    } finally {
      setDepositActBusy(false);
    }
  }

  async function clearDepositReceived() {
    if (!data) return;
    setDepositActBusy(true);
    try {
      await api(`/leases/${data.leaseId}`, { method: 'PATCH', json: { depositPaidAt: null } });
      await reload();
    } catch (e2) {
      toast(e2 instanceof Error ? e2.message : 'Action impossible.', { variant: 'error' });
    } finally {
      setDepositActBusy(false);
    }
  }

  async function submitWaiveRent() {
    if (!waiveTargetId) return;
    const r = waiveReason.trim();
    if (r.length < 3) {
      setWaiveErr('Indiquez un motif d’au moins 3 caractères.');
      return;
    }
    setWaiveBusy(true);
    setWaiveErr(null);
    try {
      await api(`/payments/${waiveTargetId}/waive`, { method: 'POST', json: { reason: r } });
      setWaiveTargetId(null);
      setWaiveReason('');
      await reload();
    } catch (e2) {
      setWaiveErr(e2 instanceof Error ? e2.message : 'Enregistrement impossible.');
    } finally {
      setWaiveBusy(false);
    }
  }

  async function prepayRent() {
    if (!data) return;
    const n = Number(prepayMonths);
    if (!Number.isInteger(n) || n < 1 || n > 12) {
      setPrepayErr('Choisissez un nombre de mois entre 1 et 12.');
      return;
    }
    setPrepayErr(null);
    setPrepayBusy(true);
    try {
      const res = await api<{
        monthsPaid: number;
        totalFcfa: number;
        periods: string[];
        paymentIds: string[];
      }>(`/leases/${data.leaseId}/prepay-months`, { method: 'POST', json: { months: n } });
      toast(
        `${res.monthsPaid} mois enregistré(s) comme payés (${res.periods.join(', ')}) — total ${fcfa(res.totalFcfa)}. Téléchargez le reçu PDF depuis Paiements (bouton Reçu PDF) si besoin.`,
        { variant: 'success', duration: 10000 },
      );
      await reload();
    } catch (e2) {
      setPrepayErr(e2 instanceof Error ? e2.message : 'Impossible d’enregistrer le paiement.');
    } finally {
      setPrepayBusy(false);
    }
  }

  function applyDepositFromRent(months: 1 | 2 | 3) {
    const rent = Number(monthlyRent);
    if (!Number.isFinite(rent) || rent < 0) {
      setLeaseErr('Indiquez d’abord un loyer mensuel valide.');
      return;
    }
    setLeaseErr(null);
    setDepositAmount(String(Math.round(rent * months)));
  }

  async function requestDeleteLocation(headline: string, tenantName: string) {
    if (!data) return;
    const msg = `Supprimer définitivement ce bail (${tenantName} — ${headline}) ? Les paiements, échéances et le fichier de contrat seront supprimés. Le bien, l’unité et le locataire ne sont pas supprimés. Irréversible.`;
    const ok = await confirmDialog({
      title: 'Supprimer le bail',
      message: msg,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api(`/leases/${data.leaseId}`, { method: 'DELETE' });
      navigate('/locations', { replace: true });
    } catch (e2) {
      toast(e2 instanceof Error ? e2.message : 'Suppression impossible.', { variant: 'error' });
    }
  }

  function openWaive(paymentId: string) {
    setWaiveErr(null);
    setWaiveReason('');
    setWaiveTargetId(paymentId);
  }

  function closeWaive() {
    setWaiveTargetId(null);
    setWaiveReason('');
    setWaiveErr(null);
  }

  return {
    data,
    err,
    reload,
    lease: {
      monthlyRent,
      setMonthlyRent,
      rentDueDay,
      setRentDueDay,
      depositAmount,
      setDepositAmount,
      startDate,
      setStartDate,
      endDate,
      setEndDate,
      leaseErr,
      savingLease,
      leaseFormDirty,
      resetLeaseEditForm,
      saveLeaseConditions,
      applyDepositFromRent,
    },
    schedule: {
      sortedPaymentSchedule,
      scheduleSortKey,
      scheduleSortDir,
      toggleScheduleSort,
      openWaive,
    },
    deposit: { depositActBusy, markDepositReceived, clearDepositReceived },
    prepay: { prepayMonths, setPrepayMonths, prepayBusy, prepayErr, prepayRent },
    waive: { waiveTargetId, waiveReason, setWaiveReason, waiveBusy, waiveErr, submitWaiveRent, closeWaive },
    requestDeleteLocation,
  };
}

export type LocationFicheModel = ReturnType<typeof useLocationFiche>;
