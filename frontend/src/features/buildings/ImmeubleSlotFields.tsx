import { Callout, Field, Input, Select } from '@/components/ui/index';
import { apartmentCapacityOnFloor, immeubleGridLayout } from './buildingUtils';
import { HintedField } from './HintedField';
import type { Building } from './types';
import type { AddUnitForm } from './useAddUnitForm';
import type { BuildingLayout } from './useBuildingLayout';

type ImmeubleSlotFieldsProps = {
  b: Building;
  form: AddUnitForm;
  layout: BuildingLayout;
};

const warnText = 'mt-1 text-xs text-[var(--status-pending)]';

/** Immeuble (étage + numéro de logement ou de local) : choix de l'étage, puis du numéro encore libre. */
export function ImmeubleSlotFields({ b, form, layout }: ImmeubleSlotFieldsProps) {
  const { kind, immeubleEtage, immeubleAppNo, immeubleLocauxNo, floorsForImmeubleKind } = form;
  const {
    availableImmeubleFloors,
    availableApartmentFloors,
    immeubleOnePerFloorLayout,
    immeubleSlotPickerActive,
    usedApartmentSlots,
    usedApartmentSlotsByFloor,
    usedLocauxSlots,
    locauxSlotOptionsCount,
  } = layout;

  const etageHelp =
    immeubleOnePerFloorLayout && kind === 'APARTMENT'
      ? 'Pour les appartements : les étages où un appartement existe déjà sont retirés (1 app. par étage si déclaré ainsi).'
      : immeubleGridLayout(b) && kind === 'APARTMENT'
        ? 'Les étages où tous les logements prévus sont déjà créés disparaissent. Sur l’étage choisi, seuls les numéros de logement encore libres sont proposés.'
        : kind === 'WAREHOUSE' || kind === 'COMMERCIAL'
          ? 'Entrepôt et commerce : uniquement le rez-de-chaussée (étage 0). Cochez « inclure le rez-de-chaussée » dans Organisation du bien si la liste est vide.'
          : undefined;

  const noFloorMessage =
    kind === 'APARTMENT'
      ? availableImmeubleFloors.length > 0 && availableApartmentFloors.length === 0
        ? 'Sans unités d’habitation au RDC déclarées dans Organisation du bien, le rez-de-chaussée n’est pas proposé : choisissez l’étage 1 ou plus, ou renseignez le nombre d’unités au rez-de-chaussée.'
        : immeubleGridLayout(b)
          ? 'Tous les emplacements de logements prévus (par étage) sont occupés. Supprimez ou modifiez une unité, ou ajustez l’organisation du bien.'
          : 'Tous les étages prévus ont déjà une unité logement. Supprimez ou modifiez une unité, ou ajustez les totaux dans « Organisation du bien ».'
      : kind === 'WAREHOUSE' || kind === 'COMMERCIAL'
        ? 'Cochez « inclure le rez-de-chaussée » dans Organisation du bien pour placer un entrepôt ou un commerce au RDC.'
        : 'Aucun étage disponible : vérifiez le nombre d’étages sur le bien.';

  const etageOptions = floorsForImmeubleKind.map((n) => ({
    id: String(n),
    label: n === 0 ? 'Rez-de-chaussée' : `Étage ${n}`,
  }));

  const grid = immeubleGridLayout(b);
  const etageNum = Number(immeubleEtage);

  const appOptions = (() => {
    if (grid && Number.isFinite(etageNum)) {
      const cap = apartmentCapacityOnFloor(b, etageNum);
      const used = usedApartmentSlotsByFloor.get(etageNum) ?? new Set<number>();
      return Array.from({ length: cap }, (_, i) => i + 1)
        .filter((n) => !used.has(n))
        .map((n) => ({ id: String(n), label: `Logement n° ${n}` }));
    }
    return Array.from({ length: b.apartmentCount ?? 0 }, (_, i) => i + 1)
      .filter((n) => !usedApartmentSlots.has(n))
      .map((n) => ({ id: String(n), label: `Appartement n° ${n}` }));
  })();

  const appFullMessage = (() => {
    if (grid && Number.isFinite(etageNum) && immeubleEtage !== '') {
      const cap = apartmentCapacityOnFloor(b, etageNum);
      const used = usedApartmentSlotsByFloor.get(etageNum) ?? new Set<number>();
      if (cap > 0 && Array.from({ length: cap }, (_, i) => i + 1).every((n) => used.has(n))) {
        return 'Tous les numéros de logement prévus à cet étage sont déjà attribués.';
      }
      return null;
    }
    if (Array.from({ length: b.apartmentCount ?? 0 }, (_, i) => i + 1).every((n) => usedApartmentSlots.has(n))) {
      return 'Tous les numéros de logement prévus sont déjà attribués.';
    }
    return null;
  })();

  const locauxOptions = Array.from({ length: locauxSlotOptionsCount }, (_, i) => i + 1)
    .filter((n) => !usedLocauxSlots.has(n))
    .map((n) => ({ id: String(n), label: `Local n° ${n}` }));
  const locauxAllUsed = Array.from({ length: locauxSlotOptionsCount }, (_, i) => i + 1).every((n) =>
    usedLocauxSlots.has(n),
  );

  return (
    <>
      <HintedField label="Étage" htmlFor="immeuble-etage" help={etageHelp}>
        {floorsForImmeubleKind.length === 0 ? (
          <Callout variant="warning">{noFloorMessage}</Callout>
        ) : (
          <Select
            id="immeuble-etage"
            options={etageOptions}
            emptyLabel="Choisir…"
            value={immeubleEtage}
            required
            onValueChange={(v) => {
              form.setImmeubleEtage(v);
              form.setImmeubleAppNo('');
              if (v === '0' && (b.rezApartmentCount ?? 0) <= 0) {
                form.setKind((k) => (k === 'APARTMENT' ? 'COMMERCIAL' : k));
              }
            }}
          />
        )}
      </HintedField>
      {kind === 'APARTMENT' ? (
        <Field label="N° de logement" htmlFor="immeuble-app-no">
          {immeubleSlotPickerActive ? (
            <>
              {grid && immeubleEtage === '' ? (
                <p className="rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-3 py-2 text-sm text-[var(--color-muted)]">
                  Choisissez d’abord l’étage pour voir les numéros de logement disponibles sur ce niveau.
                </p>
              ) : (
                <Select
                  id="immeuble-app-no"
                  options={appOptions}
                  emptyLabel="Choisir…"
                  value={immeubleAppNo}
                  required
                  onValueChange={form.setImmeubleAppNo}
                />
              )}
              {appFullMessage ? <p className={warnText}>{appFullMessage}</p> : null}
            </>
          ) : (
            <Input
              id="immeuble-app-no"
              type="number"
              min={1}
              step={1}
              value={immeubleAppNo}
              onChange={(e) => form.setImmeubleAppNo(e.target.value)}
              required
              placeholder="Ex. 12"
            />
          )}
        </Field>
      ) : (
        <Field label="N° du local (entrepôt / commerce)" htmlFor="immeuble-locaux-no">
          <Select
            id="immeuble-locaux-no"
            options={locauxOptions}
            emptyLabel="Choisir…"
            value={immeubleLocauxNo}
            required
            onValueChange={form.setImmeubleLocauxNo}
          />
          {locauxAllUsed ? (
            <p className={warnText}>
              Tous les numéros proposés sont déjà attribués. La liste s’élargit automatiquement (marge de numéros).
            </p>
          ) : null}
        </Field>
      )}
    </>
  );
}
