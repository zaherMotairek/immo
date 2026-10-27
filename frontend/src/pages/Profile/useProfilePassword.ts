import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/lib/api';

/** Changement de mot de passe (POST /auth/change-password). */
export function useProfilePassword() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [pwdOk, setPwdOk] = useState(false);

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

  return {
    user,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    pwdSaving,
    pwdErr,
    pwdOk,
    onChangePassword,
  };
}

export type ProfilePassword = ReturnType<typeof useProfilePassword>;
