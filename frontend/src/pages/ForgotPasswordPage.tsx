import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthBrandMark } from '@/components/AuthBrandMark';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api } from '@/lib/api';
import { AUTH_CARD_CLASS, AUTH_PAGE_SHELL_CLASS, authSafePaddingStyle, authThemeTogglePositionStyle } from '@/lib/authLayout';
import { Button, Card, Input, Label } from '@/components/ui';

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

  return (
    <div className={AUTH_PAGE_SHELL_CLASS} style={authSafePaddingStyle}>
      <div className="absolute sm:right-6 sm:top-6" style={authThemeTogglePositionStyle}>
        <ThemeToggle tone="onLight" />
      </div>
      <div className="mx-auto w-full max-w-md">
        <AuthBrandMark />
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[1.65rem]">
            Mot de passe oublié
          </h1>
          <p className="mx-auto mt-2 max-w-[22rem] text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Saisissez l’e-mail de votre compte. Si un compte existe, vous recevrez un lien pour choisir un nouveau mot de passe
            (valide 1 h).
          </p>
        </div>
        <Card className={AUTH_CARD_CLASS}>
          <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
            <div>
              <Label htmlFor="forgot-email">E-mail</Label>
              <Input
                id="forgot-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                className="mt-1 min-h-11 text-base"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {err ? <p className="text-sm text-red-600 dark:text-red-400">{err}</p> : null}
            {message ? (
              <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-300" role="status">
                {message}
              </p>
            ) : null}
            {devResetUrl ? (
              <div
                className="rounded-lg border border-amber-300/80 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
                role="region"
                aria-label="Mode développement — lien de réinitialisation"
              >
                <p className="font-semibold">E-mail non envoyé (SMTP désactivé ou en erreur)</p>
                <p className="mt-1">
                  En local, utilisez ce lien direct (valide 1 h) — il n’apparaît pas en production :
                </p>
                <a
                  href={devResetUrl}
                  className="mt-2 block break-all font-medium text-brand-800 underline underline-offset-2 dark:text-brand-300"
                >
                  {devResetUrl}
                </a>
                <p className="mt-2 text-[11px] opacity-90">
                  Vérifiez aussi dans le terminal où tourne l’API : le même lien est souvent loggé.
                </p>
              </div>
            ) : null}
            <Button type="submit" className="min-h-11 w-full text-base font-semibold" disabled={loading}>
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </Button>
          </form>
        </Card>
        <p className="mt-6 text-center text-sm">
          <Link
            to="/login"
            className="font-semibold text-brand-700 underline-offset-[3px] transition hover:text-brand-800 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
          >
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
