import { HelpHint } from '@/components/ui';
import { Button, Callout, Card, Field, Input, Select, cn } from '@/components/ui/index';
import { COMMUNE_SUGGESTIONS, IVORY_COAST_CITIES } from '@/lib/ciLocation';
import { NewBuildingStructure } from './NewBuildingStructure';
import type { NewBuilding } from './useNewBuilding';

const CITY_OPTIONS = IVORY_COAST_CITIES.map((c) => ({ id: c, label: c }));
const COMMUNE_OPTIONS = COMMUNE_SUGGESTIONS.map((c) => ({ id: c, label: c }));

/** Carte repliable « Nouveau bien » : nom, localisation (ville / commune), adresse et organisation optionnelle. */
export function NewBuildingCard({ form }: { form: NewBuilding }) {
  const open = form.addFormOpen;
  return (
    <div ref={form.addFormRef} id="nouveau-bien" className="scroll-mt-24">
      <Card padding="none" className="overflow-hidden">
        <button
          type="button"
          onClick={() => form.setAddFormOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors duration-[var(--duration-fast)] hover:bg-[var(--odoo-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600 sm:px-5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/12 text-lg font-bold leading-none text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              +
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">Nouveau bien</h2>
          </div>
          <svg
            className={cn('size-5 shrink-0 text-[var(--color-muted)] transition-transform duration-200', open && 'rotate-180')}
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
          <div className="border-t border-[var(--odoo-border)] px-4 pb-5 pt-2 sm:px-5">
            <div className="mb-4 flex flex-wrap items-center gap-2 pt-2">
              <HelpHint
                className="align-middle"
                title="Immeuble multi locataires ou terrain avec plusieurs locataires : un seul bien avec plusieurs unités et plusieurs baux. Villa, entrepôt entier ou parcelle unique sans découpe : un seul lot, une unité, un bail."
              />
            </div>
            <form onSubmit={form.create} className="grid gap-4 sm:grid-cols-2">
              <NewBuildingStructure form={form} />
              <Field label="Nom ou référence du bien" htmlFor="new-building-name" className="sm:col-span-2">
                <Input
                  id="new-building-name"
                  value={form.name}
                  onChange={(e) => form.setName(e.target.value)}
                  required
                  placeholder="Résidence Ranga, Villa Dupont, Entrepôt Port-Bouët…"
                />
              </Field>
              <Field label="Ville" htmlFor="new-building-city">
                <Select
                  id="new-building-city"
                  options={CITY_OPTIONS}
                  value={form.cityChoice}
                  onValueChange={form.setCityChoice}
                />
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
              <Field label="Commune / zone" htmlFor="new-building-commune">
                <Select
                  id="new-building-commune"
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
              <Field label="Adresse ou précision (optionnel)" htmlFor="new-building-address" className="sm:col-span-2">
                <Input
                  id="new-building-address"
                  value={form.address}
                  onChange={(e) => form.setAddress(e.target.value)}
                  placeholder="Rue, repère, accès…"
                />
              </Field>
              <Field label="Code postal (optionnel)" htmlFor="new-building-postal">
                <Input
                  id="new-building-postal"
                  value={form.postalCode}
                  onChange={(e) => form.setPostalCode(e.target.value)}
                />
              </Field>
              {form.err ? (
                <Callout variant="danger" className="sm:col-span-2">
                  {form.err}
                </Callout>
              ) : null}
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="submit">Enregistrer</Button>
                <Button type="button" variant="secondary" onClick={form.cancelNewBuilding}>
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
