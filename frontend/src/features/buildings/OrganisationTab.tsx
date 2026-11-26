import { HelpHint } from '@/components/ui';
import { Button, Callout, Card, Checkbox, Input, Select } from '@/components/ui/index';
import {
  BUILDING_STRUCTURE_OPTIONS,
  IMMEUBLE_FLOORS_HINT,
  IMMEUBLE_LOGEMENT_TOTAL_HINT,
  IMMEUBLE_LOGEMENTS_PAR_ETAGE_HINT,
  IMMEUBLE_RDC_CHECKBOX_HINT,
  IMMEUBLE_REZ_APARTMENTS_HINT,
  type BuildingStructureValue,
} from '@/lib/buildingStructure';
import { structureTypeHintText } from './buildingHints';
import { ORG_SECTION_HINT } from './buildingUtils';
import { HintedField } from './HintedField';
import type { Building } from './types';
import type { BuildingLayout } from './useBuildingLayout';
import type { BuildingProfile } from './useBuildingProfile';
import type { BuildingProfileDrafts } from './useBuildingProfileDrafts';

const STRUCTURE_OPTIONS = BUILDING_STRUCTURE_OPTIONS.map((o) => ({ id: o.value as string, label: o.label }));

type OrganisationTabProps = {
  b: Building;
  layout: BuildingLayout;
  drafts: BuildingProfileDrafts;
  profile: BuildingProfile;
  open: boolean;
  onToggleOpen: () => void;
};

/** Onglet « Organisation » : type de bien, étages / logements (immeuble) ou lots (terrain), enregistrement. */
export function OrganisationTab({ b, layout, drafts, profile, open, onToggleOpen }: OrganisationTabProps) {
  const { immeubleLocked, rdcHabitationUnitsCreated, rdcLocauxUnitsCreated } = layout;
  const {
    structureKindDraft,
    hasRezDeChausseeDraft,
    computedImmeubleOrgTotal,
  } = drafts;
  const { structureErr, structureSaving, buildingProfileDirty } = profile;

  return (
    <Card id="fiche-organisation" padding="none" className="scroll-mt-24 !border-0 !shadow-none">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-[var(--color-ink)]">Organisation du bien</h2>
          <HelpHint title={ORG_SECTION_HINT} className="align-middle" />
        </div>
        <Button variant="secondary" size="sm" onClick={onToggleOpen} aria-expanded={open}>
          {open ? 'Masquer' : 'Afficher'}
        </Button>
      </div>
      {open ? (
        <form
          onSubmit={profile.saveBuildingProfile}
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <HintedField
            className="min-w-[min(100%,20rem)] flex-1"
            label="Type"
            htmlFor="building-structure-kind"
            help={structureTypeHintText(b, immeubleLocked, structureKindDraft)}
          >
            {immeubleLocked ? (
              <p
                id="building-structure-kind"
                className="rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-3 py-2 text-sm text-[var(--color-ink)]"
              >
                {b.structureKind === 'TERRAIN_LOTS'
                  ? 'Terrain avec plusieurs locataires (plusieurs parcelles / baux)'
                  : `Immeuble ou bâtiment multi locataires${
                      b.hasRezDeChaussee === false ? ' (sans rez-de-chaussée dans la structure)' : ''
                    }`}
              </p>
            ) : (
              <Select
                id="building-structure-kind"
                options={STRUCTURE_OPTIONS}
                value={structureKindDraft}
                onValueChange={(v) => drafts.setStructureKindDraft(v as BuildingStructureValue)}
              />
            )}
          </HintedField>
          {structureKindDraft === 'IMMEUBLE' ? (
            <>
              <HintedField
                className="w-full min-w-[8rem] sm:w-auto"
                label="Étages au-dessus du RDC"
                htmlFor="building-floor-count"
                help={IMMEUBLE_FLOORS_HINT}
              >
                <Input
                  id="building-floor-count"
                  type="number"
                  min={0}
                  value={drafts.floorCountDraft}
                  onChange={(e) => drafts.setFloorCountDraft(e.target.value)}
                  placeholder="—"
                />
              </HintedField>
              <HintedField
                className="w-full min-w-[8rem] sm:w-auto"
                label="Logements par étage (étages 1 à N)"
                htmlFor="building-apartments-per-floor"
                help={IMMEUBLE_LOGEMENTS_PAR_ETAGE_HINT}
              >
                <Input
                  id="building-apartments-per-floor"
                  type="number"
                  min={1}
                  value={drafts.apartmentsPerFloorDraft}
                  onChange={(e) => drafts.setApartmentsPerFloorDraft(e.target.value)}
                  placeholder="Ex. 2"
                />
                {computedImmeubleOrgTotal != null ? (
                  <p className="mt-1 text-xs font-medium text-[var(--color-ink)]">
                    Total logements d’habitation calculé :{' '}
                    <span className="tabular-nums">{computedImmeubleOrgTotal}</span>
                  </p>
                ) : null}
              </HintedField>
              <div className="flex w-full min-w-[8rem] items-start gap-2 sm:w-auto sm:max-w-md">
                <Checkbox
                  id="building-has-rdc"
                  label="Inclure le rez-de-chaussée dans les étages"
                  description={hasRezDeChausseeDraft ? 'RDC inclus (étage 0)' : 'RDC non inclus'}
                  checked={hasRezDeChausseeDraft}
                  onChange={(e) => drafts.setHasRezDeChausseeDraft(e.target.checked)}
                />
                <HelpHint title={IMMEUBLE_RDC_CHECKBOX_HINT} className="mt-3 shrink-0 align-middle" />
              </div>
              {hasRezDeChausseeDraft ? (
                <HintedField
                  className="w-full min-w-[8rem] sm:max-w-xs"
                  label="Nombre d’unités d’habitation au rez-de-chaussée"
                  htmlFor="building-rez-apartments"
                  help={IMMEUBLE_REZ_APARTMENTS_HINT}
                >
                  <Input
                    id="building-rez-apartments"
                    type="number"
                    min={0}
                    value={drafts.rezApartmentCountDraft}
                    onChange={(e) => drafts.setRezApartmentCountDraft(e.target.value)}
                    placeholder="Ex. 2"
                  />
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
                    <HelpHint
                      className="align-middle"
                      title="Plafond des logements d’habitation au rez-de-chaussée (étage 0). Entrepôts et commerces ont une numérotation séparée."
                    />
                    <span>Aide</span>
                  </div>
                </HintedField>
              ) : null}
              <HintedField
                className="w-full min-w-[8rem] sm:w-auto"
                label="Structure indicative — logements prévus (optionnel)"
                htmlFor="building-apartment-count"
                help={`${IMMEUBLE_LOGEMENT_TOTAL_HINT} Le total réel = unités créées. Ce champ guide la grille / génération auto. Si logements/étage renseignés, le total est calculé.`}
              >
                <Input
                  id="building-apartment-count"
                  type="number"
                  min={0}
                  value={drafts.apartmentCountDraft}
                  onChange={(e) => drafts.setApartmentCountDraft(e.target.value)}
                  placeholder="—"
                  readOnly={computedImmeubleOrgTotal != null}
                  className={
                    computedImmeubleOrgTotal != null
                      ? 'cursor-not-allowed bg-[var(--odoo-table-head-bg)]'
                      : undefined
                  }
                />
              </HintedField>
              {hasRezDeChausseeDraft ? (
                <div className="w-full sm:col-span-2 lg:col-span-3">
                  <div className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-3 py-2.5">
                    <p className="text-xs font-semibold text-[var(--color-ink)]">
                      Rez-de-chaussée — unités déjà créées
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
                      <strong className="tabular-nums text-[var(--color-ink)]">{rdcHabitationUnitsCreated}</strong>{' '}
                      unité(s) d’habitation ·{' '}
                      <strong className="tabular-nums text-[var(--color-ink)]">{rdcLocauxUnitsCreated}</strong>{' '}
                      entrepôt(s) / commerce(s)
                    </p>
                  </div>
                </div>
              ) : null}
            </>
          ) : structureKindDraft === 'TERRAIN_LOTS' ? (
            <HintedField
              className="w-full min-w-[10rem] sm:max-w-xs"
              label="Lots sur le terrain (indicatif)"
              htmlFor="building-terrain-lot-count"
              help="Nombre de lots prévus sur ce terrain (parcelles, emplacements, etc.). Indicatif : les baux restent liés aux unités créées."
            >
              <Input
                id="building-terrain-lot-count"
                type="number"
                min={0}
                value={drafts.terrainLotCountDraft}
                onChange={(e) => drafts.setTerrainLotCountDraft(e.target.value)}
                placeholder="Ex. 5"
              />
            </HintedField>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={structureSaving} disabled={!buildingProfileDirty}>
              {structureSaving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button
              variant="secondary"
              disabled={structureSaving || !buildingProfileDirty}
              onClick={profile.resetBuildingProfileFromLoaded}
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : null}
      {structureErr ? (
        <Callout variant="danger" className="mt-3">
          {structureErr}
        </Callout>
      ) : null}
    </Card>
  );
}
