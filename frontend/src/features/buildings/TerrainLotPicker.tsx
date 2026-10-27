import { Field, Select } from '@/components/ui/index';
import type { Building } from './types';
import type { AddUnitForm } from './useAddUnitForm';
import type { BuildingLayout } from './useBuildingLayout';

type TerrainLotPickerProps = {
  b: Building;
  form: AddUnitForm;
  layout: BuildingLayout;
};

/** Terrain en lots : rappel des lots déclarés et choix du numéro de lot pour la nouvelle unité. */
export function TerrainLotPicker({ b, form, layout }: TerrainLotPickerProps) {
  const { terrainLotRecap, usedApartmentSlots } = layout;
  if (!terrainLotRecap) return null;
  const all = Array.from({ length: b.terrainLotCount ?? 0 }, (_, i) => i + 1);
  const options = all.filter((n) => !usedApartmentSlots.has(n)).map((n) => ({ id: String(n), label: `Lot n° ${n}` }));
  const allUsed = all.every((n) => usedApartmentSlots.has(n));

  return (
    <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--odoo-border)] border-l-4 border-l-brand-600 bg-[var(--odoo-table-head-bg)] p-4 sm:col-span-full">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Lots du terrain (rappel)
        </p>
        <p className="mt-1.5 text-base font-semibold tabular-nums text-[var(--color-ink)]">
          {terrainLotRecap.n} lot{terrainLotRecap.n !== 1 ? 's' : ''} déclaré
          {terrainLotRecap.n !== 1 ? 's' : ''} sur ce bien — n° 1 à {terrainLotRecap.n}
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {terrainLotRecap.created} unité{terrainLotRecap.created !== 1 ? 's' : ''} déjà créée
          {terrainLotRecap.created !== 1 ? 's' : ''}
          {terrainLotRecap.free > 0
            ? ` · ${terrainLotRecap.free} emplacement${terrainLotRecap.free !== 1 ? 's' : ''} encore libre${terrainLotRecap.free !== 1 ? 's' : ''}`
            : ''}
        </p>
      </div>
      <Field label="Numéro de lot pour cette unité" htmlFor="terrain-lot-no" className="max-w-md">
        <Select
          id="terrain-lot-no"
          options={options}
          emptyLabel={`Choisir le numéro (1…${terrainLotRecap.n})`}
          value={form.terrainLotNo}
          required
          onValueChange={form.setTerrainLotNo}
        />
        {allUsed ? (
          <p className="mt-1 text-xs text-[var(--status-pending)]">Tous les numéros de lot sont déjà attribués.</p>
        ) : null}
      </Field>
    </div>
  );
}
