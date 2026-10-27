import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { useReturnRowFocus } from '@/hooks/useReturnRowFocus';
import type { OverviewRow } from './types';

/** Chargement overview locations, suppression de bail et flash de retour. */
export function useLocationsData(showAll: boolean) {
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [listFetched, setListFetched] = useState(false);

  const load = useCallback(() => {
    setListFetched(false);
    const q = showAll ? '?all=1' : '';
    api<OverviewRow[]>(`/leases/overview${q}`)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setListFetched(true));
  }, [showAll]);

  const flashLeaseId = useReturnRowFocus({ rowIdPrefix: 'loc-row-', ready: listFetched });

  useEffect(() => {
    load();
  }, [load]);

  async function requestDeleteLocation(r: OverviewRow) {
    const msg = `Supprimer la location « ${r.buildingName} — ${r.unitLabel} » (${r.tenantFullName}) ? Le bail, l’historique des loyers et le contrat joint seront supprimés. L’unité et le locataire ne sont pas supprimés. Action irréversible.`;
    const ok = await confirmDialog({
      title: 'Supprimer la location',
      message: msg,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api(`/leases/${r.leaseId}`, { method: 'DELETE' });
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Suppression impossible.', { variant: 'error' });
    }
  }

  return { rows, listFetched, load, flashLeaseId, requestDeleteLocation };
}
