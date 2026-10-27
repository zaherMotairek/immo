import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Building } from './types';

/**
 * Chargement de la fiche bien (`GET /buildings/:id`).
 * - chargement « bruyant » (par défaut) : affiche le squelette / l'erreur, puis recopie les brouillons via `onLoaded` ;
 * - `load({ silent: true })` : rafraîchit `b` sans squelette, sans erreur visible et sans toucher aux brouillons.
 */
export function useBuildingData(id: string | undefined, onLoaded: (data: Building) => void) {
  const [b, setB] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!id) return Promise.resolve();
      const silent = Boolean(opts?.silent);
      if (!silent) {
        setLoading(true);
        setLoadError(null);
      }
      return api<Building>(`/buildings/${id}`)
        .then((data) => {
          setB(data);
          if (!silent) onLoaded(data);
          setLoadError(null);
        })
        .catch((e) => {
          if (!silent) {
            setB(null);
            setLoadError(e instanceof Error ? e.message : 'Impossible de charger ce bien.');
          }
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [id, onLoaded],
  );

  useEffect(() => {
    load();
  }, [load]);

  /** Ancien plafond de numérotation entrepôt/commerce : supprimé, plage libre côté API. */
  useEffect(() => {
    if (!id || !b || b.structureKind !== 'IMMEUBLE') return;
    if (b.locauxSlotCount == null) return;
    let cancelled = false;
    void (async () => {
      try {
        await api(`/buildings/${id}`, { method: 'PATCH', json: { locauxSlotCount: null } });
        if (!cancelled) void load({ silent: true });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, b, load]);

  return { b, setB, loading, loadError, load };
}

export type BuildingData = ReturnType<typeof useBuildingData>;
