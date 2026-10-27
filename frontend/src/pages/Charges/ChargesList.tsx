import { HelpHint } from '@/components/ui';
import { Card, CardList, EmptyState } from '@/components/ui/index';
import { ChargeRowItem } from './ChargeRowItem';
import type { ChargeRow } from './types';

type ChargesListProps = {
  rows: ChargeRow[];
  periodeLibelle: string;
  returnLocation: string;
  flashChargeId: string | null;
  togglingPaidId: string | null;
  onSetPaid: (id: string, paid: boolean) => void;
  onRemove: (id: string) => void;
};

/** Détail des charges de la période. */
export function ChargesList({
  rows,
  periodeLibelle,
  returnLocation,
  flashChargeId,
  togglingPaidId,
  onSetPaid,
  onRemove,
}: ChargesListProps) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--odoo-border)] px-3 py-3 sm:px-4">
        <h2 className="text-base font-semibold text-[var(--color-ink)]">Détail — {periodeLibelle}</h2>
        <HelpHint
          className="align-middle"
          title="Colonne de droite : marquer une charge comme payée après virement ou espèces, ou repasser en « À payer » si besoin. Le bandeau du haut « Non réglées » se met à jour automatiquement."
        />
      </div>
      {rows.length > 0 ? (
        <CardList ariaLabel="Charges de la période" className="rounded-none border-0">
          {rows.map((c) => (
            <ChargeRowItem
              key={c.id}
              charge={c}
              returnLocation={returnLocation}
              flash={flashChargeId === c.id}
              toggling={togglingPaidId === c.id}
              onSetPaid={onSetPaid}
              onRemove={onRemove}
            />
          ))}
        </CardList>
      ) : (
        <EmptyState
          className="rounded-none border-0"
          title={`Aucune charge pour ${periodeLibelle.toLowerCase()}.`}
          description="Ajoutez une charge avec le formulaire « Nouvelle charge » ci-dessus."
        />
      )}
    </Card>
  );
}
