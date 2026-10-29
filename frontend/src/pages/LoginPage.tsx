import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { AuthShell } from '@/components/AuthShell';
import { InstallAppButton } from '@/components/InstallAppButton';
import { Button, Callout, Field, Input, Label } from '@/components/ui/index';
import { supportsPlatformPasskey } from '@/lib/webauthn';

export function LoginPage() {
  const { user, ready, login, loginWithPasskey } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const passkeyOk = supportsPlatformPasskey();

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

  async function onPasskeyLogin() {
    setErr(null);
    if (!email.trim()) {
      setErr('Indiquez d’abord votre e-mail, puis utilisez Face ID.');
      return;
    }
    setPasskeyLoading(true);
    try {
      await loginWithPasskey(email.trim());
    } catch (e2) {
      const name = e2 instanceof Error ? e2.name : '';
      if (name === 'NotAllowedError' || name === 'AbortError') {
        setErr('Face ID annulé.');
      } else {
        setErr(e2 instanceof Error ? e2.message : 'Connexion Face ID impossible');
      }
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <AuthShell panelLead="Vos biens, vos locataires et vos loyers — au même endroit.">
      <div className="auth-panel">
        <div className="auth-panel__accent" aria-hidden />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Espace sécurisé
          </p>
          <h2 className="auth-shell__wordmark mt-2 text-[1.85rem] font-bold tracking-tight text-[var(--color-ink)] sm:text-[2rem]">
            Connexion
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Entrez vos identifiants pour ouvrir votre tableau de bord.
          </p>
        </div>

        <form onSubmit={onSubmit} className="relative mt-8 space-y-5" autoComplete="on">
          <Field label="E-mail" htmlFor="email" required>
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
              className="auth-field mt-0 min-h-12 text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="login-email"
            />
          </Field>

          <div>
            <div className="mb-0 flex items-center justify-between gap-2">
              <Label htmlFor="password" className="mb-0">
                Mot de passe
              </Label>
              <Link
                to="/mot-de-passe-oubli"
                className="text-xs font-semibold text-[var(--color-muted)] underline-offset-2 transition hover:text-[var(--color-ink)] hover:underline"
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
                className="auth-field mt-0 min-h-12 pr-[4.5rem] text-base"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[var(--radius-control)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-muted)] transition hover:bg-[var(--odoo-row-hover)] hover:text-[var(--color-ink)]"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? 'Masquer' : 'Voir'}
              </button>
            </div>
          </div>

          {err ? (
            <Callout variant="danger" title="Connexion impossible">
              {err}
            </Callout>
          ) : null}

          <Button
            type="submit"
            size="lg"
            loading={loading}
            disabled={passkeyLoading}
            className="auth-submit w-full text-base font-semibold tracking-wide"
            data-testid="login-submit"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>

          {passkeyOk ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full text-base font-semibold"
              loading={passkeyLoading}
              disabled={loading}
              onClick={() => void onPasskeyLogin()}
              data-testid="login-passkey"
            >
              {passkeyLoading ? 'Face ID…' : 'Face ID / empreinte'}
            </Button>
          ) : null}
        </form>

        <div className="relative mt-6 border-t border-[var(--odoo-border)] pt-5">
          <InstallAppButton variant="auth" />
        </div>

        <details className="relative mt-5 text-xs text-[var(--color-muted)]">
          <summary className="cursor-pointer list-none font-medium underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">
            Accès téléphone (réseau local)
          </summary>
          <p className="mt-2 leading-relaxed">
            Sur le même Wi‑Fi que le PC, ouvrez l’URL affichée au démarrage du front, par ex.{' '}
            <code className="rounded bg-[var(--odoo-table-head-bg)] px-1">http://IP:5173</code>.
          </p>
        </details>
      </div>
    </AuthShell>
  );
}
