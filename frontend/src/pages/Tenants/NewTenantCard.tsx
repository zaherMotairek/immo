import { AddZoomModal } from '@/components/AddZoomModal';
import { HelpHint } from '@/components/ui';
import { Button, Callout, Field, Input } from '@/components/ui/index';
import type { NewTenant } from './useNewTenant';

/** Fenêtre zoom « Nouveau locataire ». */
export function NewTenantCard({ form }: { form: NewTenant }) {
  return (
    <div ref={form.addTenantFormRef} id="nouveau-locataire" className="scroll-mt-24">
      <AddZoomModal
        open={form.addTenantOpen}
        onClose={form.cancelNewTenant}
        kicker="Ajouter"
        title="Nouveau locataire"
        subtitle="Nom et coordonnées pour les relances"
        size="md"
        titleId="nouveau-locataire-title"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <HelpHint
            className="align-middle"
            title="Le nom peut être saisi en une ligne (ex. prénom puis nom). Téléphone et e-mail servent aux relances depuis la page Paiements."
          />
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
              autoFocus
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
      </AddZoomModal>
    </div>
  );
}
