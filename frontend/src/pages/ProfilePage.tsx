import { useEffect, useState } from 'react';
import { useAuth, type AuthUser } from '@/auth/AuthContext';
import { AppPageTitle } from '@/components/AppPageTitle';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { api } from '@/lib/api';
import { Button, Card, HelpHint, Input, Label } from '@/components/ui';

export function ProfilePage() {
  useRegisterRootSectionFallback();
  const { user, applyUser } = useAuth();
  const [userName, setUserName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!user) return;
    setUserName(user.name ?? '');
    setOrganizationName(user.organizationName ?? '');
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setErr(null);
    setOk(false);
    setSaving(true);
    try {
      const updated = await api<AuthUser>('/auth/profile', {
        method: 'PATCH',
        json: { userName, organizationName },
      });
      applyUser(updated);
      setOk(true);
      window.setTimeout(() => setOk(false), 4000);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AppPageTitle
        className="max-w-3xl"
        iconTo="/profil"
        title="Profil"
        hintTitle="Identité du compte et nom affiché comme bailleur sur les quittances et reçus PDF."
      />

      <Card className="max-w-lg">
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <Label htmlFor="profile-email">E-mail</Label>
            <Input id="profile-email" type="email" className="mt-1" value={user?.email ?? ''} readOnly disabled />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Non modifiable depuis cette page.</p>
          </div>

          <div>
            <Label htmlFor="profile-name">Votre nom (affichage)</Label>
            <Input
              id="profile-name"
              name="userName"
              autoComplete="name"
              className="mt-1"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Ex. Marie Kouassi"
            />
          </div>

          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Label htmlFor="profile-org" className="mb-0">
                Nom du bailleur (reçus PDF)
              </Label>
              <HelpHint
                className="align-middle"
                title="Ce texte apparaît comme émetteur sur les quittances de loyer. Indiquez votre nom ou celui de votre société selon ce que vous souhaitez voir sur les documents."
              />
            </div>
            <Input
              id="profile-org"
              name="organizationName"
              className="mt-1"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Ex. M. Jean Dupont ou SCI Les Palmiers"
            />
          </div>

          {err ? (
            <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
              {err}
            </p>
          ) : null}
          {ok ? (
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400" role="status">
              Modifications enregistrées.
            </p>
          ) : null}

          <Button type="submit" disabled={saving || !user}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
