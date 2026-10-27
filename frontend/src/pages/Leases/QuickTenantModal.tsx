import { Button, Callout, Field, Input, Modal } from '@/components/ui/index';
import type { QuickTenant } from './useQuickTenant';

/** Modale « Nouveau locataire » : création rapide depuis le formulaire de bail. */
export function QuickTenantModal({ q }: { q: QuickTenant }) {
  return (
    <Modal
      open={q.quickTenantOpen}
      onClose={q.closeQuickTenant}
      title="Nouveau locataire"
      closeOnBackdrop={false}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={q.closeQuickTenant}>
            Annuler
          </Button>
          <Button type="submit" form="quick-tenant-form" disabled={q.quickTenantBusy} loading={q.quickTenantBusy}>
            {q.quickTenantBusy ? 'Enregistrement…' : 'Créer et sélectionner'}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-xs text-[var(--color-muted)]">Création rapide depuis la fiche bail.</p>
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
      </form>
    </Modal>
  );
}
