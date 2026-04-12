import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getStoredUser, getToken, setStoredUser, setToken } from '@/lib/api';

type User = { id: string; email: string; name: string | null; organizationId?: string };

type AuthState = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = getToken();
    const u = getStoredUser();
    if (t && !u) {
      setToken(null);
      setUser(null);
    } else if (t && u) {
      setUser(u);
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

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      json: { email, password },
    });
    setToken(res.accessToken);
    setStoredUser(res.user);
    setUser(res.user);
    navigate('/', { replace: true });
  }, [navigate]);

  const logout = useCallback(() => {
    setToken(null);
    setStoredUser(null);
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({ user: getToken() ? user : null, ready, login, logout }),
    [user, ready, login, logout],
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
