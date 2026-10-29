import { Button, Callout, Field, Input } from '@/components/ui/index';
import type { ProfilePassword } from './useProfilePassword';
import type { ProfilePasskeys } from './useProfilePasskeys';

/** Onglet Sécurité : Face ID / passkeys + changement de mot de passe. */
export function ProfileSecurityTab({
  password,
  passkeys,
}: {
  password: ProfilePassword;
  passkeys: ProfilePasskeys;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">Face ID / empreinte</h2>
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          Sur iPhone ou Android, activez une fois ici : ensuite la connexion pourra se faire sans retaper le mot de
          passe.
        </p>
        {!passkeys.supported ? (
          <Callout variant="info">
            Ce navigateur ne propose pas Face ID / empreinte. Ouvrez ImmoPilot depuis Safari (iPhone) ou Chrome
            (Android), sur le vrai téléphone.
          </Callout>
        ) : (
          <div className="space-y-3">
            <Button
              type="button"
              variant="secondary"
              disabled={passkeys.busy}
              loading={passkeys.busy}
              onClick={() => void passkeys.registerCurrentDevice()}
            >
              {passkeys.busy ? 'Activation…' : 'Activer sur cet appareil'}
            </Button>
            {passkeys.loading ? (
              <p className="text-xs text-[var(--color-muted)]">Chargement des appareils…</p>
            ) : passkeys.devices.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)]">Aucun appareil enregistré pour l’instant.</p>
            ) : (
              <ul className="divide-y divide-[var(--odoo-border)] rounded-[var(--radius-card)] border border-[var(--odoo-border)]">
                {passkeys.devices.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--color-ink)]">{d.friendlyName || 'Appareil'}</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        Ajouté le {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                        {d.lastUsedAt
                          ? ` · dernier usage ${new Date(d.lastUsedAt).toLocaleDateString('fr-FR')}`
                          : ''}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={passkeys.busy}
                      onClick={() => void passkeys.removeDevice(d.id)}
                    >
                      Retirer
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {passkeys.err ? <Callout variant="danger">{passkeys.err}</Callout> : null}
            {passkeys.ok ? <Callout variant="success">{passkeys.ok}</Callout> : null}
          </div>
        )}
      </div>

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
