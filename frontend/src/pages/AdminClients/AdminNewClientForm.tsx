import { HelpHint } from '@/components/ui';
import { Button, Callout, Card, Field, Input } from '@/components/ui/index';
import type { AdminClientsState } from './useAdminClients';

/** Formulaire création organisation + premier compte client. */
export function AdminNewClientForm({ admin }: { admin: AdminClientsState }) {
  return (
    <Card className="max-w-lg">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-[var(--color-ink)]">Nouveau client</h2>
        <HelpHint title="Crée une organisation vide + un premier utilisateur. Définissez ensuite la date « payé jusqu’au » dans le tableau pour activer le contrôle mensuel." />
      </div>
      <form onSubmit={admin.onSubmitCreate} className="space-y-4">
        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              Nom du bailleur / société (reçus PDF)
              <HelpHint title="Ce nom apparaît comme émetteur sur les quittances du client. Il pourra le modifier dans Profil." />
            </span>
          }
          htmlFor="admin-org-name"
          required
        >
          <Input
            id="admin-org-name"
            value={admin.organizationName}
            onChange={(e) => admin.setOrganizationName(e.target.value)}
            placeholder="Ex. SCI Les Palmiers"
            required
            minLength={1}
            autoComplete="organization"
          />
        </Field>
        <Field label="E-mail de connexion du client" htmlFor="admin-email" required>
          <Input
            id="admin-email"
            type="email"
            value={admin.email}
            onChange={(e) => admin.setEmail(e.target.value)}
            required
            autoComplete="off"
          />
        </Field>
        <Field label="Nom du contact (optionnel)" htmlFor="admin-owner">
          <Input
            id="admin-owner"
            value={admin.ownerName}
            onChange={(e) => admin.setOwnerName(e.target.value)}
            placeholder="Ex. Marie Kouassi"
            autoComplete="name"
          />
        </Field>
        <Field
          label="Mot de passe provisoire"
          htmlFor="admin-pwd"
          required
          hint="Au moins 8 caractères. Communiquez-le au client ; il pourra le changer dans Profil."
        >
          <Input
            id="admin-pwd"
            type="password"
            value={admin.password}
            onChange={(e) => admin.setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>
        {admin.err ? <Callout variant="danger">{admin.err}</Callout> : null}
        {admin.ok ? <Callout variant="success">{admin.ok}</Callout> : null}
        <Button type="submit" disabled={admin.saving}>
          {admin.saving ? 'Création…' : 'Créer organisation + compte'}
        </Button>
      </form>
    </Card>
  );
}
