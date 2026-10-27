import { StatTile } from '@/components/ui/index';
import { fcfa } from '@/lib/format';

/** Synthèse : nombre de cautions et total encaissé. */
export function CautionsSummary({ count, sum }: { count: number; sum: number }) {
  if (count === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <StatTile label="Nombre" value={String(count)} />
      <StatTile label="Total encaissé" value={fcfa(sum)} />
    </div>
  );
}
