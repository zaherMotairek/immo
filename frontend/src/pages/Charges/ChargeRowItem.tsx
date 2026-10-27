import { SmartLink } from '@/components/SmartLink';
import { Button, StatusBadge, cn } from '@/components/ui/index';
import { chargeCategoryLabel } from '@/lib/chargeCategories';
import { fcfa } from '@/lib/format';
import { unitKindLabel } from '@/lib/unitKind';
import { chargeRowFlashClass } from './chargeUtils';
import type { ChargeRow } from './types';

type ChargeRowItemProps = {
  charge: ChargeRow;
  /** URL courante (retour depuis la fiche du bien). */
  returnLocation: string;
  flash: boolean;
  toggling: boolean;
  onSetPaid: (id: string, paid: boolean) => void;
  onRemove: (id: string) => void;
};

const linkClass = 'font-medium text-brand-800 underline-offset-2 hover:underline dark:text-brand-400';

/** Une charge : libellé, bien / unité, notes, montant, statut et actions (payer, supprimer). */
export function ChargeRowItem({ charge: c, returnLocation, flash, toggling, onSetPaid, onRemove }: ChargeRowItemProps) {
  const ret = encodeURIComponent(returnLocation);
  return (
    <li
      id={`charge-${c.id}`}
      className={cn(
        'flex scroll-mt-28 list-none flex-col gap-2 px-3 py-3 transition-colors hover:bg-[var(--odoo-row-hover)] sm:flex-row sm:items-center sm:justify-between sm:px-4',
        chargeRowFlashClass(flash),
      )}
    >
      <div className="min-w-0">
        <p className="font-medium text-[var(--color-ink)]">
          {c.label} <span className="font-normal text-[var(--color-muted)]">· {chargeCategoryLabel(c.category)}</span>
        </p>
        <p className="text-xs text-[var(--color-muted)]">
          {c.unit ? (
            <>
              <SmartLink
                to={`/biens/${c.building.id}?unitId=${encodeURIComponent(c.unit.id)}&hintUnitLabel=${encodeURIComponent(c.unit.label)}&returnLocation=${ret}`}
                returnFocusId={c.id}
                className={linkClass}
              >
                {c.building.name}
              </SmartLink>
              {' — '}
              {unitKindLabel(c.unit.kind)} — {c.unit.label}
            </>
          ) : (
            <SmartLink to={`/biens/${c.building.id}?returnLocation=${ret}`} returnFocusId={c.id} className={linkClass}>
              {c.building.name}
            </SmartLink>
          )}
          {c.periodMonth ? ` · mois ${c.periodMonth}` : ''}
        </p>
        {c.notes?.trim() ? (
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--color-muted)]">{c.notes.trim()}</p>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span className="text-base font-bold tabular-nums text-[var(--color-ink)]">{fcfa(Number(c.amount))}</span>
        <StatusBadge status={c.paid ? 'PAID' : 'PENDING'} label={c.paid ? 'Payé' : 'À payer'} size="sm" />
        <div className="flex flex-wrap justify-end gap-2">
          {c.paid ? (
            <Button variant="ghost" size="sm" disabled={toggling} onClick={() => onSetPaid(c.id, false)}>
              Marquer non payé
            </Button>
          ) : (
            <Button variant="secondary" size="sm" disabled={toggling} onClick={() => onSetPaid(c.id, true)}>
              Marquer comme payé
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={() => onRemove(c.id)} title="Supprimer" aria-label="Supprimer la charge">
            ×
          </Button>
        </div>
      </div>
    </li>
  );
}
