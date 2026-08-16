import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthShell } from '@/components/AuthShell';
import { api } from '@/lib/api';
import { Button, Input, Label } from '@/components/ui';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMessage(null);
    setDevResetUrl(null);
    setLoading(true);
    try {
      const res = await api<{
        ok: boolean;
        message: string;
        mailSimulated?: boolean;
        devResetUrl?: string;
      }>('/auth/forgot-password', {
        method: 'POST',
        json: { email: email.trim() },
      });
      setMessage(res.message);
      if (res.mailSimulated && res.devResetUrl) {
        setDevResetUrl(res.devResetUrl);
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Envoi impossible');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'auth-field mt-2 min-h-12 rounded-xl border-zinc-300/80 bg-white/90 text-base shadow-none dark:border-zinc-500 dark:bg-zinc-800/90';

  return (
    <AuthShell panelLead="Réinitialisez l’accès à votre espace en quelques secondes.">
      <div className="auth-panel">
        <div className="auth-panel__accent" aria-hidden />
        <div className="relative">
          <h2 className="auth-shell__wordmark text-[1.85rem] font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Mot de passe oublié
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Indiquez l’e-mail du compte. S’il existe, un lien valable 1 h vous sera proposé.
          </p>
        </div>

        <form onSubmit={onSubmit} className="relative mt-8 space-y-5" autoComplete="on">
          <div>
            <Label htmlFor="forgot-email">E-mail</Label>
            <Input
              id="forgot-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {err ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200/90 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-950/35 dark:text-red-200"
            >
              {err}
            </div>
          ) : null}
          {message ? (
            <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-300" role="status">
              {message}
            </p>
          ) : null}
          {devResetUrl ? (
            <div
              className="rounded-xl border border-amber-300/80 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
              role="region"
              aria-label="Mode développement — lien de réinitialisation"
            >
              <p className="font-semibold">E-mail non envoyé (SMTP désactivé ou en erreur)</p>
              <p className="mt-1">En local, utilisez ce lien direct (valide 1 h) :</p>
              <a
                href={devResetUrl}
                className="mt-2 block break-all font-medium text-zinc-900 underline underline-offset-2 dark:text-amber-100"
              >
                {devResetUrl}
              </a>
            </div>
          ) : null}
          <Button type="submit" className="auth-submit min-h-12 w-full text-base font-semibold" disabled={loading}>
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </Button>
        </form>

        <p className="relative mt-6">
          <Link
            to="/login"
            className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
