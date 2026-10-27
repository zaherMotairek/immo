import { Button, Callout, Card, Checkbox, Field, Input } from '@/components/ui/index';
import type { AdminClientsState } from './useAdminClients';

type Props = {
  admin: AdminClientsState;
};

/** Panneau édition accès : date payée, suspension, reset MDP, invitation. */
export function AdminOrgAccessPanel({ admin }: Props) {
  const { editOrg } = admin;
  if (!editOrg) return null;

  return (
    <Card className="max-w-lg border-brand-200/80 dark:border-brand-800/50">
      <h3 className="text-base font-semibold text-[var(--color-ink)]">
        Accès : {editOrg.name?.trim() || editOrg.id}
      </h3>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        Dernier jour <strong>inclus</strong> avec accès. Le lendemain, les utilisateurs de cette organisation ne
        pourront plus se connecter ni utiliser l’API. Laissez vide pour ne pas limiter par date.
      </p>
      <form onSubmit={admin.saveEdit} className="mt-4 space-y-4">
        <Field label="Payé jusqu’au (date)" htmlFor="edit-paid-until">
          <Input
            id="edit-paid-until"
            type="date"
            value={admin.editPaidUntil}
            onChange={(e) => admin.setEditPaidUntil(e.target.value)}
          />
        </Field>
        <Checkbox
          id="edit-suspended"
          label="Suspendre tout accès (prioritaire sur la date)"
          checked={admin.editSuspended}
          onChange={(e) => admin.setEditSuspended(e.target.checked)}
        />
        {admin.editErr ? <Callout variant="danger">{admin.editErr}</Callout> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={admin.editSaving}>
            {admin.editSaving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <Button type="button" variant="secondary" onClick={admin.closeEdit} disabled={admin.editSaving}>
            Annuler
          </Button>
        </div>
      </form>

      <div className="mt-5 border-t border-[var(--odoo-border)] pt-4">
        <h4 className="text-sm font-semibold text-[var(--color-ink)]">Réinitialiser un mot de passe</h4>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Définissez un mot de passe provisoire et communiquez-le au client (WhatsApp, etc.). Aucun e-mail n’est envoyé.
        </p>
        <ul className="mt-3 space-y-3">
          {editOrg.users
            .filter((u) => u.role !== 'PLATFORM_ADMIN')
            .map((u) => (
              <li
                key={u.id}
                className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] p-3"
              >
                <p className="text-xs font-semibold text-[var(--color-ink)]">{u.email}</p>
                {u.name ? <p className="text-[11px] text-[var(--color-muted)]">{u.name}</p> : null}
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Field label="Nouveau provisoire" htmlFor={`reset-pwd-${u.id}`} className="min-w-0 flex-1">
                    <Input
                      id={`reset-pwd-${u.id}`}
                      type="text"
                      autoComplete="off"
                      value={admin.resetPwdByUser[u.id] ?? ''}
                      onChange={(e) =>
                        admin.setResetPwdByUser((prev) => ({ ...prev, [u.id]: e.target.value }))
                      }
                      minLength={8}
                      placeholder="Au moins 8 caractères"
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    disabled={admin.resetSavingUserId === u.id}
                    onClick={() => void admin.submitResetPassword(u.id, u.email)}
                  >
                    {admin.resetSavingUserId === u.id ? '…' : 'Réinitialiser'}
                  </Button>
                </div>
              </li>
            ))}
        </ul>
        {editOrg.users.every((u) => u.role === 'PLATFORM_ADMIN') ? (
          <p className="mt-2 text-xs text-[var(--color-muted)]">Aucun compte client dans cette organisation.</p>
        ) : null}
        {admin.resetErr ? <Callout variant="danger" className="mt-2">{admin.resetErr}</Callout> : null}
        {admin.resetOk ? <Callout variant="success" className="mt-2">{admin.resetOk}</Callout> : null}
      </div>

      <div className="mt-5 border-t border-[var(--odoo-border)] pt-4">
        <h4 className="text-sm font-semibold text-[var(--color-ink)]">Inviter un utilisateur</h4>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Crée un compte pour cette organisation. Vous communiquez le mot de passe provisoire au client.
        </p>
        <form onSubmit={admin.submitInvite} className="mt-3 space-y-3">
          <Field label="E-mail" htmlFor="invite-email" required>
            <Input
              id="invite-email"
              type="email"
              value={admin.inviteEmail}
              onChange={(e) => admin.setInviteEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Nom (optionnel)" htmlFor="invite-name">
            <Input id="invite-name" value={admin.inviteName} onChange={(e) => admin.setInviteName(e.target.value)} />
          </Field>
          <Field label="Mot de passe provisoire (optionnel)" htmlFor="invite-pwd">
            <Input
              id="invite-pwd"
              type="text"
              autoComplete="off"
              value={admin.invitePassword}
              onChange={(e) => admin.setInvitePassword(e.target.value)}
              minLength={8}
              placeholder="Laisser vide = généré automatiquement"
            />
          </Field>
          {admin.inviteErr ? <Callout variant="danger">{admin.inviteErr}</Callout> : null}
          {admin.inviteOk ? <Callout variant="success">{admin.inviteOk}</Callout> : null}
          <Button type="submit" disabled={admin.inviteSaving}>
            {admin.inviteSaving ? 'Invitation…' : 'Inviter utilisateur'}
          </Button>
        </form>
      </div>
    </Card>
  );
}
