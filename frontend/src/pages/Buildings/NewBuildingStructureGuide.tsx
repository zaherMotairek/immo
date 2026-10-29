import { useMemo, useState } from 'react';
import { Button, Callout, Field, Input, Select, cn } from '@/components/ui/index';
import { COMMUNE_SUGGESTIONS, IVORY_COAST_CITIES } from '@/lib/ciLocation';
import type { BuildingStructureValue } from '@/lib/buildingStructure';
import type { NewBuilding } from './useNewBuilding';

type GuideKind = BuildingStructureValue | null;

const CITY_OPTIONS = IVORY_COAST_CITIES.map((c) => ({ id: c, label: c }));
const COMMUNE_OPTIONS = COMMUNE_SUGGESTIONS.map((c) => ({ id: c, label: c }));

type ChoiceBtnProps = {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
};

function ChoiceBtn({ label, description, selected, onClick }: ChoiceBtnProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'min-h-11 w-full rounded-[var(--radius-card)] border-2 p-3 text-left transition-colors duration-[var(--duration-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:min-h-12',
        selected
          ? 'border-brand-600 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/40'
          : 'border-[var(--odoo-border)] bg-[var(--color-surface)] hover:bg-[var(--odoo-row-hover)]',
      )}
    >
      <span className="block text-sm font-semibold text-[var(--color-ink)]">{label}</span>
      {description ? <span className="mt-0.5 block text-xs text-[var(--color-muted)]">{description}</span> : null}
    </button>
  );
}

function NumberChips({
  values,
  value,
  onChange,
  ariaLabel,
}: {
  values: number[];
  value: number | null;
  onChange: (n: number) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {values.map((n) => {
        const on = value === n;
        return (
          <button
            key={n}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(n)}
            className={cn(
              'min-h-11 min-w-11 rounded-[var(--radius-control)] border px-3 text-sm font-semibold tabular-nums transition-colors duration-[var(--duration-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
              on
                ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500'
                : 'border-[var(--odoo-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--odoo-row-hover)]',
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Guide pas à pas : structure → nom / ville / commune / adresse → enregistrement.
 */
export function NewBuildingStructureGuide({ form }: { form: NewBuilding }) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<GuideKind>(null);
  const [floors, setFloors] = useState<number | null>(null);
  const [perFloor, setPerFloor] = useState<number | null>(null);
  const [hasRdcHousing, setHasRdcHousing] = useState<boolean | null>(null);
  const [rezCount, setRezCount] = useState<number | null>(null);
  const [lotCount, setLotCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  function resetGuide() {
    setStep(0);
    setKind(null);
    setFloors(null);
    setPerFloor(null);
    setHasRdcHousing(null);
    setRezCount(null);
    setLotCount(null);
    setSaving(false);
  }

  const immeubleTotal = useMemo(() => {
    if (floors == null || perFloor == null) return null;
    const rez = hasRdcHousing && rezCount != null ? rezCount : 0;
    return floors * perFloor + rez;
  }, [floors, perFloor, hasRdcHousing, rezCount]);

  function pushStructureToForm(nextKind: BuildingStructureValue) {
    if (nextKind === 'MONO_LOT') {
      form.applyStructureAnswers({ structureKind: 'MONO_LOT' });
      return;
    }
    if (nextKind === 'TERRAIN_LOTS') {
      form.applyStructureAnswers({
        structureKind: 'TERRAIN_LOTS',
        terrainLotCountNew: lotCount != null ? String(lotCount) : '',
      });
      return;
    }
    if (floors == null || perFloor == null) return;
    form.applyStructureAnswers({
      structureKind: 'IMMEUBLE',
      floorCountImmeuble: String(floors),
      apartmentsPerFloorImmeuble: String(perFloor),
      includeRezDeChaussee: true,
      rezApartmentImmeuble: hasRdcHousing === true && rezCount != null ? String(rezCount) : '0',
    });
  }

  function goToIdentity(nextKind: BuildingStructureValue) {
    pushStructureToForm(nextKind);
    setStep(10);
  }

  async function saveBuilding() {
    setSaving(true);
    try {
      await form.createBuilding();
    } finally {
      setSaving(false);
    }
  }

  const stepLabel =
    step === 0
      ? 'Étape 1 — Type de bien'
      : step >= 1 && step < 10
        ? `Étape ${step + 1} — Structure`
        : step === 10
          ? 'Nom du bien'
          : step === 11
            ? 'Ville'
            : step === 12
              ? 'Commune / zone'
              : step === 13
                ? 'Adresse (optionnel)'
                : 'Récapitulatif';

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">{stepLabel}</p>

      {step === 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-ink)]">Quel genre de bien créez-vous ?</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <ChoiceBtn
              label="Villa ou un seul lot"
              description="Une maison, un hangar entier, une parcelle unique"
              selected={kind === 'MONO_LOT'}
              onClick={() => {
                setKind('MONO_LOT');
                goToIdentity('MONO_LOT');
              }}
            />
            <ChoiceBtn
              label="Immeuble avec plusieurs appartements"
              description="Plusieurs étages, plusieurs locataires"
              selected={kind === 'IMMEUBLE'}
              onClick={() => {
                setKind('IMMEUBLE');
                setStep(1);
              }}
            />
            <ChoiceBtn
              label="Terrain avec plusieurs lots"
              description="Plusieurs emplacements loués séparément"
              selected={kind === 'TERRAIN_LOTS'}
              onClick={() => {
                setKind('TERRAIN_LOTS');
                setStep(1);
              }}
            />
          </div>
        </div>
      ) : null}

      {kind === 'IMMEUBLE' && step === 1 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-ink)]">
            Combien d’étages au-dessus du rez-de-chaussée ?
          </p>
          <p className="text-xs text-[var(--color-muted)]">Exemple : un immeuble R+3 → choisissez 3.</p>
          <NumberChips values={[1, 2, 3, 4, 5, 6, 8, 10]} value={floors} onChange={setFloors} ariaLabel="Nombre d’étages" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep(0)}>
              Retour
            </Button>
            <Button type="button" size="sm" disabled={floors == null} onClick={() => setStep(2)}>
              Continuer
            </Button>
          </div>
        </div>
      ) : null}

      {kind === 'IMMEUBLE' && step === 2 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-ink)]">Combien d’appartements sur chaque étage ?</p>
          <NumberChips
            values={[1, 2, 3, 4, 5, 6]}
            value={perFloor}
            onChange={setPerFloor}
            ariaLabel="Appartements par étage"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep(1)}>
              Retour
            </Button>
            <Button type="button" size="sm" disabled={perFloor == null} onClick={() => setStep(3)}>
              Continuer
            </Button>
          </div>
        </div>
      ) : null}

      {kind === 'IMMEUBLE' && step === 3 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-ink)]">Y a-t-il des appartements au rez-de-chaussée ?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceBtn
              label="Non"
              description="Pas de logement d’habitation au RDC"
              selected={hasRdcHousing === false}
              onClick={() => {
                setHasRdcHousing(false);
                setRezCount(0);
              }}
            />
            <ChoiceBtn
              label="Oui"
              description="Des logements au rez-de-chaussée"
              selected={hasRdcHousing === true}
              onClick={() => {
                setHasRdcHousing(true);
                if (rezCount == null || rezCount === 0) setRezCount(1);
              }}
            />
          </div>
          {hasRdcHousing === true ? (
            <div className="space-y-2">
              <p className="text-xs text-[var(--color-muted)]">Combien au rez-de-chaussée ?</p>
              <NumberChips values={[1, 2, 3, 4]} value={rezCount} onChange={setRezCount} ariaLabel="Logements au RDC" />
            </div>
          ) : null}
          {immeubleTotal != null && hasRdcHousing != null ? (
            <p className="text-sm font-medium text-[var(--color-ink)]">
              Total prévu : <span className="tabular-nums">{immeubleTotal}</span> logement(s)
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep(2)}>
              Retour
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={hasRdcHousing == null || (hasRdcHousing && (rezCount == null || rezCount < 1))}
              onClick={() => goToIdentity('IMMEUBLE')}
            >
              Continuer — nom du bien
            </Button>
          </div>
        </div>
      ) : null}

      {kind === 'TERRAIN_LOTS' && step === 1 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-ink)]">Combien de lots sur ce terrain ?</p>
          <NumberChips values={[2, 3, 4, 5, 6, 8, 10, 12]} value={lotCount} onChange={setLotCount} ariaLabel="Nombre de lots" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep(0)}>
              Retour
            </Button>
            <Button type="button" size="sm" disabled={lotCount == null} onClick={() => goToIdentity('TERRAIN_LOTS')}>
              Continuer — nom du bien
            </Button>
          </div>
        </div>
      ) : null}

      {step === 10 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-ink)]">Comment s’appelle ce bien ?</p>
          <Field label="Nom ou référence" htmlFor="guide-building-name" required>
            <Input
              id="guide-building-name"
              value={form.name}
              onChange={(e) => form.setName(e.target.value)}
              required
              placeholder="Ex. Résidence Les Palmiers, Villa Dupont…"
              autoFocus
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                if (kind === 'MONO_LOT') setStep(0);
                else if (kind === 'TERRAIN_LOTS') setStep(1);
                else setStep(3);
              }}
            >
              Retour
            </Button>
            <Button type="button" size="sm" disabled={!form.name.trim()} onClick={() => setStep(11)}>
              Continuer
            </Button>
          </div>
        </div>
      ) : null}

      {step === 11 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-ink)]">Dans quelle ville ?</p>
          <Field label="Ville" htmlFor="guide-building-city">
            <Select id="guide-building-city" options={CITY_OPTIONS} value={form.cityChoice} onValueChange={form.setCityChoice} />
            {form.cityChoice === 'Autre' ? (
              <Input
                className="mt-2"
                aria-label="Nom de la ville"
                value={form.cityOther}
                onChange={(e) => form.setCityOther(e.target.value)}
                placeholder="Nom de la ville"
              />
            ) : null}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep(10)}>
              Retour
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={form.cityChoice === 'Autre' && !form.cityOther.trim()}
              onClick={() => setStep(12)}
            >
              Continuer
            </Button>
          </div>
        </div>
      ) : null}

      {step === 12 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-ink)]">Quelle commune ou zone ?</p>
          <Field label="Commune / zone" htmlFor="guide-building-commune">
            <Select
              id="guide-building-commune"
              options={COMMUNE_OPTIONS}
              value={form.communeChoice}
              onValueChange={form.setCommuneChoice}
            />
            {form.communeChoice === 'Autre' ? (
              <Input
                className="mt-2"
                aria-label="Commune ou zone"
                value={form.communeOther}
                onChange={(e) => form.setCommuneOther(e.target.value)}
                placeholder="Ex. Marcory Zone 4"
              />
            ) : null}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep(11)}>
              Retour
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={form.communeChoice === 'Autre' && !form.communeOther.trim()}
              onClick={() => setStep(13)}
            >
              Continuer
            </Button>
          </div>
        </div>
      ) : null}

      {step === 13 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-ink)]">Adresse précise (optionnel)</p>
          <Field label="Rue, repère, accès…" htmlFor="guide-building-address">
            <Input
              id="guide-building-address"
              value={form.address}
              onChange={(e) => form.setAddress(e.target.value)}
              placeholder="Optionnel"
            />
          </Field>
          <Field label="Code postal (optionnel)" htmlFor="guide-building-postal">
            <Input
              id="guide-building-postal"
              value={form.postalCode}
              onChange={(e) => form.setPostalCode(e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep(12)}>
              Retour
            </Button>
            <Button type="button" size="sm" onClick={() => setStep(14)}>
              Voir le récapitulatif
            </Button>
          </div>
        </div>
      ) : null}

      {step === 14 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-ink)]">Vérifiez avant d’enregistrer</p>
          <ul className="space-y-1.5 rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-ink)]">
            <li>
              <span className="text-[var(--color-muted)]">Nom : </span>
              {form.name.trim() || '—'}
            </li>
            <li>
              <span className="text-[var(--color-muted)]">Type : </span>
              {kind === 'MONO_LOT'
                ? 'Villa / un seul lot'
                : kind === 'TERRAIN_LOTS'
                  ? `Terrain — ${lotCount ?? '—'} lot(s)`
                  : `Immeuble — ${floors ?? '—'} étage(s) × ${perFloor ?? '—'} appart(s)${
                      hasRdcHousing && rezCount ? ` + ${rezCount} au RDC` : ''
                    }${immeubleTotal != null ? ` (${immeubleTotal} logements)` : ''}`}
            </li>
            <li>
              <span className="text-[var(--color-muted)]">Lieu : </span>
              {form.cityChoice === 'Autre' ? form.cityOther : form.cityChoice}
              {' · '}
              {form.communeChoice === 'Autre' ? form.communeOther : form.communeChoice}
            </li>
            {form.address.trim() ? (
              <li>
                <span className="text-[var(--color-muted)]">Adresse : </span>
                {form.address.trim()}
              </li>
            ) : null}
          </ul>
          {form.err ? <Callout variant="danger">{form.err}</Callout> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep(13)}>
              Retour
            </Button>
            <Button type="button" size="sm" loading={saving} onClick={() => void saveBuilding()}>
              Enregistrer le bien
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetGuide}>
              Recommencer
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
