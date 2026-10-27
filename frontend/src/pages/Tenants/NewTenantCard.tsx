import { HelpHint } from '@/components/ui';
import { Button, Callout, Card, Field, Input } from '@/components/ui/index';
import type { NewTenant } from './useNewTenant';

/** Carte repliable « Nouveau locataire » : nom complet, téléphone et e-mail optionnels. */
export function NewTenantCard({ form }: { form: NewTenant }) {
  const open = form.addTenantOpen;
  return (
    <div ref={form.addTenantFormRef} id="nouveau-locataire" className="scroll-mt-24">
      <Card padding="none" className="overflow-hidden">
        <button
          type="button"
          onClick={() => form.setAddTenantOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors duration-[var(--duration-fast)] hover:bg-[var(--odoo-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600 sm:px-5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/12 text-lg font-bold leading-none text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              +
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">Nouveau locataire</h2>
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                {open ? 'Masquer le formulaire' : 'Afficher le formulaire d’enregistrement'}
              </p>
            </div>
          </div>
          <svg
            className={`size-5 shrink-0 text-[var(--color-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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
                title="Le nom peut être saisi en une ligne (ex. prénom puis nom). Téléphone et e-mail servent aux relances depuis la page Paiements."
              />
              <span className="text-xs text-[var(--color-muted)]">Nom, coordonnées optionnelles.</span>
            </div>
            <form onSubmit={form.create} className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom complet" htmlFor="new-tenant-name" required className="sm:col-span-2">
                <Input
                  id="new-tenant-name"
                  value={form.fullName}
                  onChange={(e) => form.setFullName(e.target.value)}
                  required
                  placeholder="Ex. Amadou Koné"
                  autoComplete="name"
                />
              </Field>
              <Field label="Téléphone (optionnel)" htmlFor="new-tenant-phone">
                <Input
                  id="new-tenant-phone"
                  value={form.phone}
                  onChange={(e) => form.setPhone(e.target.value)}
                  placeholder="+225 07 …"
                />
              </Field>
              <Field label="E-mail (optionnel)" htmlFor="new-tenant-email">
                <Input
                  id="new-tenant-email"
                  value={form.email}
                  onChange={(e) => form.setEmail(e.target.value)}
                  type="email"
                />
              </Field>
              {form.err ? (
                <Callout variant="danger" className="sm:col-span-2">
                  {form.err}
                </Callout>
              ) : null}
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="submit">Enregistrer</Button>
                <Button type="button" variant="secondary" onClick={form.cancelNewTenant}>
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
