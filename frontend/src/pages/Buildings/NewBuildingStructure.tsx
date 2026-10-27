import { HelpHint } from '@/components/ui';
import { Checkbox, Input, cn } from '@/components/ui/index';
import { HintedField } from '@/features/buildings/HintedField';
import {
  BUILDING_STRUCTURE_OPTIONS,
  IMMEUBLE_FLOORS_HINT,
  IMMEUBLE_LOGEMENTS_PAR_ETAGE_HINT,
  IMMEUBLE_RDC_CHECKBOX_HINT,
  IMMEUBLE_REZ_APARTMENTS_HINT,
} from '@/lib/buildingStructure';
import type { NewBuilding } from './useNewBuilding';

/** Bloc repliable « Organisation du bien (optionnel) » : genre de bien + paramètres immeuble / terrain. */
export function NewBuildingStructure({ form }: { form: NewBuilding }) {
  const open = form.structureSettingsOpen;
  const kind = form.structureKind;
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] p-3 sm:col-span-2">
      <button
        type="button"
        onClick={() => form.setStructureSettingsOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <span className="text-sm font-semibold text-[var(--color-ink)]">Organisation du bien (optionnel)</span>
        <svg
          className={cn('size-4 shrink-0 text-[var(--color-muted)] transition-transform duration-200', open && 'rotate-180')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="mt-3 space-y-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[13px] font-semibold leading-tight text-[var(--color-ink)]">Genre de bien</span>
              <HelpHint
                className="align-middle"
                title={BUILDING_STRUCTURE_OPTIONS.find((o) => o.value === kind)?.description ?? ''}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Genre de bien">
              {BUILDING_STRUCTURE_OPTIONS.map((o) => {
                const on = kind === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => form.setStructureKind(o.value)}
                    className={cn(
                      'min-h-11 rounded-[var(--radius-card)] border-2 p-3 text-left transition-colors duration-[var(--duration-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                      on
                        ? 'border-brand-600 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/40'
                        : 'border-[var(--odoo-border)] bg-[var(--color-surface)] hover:bg-[var(--odoo-row-hover)]',
                    )}
                  >
                    <span className="block text-sm font-semibold text-[var(--color-ink)]">{o.cardTitle}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {kind === 'IMMEUBLE' ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <HintedField
                  label="Étages au-dessus du RDC"
                  htmlFor="new-building-floors"
                  help={IMMEUBLE_FLOORS_HINT}
                >
                  <Input
                    id="new-building-floors"
                    type="number"
                    min={1}
                    value={form.floorCountImmeuble}
                    onChange={(e) => form.setFloorCountImmeuble(e.target.value)}
                    placeholder="Ex. 5"
                  />
                </HintedField>
                <HintedField
                  label="Logements par étage (étages 1 à N)"
                  htmlFor="new-building-apartments-per-floor"
                  help={IMMEUBLE_LOGEMENTS_PAR_ETAGE_HINT}
                >
                  <Input
                    id="new-building-apartments-per-floor"
                    type="number"
                    min={1}
                    value={form.apartmentsPerFloorImmeuble}
                    onChange={(e) => form.setApartmentsPerFloorImmeuble(e.target.value)}
                    placeholder="Ex. 2"
                  />
                  {form.immeubleCreateTotalPreview != null ? (
                    <p className="mt-1 text-xs font-medium text-[var(--color-ink)]">
                      Total logements d’habitation :{' '}
                      <span className="tabular-nums">{form.immeubleCreateTotalPreview}</span>
                    </p>
                  ) : null}
                </HintedField>
              </div>
              <div className="flex flex-wrap items-start gap-2 rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-3 py-1.5">
                <Checkbox
                  id="new-building-has-rdc"
                  label="Inclure le rez-de-chaussée dans les étages"
                  checked={form.includeRezDeChaussee}
                  onChange={(e) => form.setIncludeRezDeChaussee(e.target.checked)}
                  className="min-w-0 flex-1"
                />
                <HelpHint title={IMMEUBLE_RDC_CHECKBOX_HINT} className="mt-3 shrink-0 align-middle" />
              </div>
              {form.includeRezDeChaussee ? (
                <HintedField
                  label="Nombre d’unités d’habitation au rez-de-chaussée (plafond)"
                  htmlFor="new-building-rez-apartments"
                  help={IMMEUBLE_REZ_APARTMENTS_HINT}
                >
                  <Input
                    id="new-building-rez-apartments"
                    type="number"
                    min={0}
                    value={form.rezApartmentImmeuble}
                    onChange={(e) => form.setRezApartmentImmeuble(e.target.value)}
                    placeholder="0 = pas d’unité d’habitation au RDC"
                  />
                </HintedField>
              ) : null}
            </div>
          ) : kind === 'TERRAIN_LOTS' ? (
            <HintedField
              className="max-w-xs"
              label="Nombre de lots / unités prévues"
              htmlFor="new-building-terrain-lots"
              help="Combien de lots ou d’emplacements (parcelles, stands…). Pour chaque lot, vous choisirez ensuite le type (terrain bâti, commerce, etc.) sur la fiche du bien."
            >
              <Input
                id="new-building-terrain-lots"
                type="number"
                min={0}
                value={form.terrainLotCountNew}
                onChange={(e) => form.setTerrainLotCountNew(e.target.value)}
                placeholder="Ex. 4"
              />
            </HintedField>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
