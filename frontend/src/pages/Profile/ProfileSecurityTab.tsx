import { Button, Callout, Field, Input } from '@/components/ui/index';
import type { ProfilePassword } from './useProfilePassword';

/** Onglet Sécurité : confidentialité + changement de mot de passe. */
export function ProfileSecurityTab({ password }: { password: ProfilePassword }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">Confidentialité</h2>
        <Callout variant="warning">
          Après modification, <strong className="font-semibold">vous seul</strong> connaissez votre mot de passe. En cas
          d’oubli, utilisez « Mot de passe oublié » sur l’écran de connexion (e-mail avec lien).
        </Callout>
      </div>
      <div>
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">Mot de passe</h2>
        <p className="mb-4 text-sm text-[var(--color-muted)]">Minimum 8 caractères. Choisissez un mot de passe unique.</p>
        <form onSubmit={password.onChangePassword} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mot de passe actuel" htmlFor="profile-current-pwd">
              <Input
                id="profile-current-pwd"
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                value={password.currentPassword}
                onChange={(e) => password.setCurrentPassword(e.target.value)}
              />
            </Field>
            <Field label="Nouveau mot de passe" htmlFor="profile-new-pwd">
              <Input
                id="profile-new-pwd"
                type="password"
                name="newPassword"
                autoComplete="new-password"
                value={password.newPassword}
                onChange={(e) => password.setNewPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirmer" htmlFor="profile-confirm-pwd">
              <Input
                id="profile-confirm-pwd"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={password.confirmPassword}
                onChange={(e) => password.setConfirmPassword(e.target.value)}
              />
            </Field>
          </div>
          {password.pwdErr ? <Callout variant="danger">{password.pwdErr}</Callout> : null}
          {password.pwdOk ? <Callout variant="success">Mot de passe mis à jour.</Callout> : null}
          <Button type="submit" variant="secondary" disabled={password.pwdSaving || !password.user}>
            {password.pwdSaving ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
          </Button>
        </form>
      </div>
    </div>
  );
}
