import { Button, Field, Input, Select } from '@/components/ui/index';
import { IMMEUBLE_NEW_UNIT_KIND_OPTIONS, UNIT_KIND_OPTIONS } from '@/lib/unitKind';
import type { Building } from './types';
import type { AddUnitForm } from './useAddUnitForm';
import type { BuildingLayout } from './useBuildingLayout';

type BulkUnitsTableProps = {
  b: Building;
  form: AddUnitForm;
  layout: BuildingLayout;
  onSubmit: () => void;
};

const cellClass = 'px-3 py-2';

/** Tableau d'ajout multiple (immeuble avec étages / terrain en lots) : une ligne par unité à créer. */
export function BulkUnitsTable({ b, form, layout, onSubmit }: BulkUnitsTableProps) {
  const { bulkRows, bulkLabelPrefix, addBusy, kind } = form;
  const { terrainPlanActive, immeubleFloorPickerActive } = layout;
  const kindOptions = (b.structureKind === 'IMMEUBLE' ? IMMEUBLE_NEW_UNIT_KIND_OPTIONS : UNIT_KIND_OPTIONS).map(
    (o) => ({ id: o.value as string, label: o.label }),
  );

  return (
    <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] p-4 sm:col-span-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">Tableau d’ajout des unités</h3>
        <p className="text-xs text-[var(--color-muted)]">Ajoutez autant de lignes que nécessaire puis enregistrez tout.</p>
      </div>
      <Field label="Préfixe libellé (optionnel)" htmlFor="bulk-prefix" className="max-w-md">
        <Input
          id="bulk-prefix"
          value={bulkLabelPrefix}
          onChange={(e) => form.setBulkLabelPrefix(e.target.value)}
          placeholder="Ex. Lot, Appartement, Local…"
        />
      </Field>
      <div className="table-scroll overflow-x-auto rounded-[var(--radius-card)] border border-[var(--odoo-border)]">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="bg-[var(--odoo-table-head-bg)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]">
            <tr>
              <th scope="col" className={`${cellClass} text-left`}>
                #
              </th>
              <th scope="col" className={`${cellClass} text-left`}>
                Type
              </th>
              <th scope="col" className={`${cellClass} text-left`}>
                Étage
              </th>
              <th scope="col" className={`${cellClass} text-left`}>
                {terrainPlanActive ? 'N° lot' : 'N°'}
              </th>
              <th scope="col" className={`${cellClass} text-left`}>
                Aperçu
              </th>
              <th scope="col" className={`${cellClass} text-right`}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {bulkRows.map((row, idx) => {
              const floorOptions = form.floorOptionsForBulkRow(row, idx).map((n) => ({
                id: String(n),
                label: n === 0 ? 'RDC' : `Étage ${n}`,
              }));
              const slotOptions = form.slotOptionsForBulkRow(row, idx);
              return (
                <tr key={`bulk-row-${idx}`} className="border-t border-[var(--odoo-border)]">
                  <td className={`${cellClass} text-[var(--color-muted)]`}>{idx + 1}</td>
                  <td className={cellClass}>
                    <Select
                      aria-label={`Type de la ligne ${idx + 1}`}
                      options={kindOptions}
                      value={row.kind}
                      onValueChange={(v) =>
                        form.setBulkRows((items) =>
                          items.map((x, i) => (i === idx ? { ...x, kind: v, floor: '', slot: '' } : x)),
                        )
                      }
                    />
                  </td>
                  <td className={cellClass}>
                    {immeubleFloorPickerActive ? (
                      <Select
                        aria-label={`Étage de la ligne ${idx + 1}`}
                        options={floorOptions}
                        emptyLabel="Choisir…"
                        value={row.floor}
                        onValueChange={(v) =>
                          form.setBulkRows((items) => items.map((x, i) => (i === idx ? { ...x, floor: v } : x)))
                        }
                      />
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">—</span>
                    )}
                  </td>
                  <td className={cellClass}>
                    <Select
                      aria-label={`Numéro de la ligne ${idx + 1}`}
                      options={slotOptions.map((n) => ({
                        id: String(n),
                        label: terrainPlanActive
                          ? `Lot n° ${n}`
                          : row.kind === 'APARTMENT'
                            ? `Logement n° ${n}`
                            : `Local n° ${n}`,
                      }))}
                      emptyLabel="Choisir…"
                      value={row.slot}
                      onValueChange={(v) =>
                        form.setBulkRows((items) => items.map((x, i) => (i === idx ? { ...x, slot: v } : x)))
                      }
                    />
                    {slotOptions.length === 0 ? (
                      <p className="mt-1 text-xs text-[var(--status-pending)]">Aucun numéro disponible.</p>
                    ) : null}
                  </td>
                  <td className={`${cellClass} text-[var(--color-ink)]`}>
                    {bulkLabelPrefix.trim() || 'Unité'}
                    {row.slot ? ` ${row.slot}` : ' …'}
                  </td>
                  <td className={`${cellClass} text-right`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={bulkRows.length <= 1}
                      onClick={() => form.setBulkRows((items) => items.filter((_, i) => i !== idx))}
                    >
                      Retirer
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            form.setBulkRows((items) => [...items, { kind: terrainPlanActive ? 'LAND' : kind, floor: '', slot: '' }])
          }
        >
          + Ajouter une ligne
        </Button>
        <Button loading={addBusy} onClick={onSubmit}>
          {addBusy ? 'Enregistrement…' : 'Enregistrer tout'}
        </Button>
      </div>
    </div>
  );
}
