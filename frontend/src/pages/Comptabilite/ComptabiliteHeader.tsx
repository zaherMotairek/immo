import { AppPageTitle } from '@/components/AppPageTitle';
import { Button, Callout, Card, Field, Select } from '@/components/ui/index';
import type { UiSelectOption } from '@/components/ui/index';
import { downloadReport } from '@/lib/api';

type ComptabiliteHeaderProps = {
  year: number;
  yearChoices: number[];
  loading: boolean;
  err: string | null;
  onYearChange: (y: number) => void;
};

/** Titre, filtre année et boutons d'export Excel / PDF. */
export function ComptabiliteHeader({ year, yearChoices, loading, err, onYearChange }: ComptabiliteHeaderProps) {
  const yearOptions: UiSelectOption[] = yearChoices.map((y) => ({ id: String(y), label: String(y) }));

  return (
    <>
      <AppPageTitle
        iconTo="/comptabilite"
        title="Mode comptable"
        hintTitle="Résumé annuel clair pour la comptabilité avec bénéfice estimé et exports."
        subtitle="Synthèse annuelle, clôtures de période et exports comptables."
      />
      <Card className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Année" htmlFor="comp-year">
            <Select
              id="comp-year"
              className="w-28"
              options={yearOptions}
              value={String(year)}
              onValueChange={(v) => onYearChange(Number(v))}
            />
          </Field>
          <Button type="button" size="sm" onClick={() => downloadReport('xlsx', year)}>
            Export Excel comptable
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => downloadReport('pdf', year)}>
            Export PDF synthèse
          </Button>
        </div>
        {loading ? <p className="text-sm text-[var(--color-muted)]">Chargement…</p> : null}
        {err ? <Callout variant="danger">{err}</Callout> : null}
      </Card>
    </>
  );
}
