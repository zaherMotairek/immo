import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { AuthShell } from '@/components/AuthShell';
import { InstallAppButton } from '@/components/InstallAppButton';
import { Button, Input, Label } from '@/components/ui';

export function LoginPage() {
  const { user, ready, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const accessDeniedFlash = (location.state as { accessDenied?: string } | null)?.accessDenied;

  useEffect(() => {
    if (accessDeniedFlash) {
      setErr(accessDeniedFlash);
    }
  }, [accessDeniedFlash]);

  if (ready && user) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell panelLead="Vos biens, vos locataires et vos loyers — au même endroit.">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">Connexion</h2>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">Accédez à votre espace de gestion.</p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-5" autoComplete="on">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            autoFocus
            spellCheck={false}
            enterKeyHint="next"
            className="mt-1.5 min-h-11 rounded-lg border-slate-300/90 bg-white text-base shadow-none dark:border-zinc-500 dark:bg-zinc-800/80"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <Label htmlFor="password" className="mb-0">
              Mot de passe
            </Label>
            <Link
              to="/mot-de-passe-oubli"
              className="text-xs font-medium text-slate-600 underline-offset-2 transition hover:text-slate-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Oublié ?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              enterKeyHint="go"
              className="min-h-11 rounded-lg border-slate-300/90 bg-white pr-16 text-base shadow-none dark:border-zinc-500 dark:bg-zinc-800/80"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-200"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? 'Masquer' : 'Voir'}
            </button>
          </div>
        </div>

        {err ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200/90 bg-red-50 px-3 py-2.5 text-sm leading-snug text-red-800 dark:border-red-800/40 dark:bg-red-950/35 dark:text-red-200"
          >
            {err}
          </div>
        ) : null}

        <Button
          type="submit"
          className="min-h-11 w-full rounded-lg text-base font-semibold tracking-wide"
          disabled={loading}
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>

      <div className="mt-6">
        <InstallAppButton variant="auth" />
      </div>

      <details className="mt-6 text-xs text-slate-500 dark:text-zinc-500">
        <summary className="cursor-pointer list-none font-medium text-slate-600 underline-offset-2 hover:underline dark:text-zinc-400 [&::-webkit-details-marker]:hidden">
          Accès téléphone (réseau local)
        </summary>
        <p className="mt-2 leading-relaxed">
          Sur le même Wi‑Fi que le PC, ouvrez l’URL affichée au démarrage du front, par ex.{' '}
          <code className="rounded bg-slate-200/80 px-1 dark:bg-zinc-700">http://IP:5173</code>.
        </p>
      </details>
    </AuthShell>
  );
}
