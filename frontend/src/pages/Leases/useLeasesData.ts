import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { BuildingOpt, LeaseRow, TenantOpt } from './types';

/** Chargement des baux, biens et locataires + actions directes sur un bail (échéances, activation). */
export function useLeasesData() {
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [leasesFetched, setLeasesFetched] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<BuildingOpt[]>([]);
  const [tenants, setTenants] = useState<TenantOpt[]>([]);

  const load = useCallback(() => {
    setLeasesFetched(false);
    setLoadErr(null);
    Promise.all([
      api<LeaseRow[]>('/leases')
        .then(setLeases)
        .catch((e) => {
          setLeases([]);
          setLoadErr(e instanceof Error ? e.message : 'Impossible de charger les baux.');
        }),
      api<BuildingOpt[]>('/buildings').then(setBuildings).catch(() => setBuildings([])),
      api<TenantOpt[]>('/tenants').then(setTenants).catch(() => setTenants([])),
    ]).finally(() => setLeasesFetched(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const leaseStats = useMemo(() => {
    const active = leases.filter((l) => l.active).length;
    return { active, inactive: leases.length - active, total: leases.length };
  }, [leases]);

  /** Unités avec un bail actif : à exclure des sélecteurs « nouveau bail ». */
  const activeLeaseUnitIds = useMemo(() => {
    const s = new Set<string>();
    for (const l of leases) {
      if (l.active) s.add(l.unit.id);
    }
    return s;
  }, [leases]);

  /** Biens où il reste au moins un lot libre (ou aucune unité encore créée → fiche Biens). */
  const buildingsAvailableForNewLease = useMemo(() => {
    return buildings.filter((b) => {
      const n = b.units?.length ?? 0;
      if (n === 0) return true;
      return b.units.some((u) => !activeLeaseUnitIds.has(u.id));
    });
  }, [buildings, activeLeaseUnitIds]);

  async function generatePayments(leaseId: string, genYear: string) {
    const year = Number(genYear);
    if (!Number.isFinite(year)) return;
    try {
      const res = await api<{ createdCount: number }>(`/leases/${leaseId}/generate-payments`, {
        method: 'POST',
        json: { year },
      });
      toast(`${res.createdCount} échéance(s) créée(s) ou déjà existantes pour ${year}.`, { variant: 'success' });
      load();
    } catch (e2) {
      toast(e2 instanceof Error ? e2.message : 'Erreur', { variant: 'error' });
    }
  }

  async function toggleActive(lease: LeaseRow) {
    await api(`/leases/${lease.id}`, { method: 'PATCH', json: { active: !lease.active } });
    load();
  }

  return {
    leases,
    leasesFetched,
    loadErr,
    buildings,
    tenants,
    setTenants,
    load,
    leaseStats,
    activeLeaseUnitIds,
    buildingsAvailableForNewLease,
    generatePayments,
    toggleActive,
  };
}
