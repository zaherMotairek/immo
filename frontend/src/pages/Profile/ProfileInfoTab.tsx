import { Button, Callout, Field, Input } from '@/components/ui/index';
import type { ProfileAccount } from './useProfileAccount';

/** Onglet Profil : e-mail (lecture seule), nom affiché, nom bailleur. */
export function ProfileInfoTab({ account }: { account: ProfileAccount }) {
  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">Informations personnelles</h2>
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        Ces champs sont utilisés dans l’application et sur vos documents.
      </p>
      <form onSubmit={account.onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail" htmlFor="profile-email" hint="Non modifiable depuis cette page.">
            <Input id="profile-email" type="email" value={account.user?.email ?? ''} readOnly disabled />
          </Field>
          <Field label="Nom affiché" htmlFor="profile-name">
            <Input
              id="profile-name"
              name="userName"
              autoComplete="name"
              value={account.userName}
              onChange={(e) => account.setUserName(e.target.value)}
              placeholder="Ex. Marie Kouassi"
            />
          </Field>
          <Field
            label="Nom du bailleur (reçus PDF)"
            htmlFor="profile-org"
            hint="Sur les quittances PDF"
            className="sm:col-span-2"
          >
            <Input
              id="profile-org"
              name="organizationName"
              value={account.organizationName}
              onChange={(e) => account.setOrganizationName(e.target.value)}
              placeholder="Ex. M. Jean Dupont ou SCI Les Palmiers"
            />
          </Field>
        </div>
        {account.err ? <Callout variant="danger">{account.err}</Callout> : null}
        {account.ok ? <Callout variant="success">Modifications enregistrées.</Callout> : null}
        <Button type="submit" disabled={account.saving || !account.user}>
          {account.saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </Button>
      </form>
    </div>
  );
}
