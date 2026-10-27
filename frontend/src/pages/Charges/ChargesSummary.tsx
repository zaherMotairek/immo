import { StatTile } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import type { ChargesSummaryData } from './types';

/** Synthèse de la période : total, non réglées et principaux postes. */
export function ChargesSummary({ summary, periodeLibelle }: { summary: ChargesSummaryData; periodeLibelle: string }) {
  const h = summary.highlights;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatTile label="Total charges" value={fcfa(summary.totalCharges)} sub={periodeLibelle} />
      <StatTile label="Non réglées" value={fcfa(summary.unpaidCharges)} emphasize={summary.unpaidCharges > 0} />
      <StatTile label="Impôts & taxes" value={fcfa(h.impotsEtTaxes)} />
      <StatTile label="Copro / honoraires" value={fcfa(h.chargesCoproEtHonoraires)} />
      <StatTile label="Sécurité" value={fcfa(h.securite ?? 0)} />
      <StatTile label="Personnel" value={fcfa(h.personnel ?? 0)} />
    </div>
  );
}
