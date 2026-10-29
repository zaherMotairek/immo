import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { runPasskeyRegistration, supportsPlatformPasskey } from '@/lib/webauthn';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';

export type PasskeyDevice = {
  id: string;
  friendlyName: string | null;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

/** Gestion Face ID / empreinte / passkey dans Mon compte → Sécurité. */
export function useProfilePasskeys(enabled: boolean) {
  const supported = supportsPlatformPasskey();
  const [devices, setDevices] = useState<PasskeyDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setErr(null);
    try {
      const list = await api<PasskeyDevice[]>('/auth/webauthn/credentials');
      setDevices(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Impossible de charger les appareils.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  async function registerCurrentDevice() {
    setErr(null);
    setOk(null);
    if (!supported) {
      setErr('Face ID / empreinte non disponible sur ce navigateur.');
      return;
    }
    setBusy(true);
    try {
      const options = await api<PublicKeyCredentialCreationOptionsJSON>('/auth/webauthn/register/options', {
        method: 'POST',
      });
      const response = await runPasskeyRegistration(options);
      const label =
        typeof navigator !== 'undefined' && /iPhone|iPad/i.test(navigator.userAgent)
          ? 'iPhone (Face ID)'
          : typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
            ? 'Android (empreinte)'
            : `Cet appareil · ${new Date().toLocaleDateString('fr-FR')}`;
      await api('/auth/webauthn/register/verify', {
        method: 'POST',
        json: { response, friendlyName: label },
      });
      setOk('Face ID / empreinte activé sur cet appareil.');
      await load();
    } catch (e) {
      const name = e instanceof Error ? e.name : '';
      if (name === 'NotAllowedError' || name === 'AbortError') {
        setErr('Enregistrement annulé.');
      } else {
        setErr(e instanceof Error ? e.message : 'Activation impossible.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeDevice(id: string) {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      await api(`/auth/webauthn/credentials/${id}`, { method: 'DELETE' });
      setOk('Appareil retiré.');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Suppression impossible.');
    } finally {
      setBusy(false);
    }
  }

  return {
    supported,
    devices,
    loading,
    busy,
    err,
    ok,
    registerCurrentDevice,
    removeDevice,
    reload: load,
  };
}

export type ProfilePasskeys = ReturnType<typeof useProfilePasskeys>;
