import { useCallback, useEffect, useState } from 'react';
import { AppPageTitle } from '@/components/AppPageTitle';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { api } from '@/lib/api';
import { listTableCellClass, listTableDataRowClass, listTableFirstCellClass } from '@/lib/listTableStyles';
import { Button, Card, HelpHint, Input, Label } from '@/components/ui';

type AdminOrgUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

type AdminOrgRow = {
  id: string;
  name: string | null;
  createdAt: string;
  platformAccessPaidUntil: string | null;
  platformAccessSuspended: boolean;
  userCount: number;
  buildingCount: number;
  tenantCount: number;
  users: AdminOrgUser[];
};

export function AdminClientsPage() {
  useRegisterRootSectionFallback();
  const [organizations, setOrganizations] = useState<AdminOrgRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listErr, setListErr] = useState<string | null>(null);

  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [editOrg, setEditOrg] = useState<AdminOrgRow | null>(null);
  const [editPaidUntil, setEditPaidUntil] = useState('');
  const [editSuspended, setEditSuspended] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [inviteOk, setInviteOk] = useState<string | null>(null);

  const [resetPwdByUser, setResetPwdByUser] = useState<Record<string, string>>({});
  const [resetSavingUserId, setResetSavingUserId] = useState<string | null>(null);
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [resetOk, setResetOk] = useState<string | null>(null);

  const loadOrganizations = useCallback(async () => {
    setListErr(null);
    setListLoading(true);
    try {
      const rows = await api<AdminOrgRow[]>('/admin/organizations');
      setOrganizations(rows);
      setEditOrg((prev) => (prev ? rows.find((r) => r.id === prev.id) ?? prev : null));
    } catch (e) {
      setListErr(e instanceof Error ? e.message : 'Liste indisponible');
      setOrganizations([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  function openEdit(o: AdminOrgRow) {
    setEditOrg(o);
    setEditPaidUntil(o.platformAccessPaidUntil ?? '');
    setEditSuspended(o.platformAccessSuspended);
    setEditErr(null);
    setInviteEmail('');
    setInviteName('');
    setInvitePassword('');
    setInviteErr(null);
    setInviteOk(null);
    setResetPwdByUser({});
    setResetErr(null);
    setResetOk(null);
  }

  function closeEdit() {
    setEditOrg(null);
    setEditErr(null);
    setInviteErr(null);
    setInviteOk(null);
    setResetErr(null);
    setResetOk(null);
  }

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!editOrg) return;
    setInviteErr(null);
    setInviteOk(null);
    setInviteSaving(true);
    try {
      const res = await api<{
        email: string;
        temporaryPassword: string;
      }>(`/admin/organizations/${editOrg.id}/users/invite`, {
        method: 'POST',
        json: {
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
          password: invitePassword.trim() || undefined,
        },
      });
      setInviteOk(
        `Compte créé pour ${res.email}. Mot de passe provisoire à lui communiquer : ${res.temporaryPassword}`,
      );
      setInviteEmail('');
      setInviteName('');
      setInvitePassword('');
      await loadOrganizations();
    } catch (e2) {
      setInviteErr(e2 instanceof Error ? e2.message : 'Invitation impossible');
    } finally {
      setInviteSaving(false);
    }
  }

  async function submitResetPassword(userId: string, email: string) {
    if (!editOrg) return;
    const pwd = (resetPwdByUser[userId] ?? '').trim();
    if (pwd.length < 8) {
      setResetErr('Mot de passe : au moins 8 caractères.');
      setResetOk(null);
      return;
    }
    setResetErr(null);
    setResetOk(null);
    setResetSavingUserId(userId);
    try {
      await api(`/admin/organizations/${editOrg.id}/users/${userId}/reset-password`, {
        method: 'POST',
        json: { password: pwd },
      });
      setResetOk(`Mot de passe réinitialisé pour ${email}. Communiquez-lui : ${pwd}`);
      setResetPwdByUser((prev) => ({ ...prev, [userId]: '' }));
    } catch (e2) {
      setResetErr(e2 instanceof Error ? e2.message : 'Réinitialisation impossible');
    } finally {
      setResetSavingUserId(null);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editOrg) return;
    setEditErr(null);
    setEditSaving(true);
    try {
      await api(`/admin/organizations/${editOrg.id}`, {
        method: 'PATCH',
        json: {
          platformAccessPaidUntil: editPaidUntil.trim() === '' ? null : editPaidUntil.trim(),
          platformAccessSuspended: editSuspended,
        },
      });
      await loadOrganizations();
      closeEdit();
    } catch (e2) {
      setEditErr(e2 instanceof Error ? e2.message : 'Enregistrement impossible');
    } finally {
      setEditSaving(false);
    }
  }

  async function onSubmitCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setSaving(true);
    try {
      const res = await api<{
        organizationId: string;
        organizationName: string | null;
        email: string;
      }>('/admin/clients', {
        method: 'POST',
        json: {
          organizationName: organizationName.trim(),
          email: email.trim(),
          password,
          ownerName: ownerName.trim() || undefined,
        },
      });
      setOk(
        `Compte créé pour « ${res.organizationName ?? res.organizationId} » — e-mail de connexion : ${res.email}. Communiquez le mot de passe provisoire au client ; il pourra le changer dans Profil.`,
      );
      setOrganizationName('');
      setEmail('');
      setPassword('');
      setOwnerName('');
      await loadOrganizations();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Création impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <AppPageTitle
        iconTo="/admin"
        title="Clients & accès plateforme"
        hintTitle="Liste des organisations : prolongez l’accès en indiquant « payé jusqu’au » (dernier jour inclus), ou coupez tout accès avec « suspendre ». Sans date, seul le blocage manuel s’applique. Les comptes USER sont bloqués à la connexion et sur toutes les requêtes API ; les administrateurs plateforme ne sont jamais bloqués."
        subtitle="Création des comptes clients et gestion des accès."
      />

      <Card className="!overflow-hidden !p-0">
        <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60 sm:px-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Organisations</h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Comptes clients — contrôle d’accès selon la facturation mensuelle que vous enregistrez ici.
          </p>
        </div>
        <div className="overflow-x-auto">
          {listLoading ? (
            <p className="px-4 py-8 text-sm text-slate-600 dark:text-slate-400">Chargement…</p>
          ) : listErr ? (
            <p className="px-4 py-8 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
              {listErr}
            </p>
          ) : organizations.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-600 dark:text-slate-400">Aucune organisation.</p>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                  <th className="px-4 py-2.5 sm:px-5">Organisation</th>
                  <th className="px-4 py-2.5 sm:px-5">Comptes</th>
                  <th className="whitespace-nowrap px-4 py-2.5 sm:px-5">Payé jusqu’au</th>
                  <th className="px-4 py-2.5 sm:px-5">Statut</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right sm:px-5">Données</th>
                  <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-right sm:px-5"> </th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((o, rowIndex) => (
                  <tr key={o.id} className={listTableDataRowClass(rowIndex)}>
                    <td className={`${listTableFirstCellClass} max-w-[14rem]`}>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{o.name?.trim() || '—'}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Créée le{' '}
                        {new Date(o.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </td>
                    <td className={`${listTableCellClass} max-w-[18rem]`}>
                      <ul className="list-none space-y-0.5 text-xs">
                        {o.users.map((u) => (
                          <li key={u.id}>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{u.email}</span>
                            {u.role === 'PLATFORM_ADMIN' ? (
                              <span className="ml-1 text-[10px] font-bold uppercase text-brand-700 dark:text-brand-400">
                                admin
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className={`whitespace-nowrap tabular-nums ${listTableCellClass}`}>
                      {o.platformAccessPaidUntil
                        ? new Date(`${o.platformAccessPaidUntil}T12:00:00`).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className={listTableCellClass}>
                      {o.platformAccessSuspended ? (
                        <span className="inline-flex rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-900 dark:bg-red-950/60 dark:text-red-200">
                          Suspendu
                        </span>
                      ) : o.platformAccessPaidUntil &&
                        new Date().toISOString().slice(0, 10) > o.platformAccessPaidUntil ? (
                        <span className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-950 dark:bg-amber-950/50 dark:text-amber-200">
                          Expiré
                        </span>
                      ) : (
                        <span className="inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                          Actif
                        </span>
                      )}
                    </td>
                    <td className={`whitespace-nowrap text-right text-xs text-slate-600 dark:text-slate-400 ${listTableCellClass}`}>
                      {o.buildingCount} bien{o.buildingCount !== 1 ? 's' : ''} · {o.tenantCount} locataire
                      {o.tenantCount !== 1 ? 's' : ''}
                    </td>
                    <td className={`text-right ${listTableCellClass}`}>
                      <Button type="button" variant="secondary" className="py-1.5 text-xs" onClick={() => openEdit(o)}>
                        Accès
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {editOrg ? (
        <Card className="max-w-lg border-brand-200/80 dark:border-brand-800/50">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Accès : {editOrg.name?.trim() || editOrg.id}
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Dernier jour <strong>inclus</strong> avec accès. Le lendemain, les utilisateurs de cette organisation ne
            pourront plus se connecter ni utiliser l’API. Laissez vide pour ne pas limiter
            par date.
          </p>
          <form onSubmit={saveEdit} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="edit-paid-until">Payé jusqu’au (date)</Label>
              <Input
                id="edit-paid-until"
                type="date"
                value={editPaidUntil}
                onChange={(e) => setEditPaidUntil(e.target.value)}
                className="mt-1"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={editSuspended}
                onChange={(e) => setEditSuspended(e.target.checked)}
                className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
              />
              Suspendre tout accès (prioritaire sur la date)
            </label>
            {editErr ? (
              <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
                {editErr}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={editSaving}>
                {editSaving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              <Button type="button" variant="secondary" onClick={closeEdit} disabled={editSaving}>
                Annuler
              </Button>
            </div>
          </form>
          <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Réinitialiser un mot de passe</h4>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Définissez un mot de passe provisoire et communiquez-le au client (WhatsApp, etc.). Aucun e-mail n’est
              envoyé.
            </p>
            <ul className="mt-3 space-y-3">
              {editOrg.users
                .filter((u) => u.role !== 'PLATFORM_ADMIN')
                .map((u) => (
                  <li
                    key={u.id}
                    className="rounded-lg border border-slate-200/90 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40"
                  >
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{u.email}</p>
                    {u.name ? <p className="text-[11px] text-slate-500 dark:text-slate-400">{u.name}</p> : null}
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <Label htmlFor={`reset-pwd-${u.id}`}>Nouveau provisoire</Label>
                        <Input
                          id={`reset-pwd-${u.id}`}
                          type="text"
                          autoComplete="off"
                          value={resetPwdByUser[u.id] ?? ''}
                          onChange={(e) =>
                            setResetPwdByUser((prev) => ({ ...prev, [u.id]: e.target.value }))
                          }
                          minLength={8}
                          placeholder="Au moins 8 caractères"
                          className="mt-1"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0"
                        disabled={resetSavingUserId === u.id}
                        onClick={() => void submitResetPassword(u.id, u.email)}
                      >
                        {resetSavingUserId === u.id ? '…' : 'Réinitialiser'}
                      </Button>
                    </div>
                  </li>
                ))}
            </ul>
            {editOrg.users.every((u) => u.role === 'PLATFORM_ADMIN') ? (
              <p className="mt-2 text-xs text-slate-500">Aucun compte client dans cette organisation.</p>
            ) : null}
            {resetErr ? (
              <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
                {resetErr}
              </p>
            ) : null}
            {resetOk ? (
              <p className="mt-2 text-sm font-medium text-emerald-800 dark:text-emerald-300" role="status">
                {resetOk}
              </p>
            ) : null}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Inviter un utilisateur</h4>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Crée un compte pour cette organisation. Vous communiquez le mot de passe provisoire au client.
            </p>
            <form onSubmit={submitInvite} className="mt-3 space-y-3">
              <div>
                <Label htmlFor="invite-email">E-mail</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="invite-name">Nom (optionnel)</Label>
                <Input
                  id="invite-name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="invite-pwd">Mot de passe provisoire (optionnel)</Label>
                <Input
                  id="invite-pwd"
                  type="text"
                  autoComplete="off"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  minLength={8}
                  placeholder="Laisser vide = généré automatiquement"
                />
              </div>
              {inviteErr ? (
                <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
                  {inviteErr}
                </p>
              ) : null}
              {inviteOk ? (
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300" role="status">
                  {inviteOk}
                </p>
              ) : null}
              <Button type="submit" disabled={inviteSaving}>
                {inviteSaving ? 'Invitation…' : 'Inviter utilisateur'}
              </Button>
            </form>
          </div>
        </Card>
      ) : null}

      <Card className="max-w-lg">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Nouveau client</h2>
          <HelpHint title="Crée une organisation vide + un premier utilisateur. Définissez ensuite la date « payé jusqu’au » dans le tableau pour activer le contrôle mensuel." />
        </div>
        <form onSubmit={onSubmitCreate} className="space-y-4">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Label htmlFor="admin-org-name">Nom du bailleur / société (reçus PDF)</Label>
              <HelpHint title="Ce nom apparaît comme émetteur sur les quittances du client. Il pourra le modifier dans Profil." />
            </div>
            <Input
              id="admin-org-name"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Ex. SCI Les Palmiers"
              required
              minLength={1}
              autoComplete="organization"
            />
          </div>
          <div>
            <Label htmlFor="admin-email">E-mail de connexion du client</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="admin-owner">Nom du contact (optionnel)</Label>
            <Input
              id="admin-owner"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Ex. Marie Kouassi"
              autoComplete="name"
            />
          </div>
          <div>
            <Label htmlFor="admin-pwd">Mot de passe provisoire</Label>
            <Input
              id="admin-pwd"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Au moins 8 caractères. Communiquez-le au client ; il pourra le changer dans Profil.
            </p>
          </div>
          {err ? (
            <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
              {err}
            </p>
          ) : null}
          {ok ? (
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300" role="status">
              {ok}
            </p>
          ) : null}
          <Button type="submit" disabled={saving}>
            {saving ? 'Création…' : 'Créer organisation + compte'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
