import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { ApiError, api, getStoredUser, getToken, setStoredUser, setToken } from '@/lib/api';
import { runPasskeyAuthentication } from '@/lib/webauthn';

export type AuthUserRole = 'USER' | 'PLATFORM_ADMIN';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  organizationId: string;
  organizationName: string | null;
  role: AuthUserRole;
};

type AuthState = {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Connexion Face ID / empreinte (après activation dans Mon compte). */
  loginWithPasskey: (email: string) => Promise<void>;
  logout: () => void;
  applyUser: (u: AuthUser) => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  const applyUser = useCallback((u: AuthUser) => {
    setStoredUser(u);
    setUser(u);
  }, []);

  useEffect(() => {
    const t = getToken();
    const u = getStoredUser();
    if (t && !u) {
      setToken(null);
      setUser(null);
    } else if (t && u) {
      setUser({
        id: u.id,
        email: u.email,
        name: u.name,
        organizationId: u.organizationId ?? '',
        organizationName: u.organizationName ?? null,
        role: u.role ?? 'USER',
      });
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const onOut = () => {
      setUser(null);
      navigate('/login', { replace: true });
    };
    window.addEventListener('immopilot:logout', onOut);
    return () => window.removeEventListener('immopilot:logout', onOut);
  }, [navigate]);

  useEffect(() => {
    if (!ready) return;
    const t = getToken();
    if (!t) return;
    let cancelled = false;
    (async () => {
      try {
        const u = await api<AuthUser>('/auth/profile');
        if (!cancelled) applyUser(u);
      } catch (e) {
        if (!cancelled && e instanceof ApiError && e.status === 403) {
          setToken(null);
          setStoredUser(null);
          setUser(null);
          navigate('/login', { replace: true, state: { accessDenied: e.message } });
        }
        /* 401 géré par api */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, applyUser, navigate]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ accessToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      json: { email, password },
    });
    setToken(res.accessToken);
    applyUser(res.user);
    navigate('/', { replace: true });
  }, [navigate, applyUser]);

  const loginWithPasskey = useCallback(
    async (email: string) => {
      const options = await api<PublicKeyCredentialRequestOptionsJSON>('/auth/webauthn/login/options', {
        method: 'POST',
        json: { email },
      });
      const response = await runPasskeyAuthentication(options);
      const res = await api<{ accessToken: string; user: AuthUser }>('/auth/webauthn/login/verify', {
        method: 'POST',
        json: { email, response },
      });
      setToken(res.accessToken);
      applyUser(res.user);
      navigate('/', { replace: true });
    },
    [navigate, applyUser],
  );

  const logout = useCallback(() => {
    setToken(null);
    setStoredUser(null);
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({ user: getToken() ? user : null, ready, login, loginWithPasskey, logout, applyUser }),
    [user, ready, login, loginWithPasskey, logout, applyUser],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Hook associé au provider — export volontairement dans ce fichier. */
// eslint-disable-next-line react-refresh/only-export-components -- couple Provider / hook
export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth');
  return v;
}
