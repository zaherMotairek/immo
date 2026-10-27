import { Button, Callout, Card, Field, Input } from '@/components/ui/index';
import type { AuthUser } from '@/auth/AuthContext';
import type { ProfilePassword } from './useProfilePassword';

type ProfileSecurityFormProps = {
  user: AuthUser | null;
  pwd: ProfilePassword;
};

/** Onglet Sécurité : confidentialité + changement de mot de passe. */
export function ProfileSecurityForm({ user, pwd }: ProfileSecurityFormProps) {
  return (
    <div className="space-y-3">
      <Card>
        <h3 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">Confidentialité</h3>
        <Callout variant="warning">
          Après modification, <strong className="font-semibold">vous seul</strong> connaissez votre mot de passe. En cas
          d’oubli, utilisez « Mot de passe oublié » sur l’écran de connexion (e-mail avec lien).
        </Callout>
      </Card>
      <Card>
        <h3 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">Mot de passe</h3>
        <p className="mb-4 text-sm text-[var(--color-muted)]">Minimum 8 caractères. Choisissez un mot de passe unique.</p>
        <form onSubmit={pwd.onChangePassword} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mot de passe actuel" htmlFor="profile-current-pwd">
              <Input
                id="profile-current-pwd"
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                value={pwd.currentPassword}
                onChange={(e) => pwd.setCurrentPassword(e.target.value)}
              />
            </Field>
            <Field label="Nouveau mot de passe" htmlFor="profile-new-pwd">
              <Input
                id="profile-new-pwd"
                type="password"
                name="newPassword"
                autoComplete="new-password"
                value={pwd.newPassword}
                onChange={(e) => pwd.setNewPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirmer" htmlFor="profile-confirm-pwd">
              <Input
                id="profile-confirm-pwd"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={pwd.confirmPassword}
                onChange={(e) => pwd.setConfirmPassword(e.target.value)}
              />
            </Field>
          </div>
          {pwd.pwdErr ? <Callout variant="danger">{pwd.pwdErr}</Callout> : null}
          {pwd.pwdOk ? <Callout variant="success">Mot de passe mis à jour.</Callout> : null}
          <Button type="submit" variant="secondary" disabled={pwd.pwdSaving || !user}>
            {pwd.pwdSaving ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
