import { HelpHint } from '@/components/ui';
import { Button, Callout, Field, Select } from '@/components/ui/index';
import { fcfa, formatDateFr } from '@/lib/format';
import type { Fiche } from './types';
import type { LocationFicheModel } from './useLocationFiche';

type LocationDepositSectionProps = {
  financial: Fiche['financial'];
  leaseActive: boolean;
  deposit: LocationFicheModel['deposit'];
  prepay: LocationFicheModel['prepay'];
};

function SubBlockTitle({ children }: { children: string }) {
  return (
    <h3 className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-[var(--color-ink)]">{children}</h3>
  );
}

/** Caution + paiement groupé sur l’onglet finances. */
export function LocationDepositSection({
  financial,
  leaseActive,
  deposit,
  prepay,
}: LocationDepositSectionProps) {
  return (
    <>
      <div className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink)]">Caution</span>
          <HelpHint title="Montant contractuel et date d’encaissement." />
        </div>
        {financial.depositAmount != null && financial.depositAmount > 0 ? (
          <>
            <p className="text-xl font-bold tabular-nums text-[var(--color-ink)]">{fcfa(financial.depositAmount)}</p>
            {financial.depositPaidAt ? (
              <p className="mt-1.5 text-sm font-semibold text-[var(--status-paid)]">
                Encaissée le {formatDateFr(financial.depositPaidAt)}
              </p>
            ) : (
              <p className="mt-1.5 text-sm font-semibold text-[var(--status-pending)]">Encaissement non enregistré</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="py-2 text-sm"
                disabled={deposit.depositActBusy || !!financial.depositPaidAt}
                onClick={() => void deposit.markDepositReceived(new Date().toISOString().slice(0, 10))}
              >
                Marquer encaissée (aujourd’hui)
              </Button>
              {financial.depositPaidAt ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="py-2 text-sm"
                  disabled={deposit.depositActBusy}
                  onClick={() => void deposit.clearDepositReceived()}
                >
                  Effacer la date
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-[15px] font-medium text-[var(--color-ink)]">
            Aucun montant. Indiquez-le dans les conditions du bail.
          </p>
        )}
      </div>

      {leaseActive ? (
        <div className="mt-5 border-t border-[var(--odoo-border)] pt-5">
          <SubBlockTitle>Paiement groupé</SubBlockTitle>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Nombre de mois" htmlFor="prepay-n">
              <Select
                id="prepay-n"
                className="mt-1 min-w-[10rem]"
                value={prepay.prepayMonths}
                onValueChange={prepay.setPrepayMonths}
                options={Array.from({ length: 12 }, (_, i) => {
                  const m = i + 1;
                  return { id: String(m), label: `${m} mois${m === 6 ? ' (semestre)' : ''}` };
                })}
              />
            </Field>
            <Button type="button" className="py-2 text-sm" disabled={prepay.prepayBusy} onClick={() => void prepay.prepayRent()}>
              {prepay.prepayBusy ? 'Enregistrement…' : 'Marquer comme payés'}
            </Button>
          </div>
          {prepay.prepayErr ? (
            <Callout variant="danger" className="mt-2">
              {prepay.prepayErr}
            </Callout>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
