import { HelpHint } from '@/components/ui';
import { Button, Callout, DateInput, Field, Input, MoneyInput } from '@/components/ui/index';
import { formatAmountDigitsGrouped, INPUT_AMOUNT_FCFA_LABEL } from '@/lib/format';
import type { LocationFicheModel } from './useLocationFiche';

type Props = {
  revise: LocationFicheModel['revise'];
};

/** C6-A : révision de loyer / renouvellement (amendement, sans nouveau bail). */
export function LocationReviseSection({ revise }: Props) {
  return (
    <div className="border-t border-[var(--odoo-border)] !px-5 !py-5">
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[var(--odoo-border)] pb-3">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
          Réviser / renouveler
        </h2>
        <HelpHint
          title="Change le loyer à partir d’une date. Les mois déjà payés restent inchangés. Option renouvellement : prolonge la date de fin."
          className="shrink-0"
        />
      </div>
      <form
        onSubmit={(e) => void revise.submitRevise(e)}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label={`${INPUT_AMOUNT_FCFA_LABEL} — nouveau loyer`} htmlFor="lease-revise-rent">
          <MoneyInput
            id="lease-revise-rent"
            min={1}
            step={1}
            value={revise.newMonthlyRent}
            onChange={(e) => revise.setNewMonthlyRent(e.target.value)}
            placeholder={formatAmountDigitsGrouped('275000')}
          />
        </Field>
        <Field label="Ou variation %" htmlFor="lease-revise-pct" hint="Ex. 5 = +5 %">
          <Input
            id="lease-revise-pct"
            type="number"
            step={0.1}
            value={revise.percent}
            onChange={(e) => revise.setPercent(e.target.value)}
            placeholder="5"
          />
        </Field>
        <Field label="À partir du" htmlFor="lease-revise-from" required>
          <DateInput
            id="lease-revise-from"
            value={revise.effectiveFrom}
            onChange={(e) => revise.setEffectiveFrom(e.target.value)}
            required
          />
        </Field>
        <Field label="Nouvelle fin de bail (optionnel)" htmlFor="lease-revise-end">
          <DateInput
            id="lease-revise-end"
            value={revise.newEndDate}
            onChange={(e) => revise.setNewEndDate(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={revise.renew}
            onChange={(e) => revise.setRenew(e.target.checked)}
            className="h-4 w-4"
          />
          Renouveler (+1 an si pas de nouvelle date de fin)
        </label>
        <Field label="Note (optionnel)" htmlFor="lease-revise-note" className="sm:col-span-2">
          <Input
            id="lease-revise-note"
            value={revise.note}
            onChange={(e) => revise.setNote(e.target.value)}
            maxLength={500}
            placeholder="Ex. indexation annuelle"
          />
        </Field>
        {revise.reviseErr ? (
          <Callout variant="danger" className="sm:col-span-2">
            {revise.reviseErr}
          </Callout>
        ) : null}
        <div className="sm:col-span-2">
          <Button type="submit" className="py-2.5 text-sm" disabled={revise.reviseBusy}>
            {revise.reviseBusy ? 'Application…' : 'Appliquer la révision'}
          </Button>
        </div>
      </form>
    </div>
  );
}
