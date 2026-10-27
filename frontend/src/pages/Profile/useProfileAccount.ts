import { useEffect, useState } from 'react';
import { useAuth, type AuthUser } from '@/auth/AuthContext';
import { api } from '@/lib/api';

/** Formulaire identité / organisation (PATCH /auth/profile). */
export function useProfileAccount() {
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

  return {
    user,
    userName,
    setUserName,
    organizationName,
    setOrganizationName,
    saving,
    err,
    ok,
    onSubmit,
  };
}

export type ProfileAccount = ReturnType<typeof useProfileAccount>;
