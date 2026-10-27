import { useCallback, useEffect, useState } from 'react';
import { useReturnRowFocus } from '@/hooks/useReturnRowFocus';
import { api } from '@/lib/api';
import type { BuildingStructureValue } from '@/lib/buildingStructure';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import type { BuildingRow } from './buildingListUtils';

/** Chargement de la liste des biens (filtrée par genre), retour de focus sur ligne et suppression. */
export function useBuildingsData(genreFilter: BuildingStructureValue | null) {
  const [rows, setRows] = useState<BuildingRow[]>([]);
  const [listFetched, setListFetched] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);

  const load = useCallback(() => {
    const q = genreFilter ? `?structureKind=${encodeURIComponent(genreFilter)}` : '';
    setListErr(null);
    setListFetched(false);
    api<BuildingRow[]>(`/buildings${q}`)
      .then((data) => {
        setRows(data);
        setListErr(null);
      })
      .catch((e) => {
        setRows([]);
        setListErr(
          e instanceof Error
            ? e.message
            : 'Impossible de charger les biens. Vérifiez la connexion et que l’API répond (terminal backend).',
        );
      })
      .finally(() => setListFetched(true));
  }, [genreFilter]);

  const flashBuildingId = useReturnRowFocus({ rowIdPrefix: 'bien-row-', ready: listFetched });

  useEffect(() => {
    load();
  }, [load]);

  async function requestDeleteBuilding(b: BuildingRow) {
    const n = b._count.units;
    const msg =
      n > 0
        ? `Supprimer « ${b.name} », ses ${n} unité${n !== 1 ? 's' : ''} et toutes les données liées (baux, loyers) ? Cette action est irréversible.`
        : `Supprimer définitivement le bien « ${b.name} » ? Cette action est irréversible.`;
    const ok = await confirmDialog({
      title: 'Supprimer le bien',
      message: msg,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api(`/buildings/${b.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Suppression impossible.', { variant: 'error' });
    }
  }

  return { rows, listFetched, listErr, load, flashBuildingId, requestDeleteBuilding };
}

export type BuildingsData = ReturnType<typeof useBuildingsData>;
