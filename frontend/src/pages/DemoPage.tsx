import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, type AuthUser } from '@/auth/AuthContext';
import { api, setToken } from '@/lib/api';
import { Button, Callout } from '@/components/ui/index';

/** Entrée publique /demo — sandbox 24 h (D4). */
export function DemoPage() {
  const navigate = useNavigate();
  const { applyUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{
        accessToken: string;
        user: AuthUser & { isDemo?: boolean };
        message: string;
      }>('/demo/session', { method: 'POST' });
      setToken(res.accessToken);
      applyUser({ ...res.user, isDemo: true });
      navigate('/', { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Impossible de démarrer la démo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6 px-4 py-12">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">ImmoPilot</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--color-ink)]">Essayer en mode démo</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Environnement jetable avec données fictives. Aucun e-mail réel n’est envoyé. Les données
          sont effacées après 24 h.
        </p>
      </div>
      {err ? <Callout variant="danger">{err}</Callout> : null}
      <Button type="button" disabled={busy} onClick={() => void start()}>
        {busy ? 'Préparation…' : 'Lancer la démo'}
      </Button>
      <p className="text-sm text-[var(--color-muted)]">
        Déjà un compte ? <Link to="/login" className="font-semibold underline">Connexion</Link>
        {' · '}
        <Link to="/inscription" className="font-semibold underline">
          Créer mon compte
        </Link>
      </p>
    </div>
  );
}
