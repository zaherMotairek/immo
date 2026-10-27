import { HelpHint } from '@/components/ui';
import { Button, Callout, DateInput, Field, Input, MoneyInput } from '@/components/ui/index';
import { formatAmountDigitsGrouped, INPUT_AMOUNT_FCFA_LABEL } from '@/lib/format';
import type { LocationFicheModel } from './useLocationFiche';

type LocationLeaseFormProps = {
  lease: LocationFicheModel['lease'];
};

function SectionHeader({ title, hintTitle }: { title: string; hintTitle?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[var(--odoo-border)] pb-3">
      <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">{title}</h2>
      {hintTitle ? <HelpHint title={hintTitle} className="shrink-0" /> : null}
    </div>
  );
}

/** Formulaire conditions du bail (loyer, dates, caution). */
export function LocationLeaseForm({ lease }: LocationLeaseFormProps) {
  return (
    <div className="border-t border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] !px-5 !py-5">
      <SectionHeader
        title="Conditions du bail"
        hintTitle="Loyer, dates, caution. Les mois déjà payés ne sont pas recalculés."
      />
      <form onSubmit={(e) => void lease.saveLeaseConditions(e)} className="grid gap-4 sm:grid-cols-2">
        <Field label={`${INPUT_AMOUNT_FCFA_LABEL} — loyer mensuel`} htmlFor="lease-edit-rent" required>
          <MoneyInput
            id="lease-edit-rent"
            min={0}
            step={1}
            value={lease.monthlyRent}
            onChange={(e) => lease.setMonthlyRent(e.target.value)}
            required
            placeholder={formatAmountDigitsGrouped('250000')}
          />
        </Field>
        <Field label="Jour d'échéance (1–31)" htmlFor="lease-edit-due" required>
          <Input
            id="lease-edit-due"
            type="number"
            min={1}
            max={31}
            value={lease.rentDueDay}
            onChange={(e) => lease.setRentDueDay(e.target.value)}
            required
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={`${INPUT_AMOUNT_FCFA_LABEL} — dépôt / caution (optionnel)`} htmlFor="lease-edit-deposit">
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
              <MoneyInput
                id="lease-edit-deposit"
                wrapperClassName="sm:max-w-xs"
                min={0}
                step={1}
                value={lease.depositAmount}
                onChange={(e) => lease.setDepositAmount(e.target.value)}
                placeholder="Laisser vide si aucun"
              />
              <div className="flex flex-wrap gap-2">
                <span className="self-center text-xs font-semibold uppercase text-[var(--color-muted)]">Raccourcis :</span>
                <Button type="button" variant="secondary" className="py-1.5 text-xs" onClick={() => lease.applyDepositFromRent(1)}>
                  ×1 loyer
                </Button>
                <Button type="button" variant="secondary" className="py-1.5 text-xs" onClick={() => lease.applyDepositFromRent(2)}>
                  ×2
                </Button>
                <Button type="button" variant="secondary" className="py-1.5 text-xs" onClick={() => lease.applyDepositFromRent(3)}>
                  ×3
                </Button>
              </div>
            </div>
          </Field>
        </div>
        <Field label="Début du bail" htmlFor="lease-edit-start" required>
          <DateInput
            id="lease-edit-start"
            value={lease.startDate}
            onChange={(e) => lease.setStartDate(e.target.value)}
            required
          />
        </Field>
        <Field
          label="Fin du bail (optionnel)"
          htmlFor="lease-edit-end"
          hint="Format date : jour/mois/année."
          className="sm:col-span-2"
        >
          <DateInput
            id="lease-edit-end"
            value={lease.endDate}
            onChange={(e) => lease.setEndDate(e.target.value)}
          />
        </Field>
        {lease.leaseErr ? (
          <Callout variant="danger" className="sm:col-span-2">
            {lease.leaseErr}
          </Callout>
        ) : null}
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          <Button type="submit" className="py-2.5 text-sm" disabled={lease.savingLease}>
            {lease.savingLease ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="py-2.5 text-sm"
            disabled={lease.savingLease || !lease.leaseFormDirty}
            onClick={lease.resetLeaseEditForm}
          >
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}
