import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { useReturnRowFocus } from '@/hooks/useReturnRowFocus';
import { api } from '@/lib/api';
import { readInitialPeriod } from './chargeUtils';
import type { BuildingOpt, ChargeRow, ChargesSummaryData, ViewMonth } from './types';

/** Période (synchronisée avec l'URL), chargement liste / synthèse / biens, paiement et suppression d'une charge. */
export function useChargesData() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const focusChargeId = searchParams.get('focus');
  const [y, setY] = useState(() => readInitialPeriod().y);
  const [viewMonth, setViewMonth] = useState<ViewMonth>(() => readInitialPeriod().viewMonth);
  const [rows, setRows] = useState<ChargeRow[]>([]);
  const [listFetched, setListFetched] = useState(false);
  const [summary, setSummary] = useState<ChargesSummaryData | null>(null);
  const [buildings, setBuildings] = useState<BuildingOpt[]>([]);
  const [togglingPaidId, setTogglingPaidId] = useState<string | null>(null);

  const periodQuery = useCallback(() => {
    const qs = new URLSearchParams();
    qs.set('year', String(y));
    qs.set('month', viewMonth === 'all' ? 'all' : String(viewMonth));
    return qs.toString();
  }, [y, viewMonth]);

  const load = useCallback(() => {
    const q = periodQuery();
    setListFetched(false);
    Promise.all([
      api<ChargeRow[]>(`/charges?${q}`).then(setRows).catch(() => setRows([])),
      api<ChargesSummaryData>(`/charges/summary?${q}`).then(setSummary).catch(() => setSummary(null)),
      api<BuildingOpt[]>('/buildings').then(setBuildings).catch(() => setBuildings([])),
    ]).finally(() => setListFetched(true));
  }, [periodQuery]);

  const flashChargeId = useReturnRowFocus({ rowIdPrefix: 'charge-', ready: listFetched });

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const q = new URLSearchParams(prev);
        q.set('year', String(y));
        q.set('month', viewMonth === 'all' ? 'all' : String(viewMonth));
        return q;
      },
      { replace: true },
    );
  }, [y, viewMonth, setSearchParams]);

  useEffect(() => {
    const yp = searchParams.get('year');
    const mp = searchParams.get('month');
    if (yp) {
      const n = Number(yp);
      if (Number.isFinite(n)) setY(n);
    }
    if (mp === 'all') setViewMonth('all');
    else if (mp != null && mp !== '') {
      const n = Number(mp);
      if (Number.isFinite(n) && n >= 1 && n <= 12) setViewMonth(n);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!focusChargeId || rows.length === 0) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(`charge-${focusChargeId}`);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('ring-2', 'ring-brand-600', 'ring-offset-1', 'rounded-xl');
      window.setTimeout(() => el.classList.remove('ring-2', 'ring-brand-600', 'ring-offset-1', 'rounded-xl'), 2400);
    }, 120);
    return () => clearTimeout(t);
  }, [focusChargeId, rows]);

  /** Retire le paramètre `focus` (lien direct) en conservant la période. */
  function clearFocus() {
    const q = new URLSearchParams();
    q.set('year', String(y));
    q.set('month', viewMonth === 'all' ? 'all' : String(viewMonth));
    navigate(`/charges?${q.toString()}`, { replace: true });
  }

  async function setPaid(id: string, paid: boolean) {
    setTogglingPaidId(id);
    try {
      await api(`/charges/${id}`, { method: 'PATCH', json: { paid } });
      await load();
    } catch (e2) {
      toast(e2 instanceof Error ? e2.message : 'Mise à jour impossible.', { variant: 'error' });
    } finally {
      setTogglingPaidId(null);
    }
  }

  async function remove(id: string) {
    const ok = await confirmDialog({
      title: 'Supprimer la charge',
      message: 'Supprimer cette charge ?',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api(`/charges/${id}`, { method: 'DELETE' });
      load();
    } catch (e2) {
      toast(e2 instanceof Error ? e2.message : 'Suppression impossible.', { variant: 'error' });
    }
  }

  return {
    y,
    setY,
    viewMonth,
    setViewMonth,
    rows,
    summary,
    buildings,
    load,
    focusChargeId,
    flashChargeId,
    togglingPaidId,
    clearFocus,
    setPaid,
    remove,
  };
}
