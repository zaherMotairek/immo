import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button, Card, Input, Label } from '@/components/ui';
import { AUTH_CARD_CLASS, AUTH_PAGE_SHELL_CLASS, authSafePaddingStyle, authThemeTogglePositionStyle } from '@/lib/authLayout';

export function LoginPage() {
  const { user, ready, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className={AUTH_PAGE_SHELL_CLASS} style={authSafePaddingStyle}>
      <div className="absolute sm:right-6 sm:top-6" style={authThemeTogglePositionStyle}>
        <ThemeToggle tone="onLight" />
      </div>
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 text-center sm:mb-8">
          <div className="mx-auto mb-4 flex justify-center">
            <span className="h-1 w-14 rounded-full bg-gradient-to-r from-sky-400 to-brand-600" aria-hidden />
          </div>
          <p className="mb-2 inline-block rounded-full border border-brand-500/30 bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-800 dark:border-brand-500/40 dark:bg-brand-950/50 dark:text-brand-200">
            Gestion locative
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">ImmoPilot</h1>
          <p className="mx-auto mt-2 max-w-[24rem] text-base font-medium leading-snug text-slate-800 dark:text-slate-100">
            Vos biens, vos locataires et vos loyers — au même endroit, sans jargon inutile.
          </p>
          <p className="mx-auto mt-2 max-w-[22rem] text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Connectez-vous : le tableau de bord vous indique quoi encaisser en priorité ; le menu tient en quelques
            raccourcis.
          </p>
          <p className="mx-auto mt-4 max-w-[22rem] text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Depuis le téléphone sur le même réseau que le PC : utilisez l’URL affichée au démarrage du front (ex.{' '}
            <code className="rounded bg-slate-200/80 px-1 dark:bg-slate-700">http://IP:5173</code>).
          </p>
        </div>
        <Card className={AUTH_CARD_CLASS}>
          <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
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
                spellCheck={false}
                enterKeyHint="next"
                className="min-h-11 text-base"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                enterKeyHint="go"
                className="min-h-11 text-base"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
            <Button type="submit" className="min-h-11 w-full text-base font-semibold" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </Button>
            <p className="text-center">
              <Link
                to="/mot-de-passe-oubli"
                className="text-sm font-semibold text-brand-700 underline-offset-[3px] transition hover:text-brand-800 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
              >
                Mot de passe oublié ?
              </Link>
            </p>
          </form>
        </Card>
        <p className="mt-6 text-center text-xs text-slate-600 dark:text-slate-300">
          Première installation ? Côté serveur, lancez <code className="rounded bg-slate-200 px-1 font-medium text-slate-900 dark:bg-slate-700 dark:text-slate-100">npm run seed</code> pour créer un compte de démonstration.
        </p>
      </div>
    </div>
  );
}
