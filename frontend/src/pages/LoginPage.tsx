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

  const fieldClass =
    'auth-field mt-2 min-h-12 rounded-xl border-zinc-300/80 bg-white/90 text-base shadow-none transition focus:border-amber-500/70 focus:ring-amber-500/25 dark:border-zinc-500 dark:bg-zinc-800/90';

  return (
    <AuthShell panelLead="Vos biens, vos locataires et vos loyers — au même endroit.">
      <div className="auth-panel">
        <div className="auth-panel__accent" aria-hidden />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Espace sécurisé
          </p>
          <h2 className="auth-shell__wordmark mt-2 text-[1.85rem] font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-[2rem]">
            Connexion
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Entrez vos identifiants pour ouvrir votre tableau de bord.
          </p>
        </div>

        <form onSubmit={onSubmit} className="relative mt-8 space-y-5" autoComplete="on">
          <div>
            <Label htmlFor="email" className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
              E-mail
            </Label>
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
              className={fieldClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <div className="mb-0 flex items-center justify-between gap-2">
              <Label htmlFor="password" className="mb-0 text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                Mot de passe
              </Label>
              <Link
                to="/mot-de-passe-oubli"
                className="text-xs font-semibold text-zinc-500 underline-offset-2 transition hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Oublié ?
              </Link>
            </div>
            <div className="relative mt-2">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                enterKeyHint="go"
                className={`${fieldClass} mt-0 pr-[4.5rem]`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? 'Masquer' : 'Voir'}
              </button>
            </div>
          </div>

          {err ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200/90 bg-red-50/95 px-3.5 py-3 text-sm leading-snug text-red-800 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-200"
            >
              {err}
            </div>
          ) : null}

          <Button type="submit" className="auth-submit min-h-12 w-full text-base font-semibold tracking-wide" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>

        <div className="relative mt-6 border-t border-zinc-200/90 pt-5 dark:border-zinc-600/80">
          <InstallAppButton variant="auth" />
        </div>

        <details className="relative mt-5 text-xs text-zinc-500 dark:text-zinc-500">
          <summary className="cursor-pointer list-none font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400 [&::-webkit-details-marker]:hidden">
            Accès téléphone (réseau local)
          </summary>
          <p className="mt-2 leading-relaxed">
            Sur le même Wi‑Fi que le PC, ouvrez l’URL affichée au démarrage du front, par ex.{' '}
            <code className="rounded bg-zinc-200/80 px-1 dark:bg-zinc-700">http://IP:5173</code>.
          </p>
        </details>
      </div>
    </AuthShell>
  );
}
