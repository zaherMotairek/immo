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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [pwdOk, setPwdOk] = useState(false);

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

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setPwdErr(null);
    setPwdOk(false);
    if (newPassword.length < 8) {
      setPwdErr('Le nouveau mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdErr('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }
    setPwdSaving(true);
    try {
      await api<{ ok: boolean }>('/auth/change-password', {
        method: 'POST',
        json: { currentPassword, newPassword },
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdOk(true);
      window.setTimeout(() => setPwdOk(false), 5000);
    } catch (e2) {
      setPwdErr(e2 instanceof Error ? e2.message : 'Changement impossible.');
    } finally {
      setPwdSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AppPageTitle
        className="max-w-3xl"
        iconTo="/profil"
        title="Profil"
        subtitle="Identité du compte, nom sur les PDF et changement de mot de passe."
        hintTitle="Identité du compte et nom affiché comme bailleur sur les quittances et reçus PDF."
      />

      <Card className="max-w-lg border-slate-200/90 bg-slate-50/50 dark:border-slate-600/50 dark:bg-slate-900/40">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Compte & confidentialité</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Si un accès vous a été communiqué (e-mail et mot de passe provisoire), vous pouvez{' '}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">changer le mot de passe</strong> ci-dessous :
          après modification, <strong className="font-semibold text-slate-800 dark:text-slate-200">vous seul</strong> le
          connaissez — c’est le fonctionnement normal d’un compte personnel. La personne qui a créé le compte ne voit pas
          votre nouveau mot de passe. Si vous êtes déconnecté et avez oublié le mot de passe, utilisez « Mot de passe oublié
          ? » sur l’écran de connexion : un lien vous sera envoyé par e-mail (pensez à configurer SMTP en production).
        </p>
      </Card>

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

      <Card className="max-w-lg">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Mot de passe</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Minimum 8 caractères. Utilisez un mot de passe que vous ne partagez pas ailleurs.
        </p>
        <form onSubmit={onChangePassword} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="profile-current-pwd">Mot de passe actuel</Label>
            <Input
              id="profile-current-pwd"
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              className="mt-1"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="profile-new-pwd">Nouveau mot de passe</Label>
            <Input
              id="profile-new-pwd"
              type="password"
              name="newPassword"
              autoComplete="new-password"
              className="mt-1"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="profile-confirm-pwd">Confirmer le nouveau mot de passe</Label>
            <Input
              id="profile-confirm-pwd"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              className="mt-1"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {pwdErr ? (
            <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
              {pwdErr}
            </p>
          ) : null}
          {pwdOk ? (
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400" role="status">
              Mot de passe mis à jour. Pensez à le noter en lieu sûr.
            </p>
          ) : null}
          <Button type="submit" variant="secondary" disabled={pwdSaving || !user}>
            {pwdSaving ? 'Mise à jour…' : 'Changer le mot de passe'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
