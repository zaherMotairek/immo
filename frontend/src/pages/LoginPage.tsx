import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button, Card, Input, Label } from '@/components/ui';

export function LoginPage() {
  const { user, ready, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div
      className="relative flex min-h-dvh flex-col justify-center bg-gradient-to-br from-slate-200/95 via-[#eceff4] to-slate-200/90 px-4 py-8 dark:from-slate-950 dark:via-[#0b0c0f] dark:to-slate-950 sm:py-10"
      style={{
        paddingTop: 'max(2rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div
        className="absolute sm:right-6 sm:top-6"
        style={{ top: 'max(1rem, env(safe-area-inset-top, 0px))', right: 'max(1rem, env(safe-area-inset-right, 0px))' }}
      >
        <ThemeToggle />
      </div>
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center sm:mb-8">
          <div className="mx-auto mb-4 flex justify-center">
            <span className="h-1 w-14 rounded-full bg-gradient-to-r from-sky-400 to-brand-600" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">ImmoPilot</h1>
          <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">Espace connecté</p>
          <p className="mx-auto mt-3 max-w-[22rem] text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            Sur téléphone : même compte e-mail et mot de passe qu’en bureau. Connectez-vous au{' '}
            <strong className="font-semibold text-slate-800 dark:text-slate-200">même Wi‑Fi</strong> que l’ordinateur qui
            lance l’application, puis ouvrez{' '}
            <strong className="font-semibold text-slate-800 dark:text-slate-200">
              http://&lt;adresse IP du PC&gt;:5173
            </strong>{' '}
            (adresse affichée au démarrage du front dans le terminal).
          </p>
        </div>
        <Card className="shadow-md ring-1 ring-slate-900/[0.05] dark:ring-slate-600/30">
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
          </form>
        </Card>
        <p className="mt-6 text-center text-xs text-slate-600 dark:text-slate-300">
          Compte de test : ex.{' '}
          <code className="rounded bg-slate-200 px-1 font-medium text-slate-900 dark:bg-slate-700 dark:text-slate-100">npm run seed</code> côté API.
          Sur base vide, un jeu de démo (Abidjan, Grand-Bassam…) est créé automatiquement.
        </p>
      </div>
    </div>
  );
}
