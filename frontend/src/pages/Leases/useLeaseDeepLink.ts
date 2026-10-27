import { useLayoutEffect, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { LeaseFocusSummary, LeaseRow, StatusTab, WellViewFilter } from './types';

type Options = {
  leases: LeaseRow[];
  tableLeases: LeaseRow[];
  setStatusTab: (t: StatusTab) => void;
  setWellViewFilter: (f: WellViewFilter) => void;
};

/** Lien direct `?leaseId=` : élargit les filtres, fait défiler jusqu'au bail et le surligne brièvement. */
export function useLeaseDeepLink({ leases, tableLeases, setStatusTab, setWellViewFilter }: Options) {
  const [params, setParams] = useSearchParams();
  const leaseIdFocus = params.get('leaseId')?.trim() ?? '';
  const hintTenant = params.get('hintTenant')?.trim() ?? '';
  const hintPlace = params.get('hintPlace')?.trim() ?? '';
  const appliedLeaseLinkRef = useRef<string | null>(null);

  const leaseFocusSummary = useMemo<LeaseFocusSummary | null>(() => {
    if (!leaseIdFocus) return null;
    const lease = leases.find((l) => l.id === leaseIdFocus);
    if (lease) {
      return {
        tenant: `${lease.tenant.firstName} ${lease.tenant.lastName}`.trim(),
        place: `${lease.unit.building.name} — ${lease.unit.label}`,
      };
    }
    if (hintTenant || hintPlace) {
      return { tenant: hintTenant || '—', place: hintPlace || '—' };
    }
    return { tenant: '', place: '' };
  }, [leaseIdFocus, leases, hintTenant, hintPlace]);

  function clearLeaseDeepLink() {
    setParams(
      (prev) => {
        const q = new URLSearchParams(prev);
        q.delete('leaseId');
        q.delete('hintTenant');
        q.delete('hintPlace');
        return q;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    if (!leaseIdFocus) {
      appliedLeaseLinkRef.current = null;
      return;
    }
    const lease = leases.find((l) => l.id === leaseIdFocus);
    if (!lease) return;
    if (appliedLeaseLinkRef.current === leaseIdFocus) return;
    appliedLeaseLinkRef.current = leaseIdFocus;
    setStatusTab('all');
    setWellViewFilter('all');
  }, [leaseIdFocus, leases, setStatusTab, setWellViewFilter]);

  useLayoutEffect(() => {
    if (!leaseIdFocus || tableLeases.length === 0) return;
    if (!tableLeases.some((r) => r.id === leaseIdFocus)) return;
    const t = window.setTimeout(() => {
      const row = document.getElementById(`lease-row-${leaseIdFocus}`);
      if (!row) return;
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      row.classList.add('ring-2', 'ring-brand-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
      window.setTimeout(
        () => row.classList.remove('ring-2', 'ring-brand-500', 'ring-offset-2', 'dark:ring-offset-slate-900'),
        2400,
      );
    }, 150);
    return () => clearTimeout(t);
  }, [leaseIdFocus, tableLeases]);

  return { leaseIdFocus, leaseFocusSummary, clearLeaseDeepLink };
}
