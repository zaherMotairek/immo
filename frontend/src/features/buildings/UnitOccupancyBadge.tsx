import { StatusBadge } from '@/components/ui/index';

/** Statut d'occupation : « Loué » (vert) ou « Libre » (neutre) — jamais la couleur seule. */
export function UnitOccupancyBadge({ occupied }: { occupied: boolean }) {
  return occupied ? (
    <StatusBadge status="PAID" label="Loué" size="sm" />
  ) : (
    <StatusBadge status="UNIT_VACANT" label="Libre" size="sm" />
  );
}
