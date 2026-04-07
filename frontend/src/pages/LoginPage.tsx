import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
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
    <div className="flex min-h-dvh flex-col justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">ImmoPilot</h1>
          <p className="mt-1 text-sm text-slate-600">Connexion gestionnaire</p>
        </div>
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        </Card>
        <p className="mt-6 text-center text-xs text-slate-500">
          Compte : <code className="rounded bg-slate-200 px-1">npm run seed</code> côté API. Sur base vide, un jeu de démo
          (Abidjan, Grand-Bassam…) est créé automatiquement.
        </p>
      </div>
    </div>
  );
}
