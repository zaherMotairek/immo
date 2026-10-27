import { AppPageTitle, PageHeaderKpi } from '@/components/AppPageTitle';
import { HelpHint } from '@/components/ui';
import { Input, Label, Select } from '@/components/ui/index';
import type { UiSelectOption } from '@/components/ui/index';
import { MOIS_LONGS, capitalize } from './chargeUtils';
import type { ViewMonth } from './types';

type ChargesPeriodBarProps = {
  embedded: boolean;
  count: number;
  y: number;
  viewMonth: ViewMonth;
  onYearChange: (y: number) => void;
  onMonthChange: (m: ViewMonth) => void;
};

/** Titre de page (hors mode intégré) + filtres année / période affichée. */
export function ChargesPeriodBar({ embedded, count, y, viewMonth, onYearChange, onMonthChange }: ChargesPeriodBarProps) {
  const monthOptions: UiSelectOption[] = [
    ...MOIS_LONGS.map((name, i) => ({ id: String(i + 1), label: `${capitalize(name)} ${y}` })),
    { id: 'all', label: `Toute l’année (${y})` },
  ];

  return (
    <div className={`flex flex-wrap items-end gap-4 ${embedded ? 'justify-end' : 'justify-between'}`}>
      {embedded ? null : (
        <AppPageTitle
          iconTo="/charges"
          title="Charges & impôts"
          hintTitle="Vue normale : un mois précis (salaires, factures mensuelles). Basculer sur « Toute l’année » pour voir toutes les lignes de l’exercice, y compris les charges saisies « année entière » sans mois. Montants en FCFA."
          actions={<PageHeaderKpi label="Total" value={String(count)} />}
        />
      )}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label htmlFor="charges-filter-year">Année</Label>
          <Input
            id="charges-filter-year"
            className="w-28"
            type="number"
            value={y}
            onChange={(e) => onYearChange(Number(e.target.value))}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Label htmlFor="charges-filter-month" className="mb-0">
              Période affichée
            </Label>
            <HelpHint
              className="align-middle"
              title="Mois calendaire par défaut. « Toute l’année » : vue sur 12 mois et charges sans mois précis."
            />
          </div>
          <Select
            id="charges-filter-month"
            className="min-w-[12.5rem]"
            options={monthOptions}
            value={viewMonth === 'all' ? 'all' : String(viewMonth)}
            onValueChange={(v) => onMonthChange(v === 'all' ? 'all' : Number(v))}
          />
        </div>
      </div>
    </div>
  );
}
