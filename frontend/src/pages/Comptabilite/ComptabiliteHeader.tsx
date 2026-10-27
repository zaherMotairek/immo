import { AppPageTitle } from '@/components/AppPageTitle';
import { Button, Callout, Card, Field, Select, Skeleton } from '@/components/ui/index';
import type { UiSelectOption } from '@/components/ui/index';
import { downloadReport } from '@/lib/api';

type ComptabiliteHeaderProps = {
  year: number;
  yearChoices: number[];
  loading: boolean;
  err: string | null;
  onYearChange: (y: number) => void;
  onRetry: () => void;
};

/** Titre, filtre année et boutons d'export Excel / PDF. */
export function ComptabiliteHeader({ year, yearChoices, loading, err, onYearChange, onRetry }: ComptabiliteHeaderProps) {
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
        {loading ? (
          <div className="space-y-2" role="status" aria-busy="true" aria-label="Chargement comptable">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : null}
        {err ? (
          <Callout variant="danger" title="Impossible de charger la synthèse comptable">
            <p>{err}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
              Réessayer
            </Button>
          </Callout>
        ) : null}
      </Card>
    </>
  );
}
