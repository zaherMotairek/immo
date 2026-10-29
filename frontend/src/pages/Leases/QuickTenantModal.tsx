import { AddZoomModal } from '@/components/AddZoomModal';
import { Button, Callout, Field, Input } from '@/components/ui/index';
import type { QuickTenant } from './useQuickTenant';

/** Fenêtre zoom « Nouveau locataire » rapide depuis le formulaire de bail. */
export function QuickTenantModal({ q }: { q: QuickTenant }) {
  return (
    <AddZoomModal
      open={q.quickTenantOpen}
      onClose={q.closeQuickTenant}
      kicker="Ajouter"
      title="Nouveau locataire"
      subtitle="Création rapide depuis le bail"
      size="md"
      titleId="quick-tenant-title"
    >
      <form id="quick-tenant-form" onSubmit={(e) => void q.createQuickTenant(e)} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom complet" htmlFor="quick-tenant-name" className="sm:col-span-2">
          <Input
            id="quick-tenant-name"
            data-autofocus
            value={q.quickTenantName}
            onChange={(e) => q.setQuickTenantName(e.target.value)}
            placeholder="Ex. Amadou Koné"
            autoComplete="name"
            required
            autoFocus
          />
        </Field>
        <Field label="Téléphone (optionnel)" htmlFor="quick-tenant-phone">
          <Input
            id="quick-tenant-phone"
            value={q.quickTenantPhone}
            onChange={(e) => q.setQuickTenantPhone(e.target.value)}
            placeholder="+225 07 …"
          />
        </Field>
        <Field label="E-mail (optionnel)" htmlFor="quick-tenant-email">
          <Input
            id="quick-tenant-email"
            type="email"
            value={q.quickTenantEmail}
            onChange={(e) => q.setQuickTenantEmail(e.target.value)}
          />
        </Field>
        {q.quickTenantErr ? (
          <Callout variant="danger" className="sm:col-span-2">
            {q.quickTenantErr}
          </Callout>
        ) : null}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={q.quickTenantBusy} loading={q.quickTenantBusy}>
            {q.quickTenantBusy ? 'Enregistrement…' : 'Créer et sélectionner'}
          </Button>
          <Button type="button" variant="secondary" onClick={q.closeQuickTenant}>
            Annuler
          </Button>
        </div>
      </form>
    </AddZoomModal>
  );
}
