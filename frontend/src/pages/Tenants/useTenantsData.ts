import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { useReturnRowFocus } from '@/hooks/useReturnRowFocus';
import type { Tenant } from './types';

/** Chargement de la liste des locataires, suppression et surbrillance de la ligne de retour. */
export function useTenantsData() {
  const [rows, setRows] = useState<Tenant[]>([]);
  const [listFetched, setListFetched] = useState(false);

  const load = useCallback(() => {
    setListFetched(false);
    api<Tenant[]>('/tenants')
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setListFetched(true));
  }, []);

  const flashTenantId = useReturnRowFocus({ rowIdPrefix: 'tenant-row-', ready: listFetched });

  useEffect(() => {
    load();
  }, [load]);

  async function removeTenant(id: string) {
    const ok = await confirmDialog({
      title: 'Supprimer le locataire',
      message: 'Supprimer ce locataire ? (impossible s’il a encore un bail.)',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api(`/tenants/${id}`, { method: 'DELETE' });
      load();
    } catch (e2) {
      toast(e2 instanceof Error ? e2.message : 'Suppression impossible.', { variant: 'error' });
    }
  }

  return { rows, listFetched, load, flashTenantId, removeTenant };
}
