import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AdminOrgRow } from './types';

/** Liste orgs, création client, panneau accès (date, suspension, invite, reset MDP). */
export function useAdminClients() {
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

  async function submitResetPassword(userId: string, userEmail: string) {
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
      setResetOk(`Mot de passe réinitialisé pour ${userEmail}. Communiquez-lui : ${pwd}`);
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

  return {
    organizations,
    listLoading,
    listErr,
    organizationName,
    setOrganizationName,
    email,
    setEmail,
    password,
    setPassword,
    ownerName,
    setOwnerName,
    saving,
    err,
    ok,
    editOrg,
    editPaidUntil,
    setEditPaidUntil,
    editSuspended,
    setEditSuspended,
    editSaving,
    editErr,
    inviteEmail,
    setInviteEmail,
    inviteName,
    setInviteName,
    invitePassword,
    setInvitePassword,
    inviteSaving,
    inviteErr,
    inviteOk,
    resetPwdByUser,
    setResetPwdByUser,
    resetSavingUserId,
    resetErr,
    resetOk,
    openEdit,
    closeEdit,
    submitInvite,
    submitResetPassword,
    saveEdit,
    onSubmitCreate,
  };
}

export type AdminClientsState = ReturnType<typeof useAdminClients>;
