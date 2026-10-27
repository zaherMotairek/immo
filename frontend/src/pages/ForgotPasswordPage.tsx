import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthShell } from '@/components/AuthShell';
import { api } from '@/lib/api';
import { Button, Callout, Field, Input } from '@/components/ui/index';

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
    <AuthShell panelLead="Réinitialisez l’accès à votre espace en quelques secondes.">
      <div className="auth-panel">
        <div className="auth-panel__accent" aria-hidden />
        <div className="relative">
          <h2 className="auth-shell__wordmark text-[1.85rem] font-bold tracking-tight text-[var(--color-ink)]">
            Mot de passe oublié
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Indiquez l’e-mail du compte. S’il existe, un lien valable 1 h vous sera proposé.
          </p>
        </div>

        <form onSubmit={onSubmit} className="relative mt-8 space-y-5" autoComplete="on">
          <Field label="E-mail" htmlFor="forgot-email" required>
            <Input
              id="forgot-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              className="auth-field mt-0 min-h-12 text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          {err ? (
            <Callout variant="danger" title="Envoi impossible">
              {err}
            </Callout>
          ) : null}
          {message ? (
            <Callout variant="success">
              <span role="status">{message}</span>
            </Callout>
          ) : null}
          {devResetUrl ? (
            <Callout
              variant="warning"
              title="E-mail non envoyé (SMTP désactivé ou en erreur)"
            >
              <p>En local, utilisez ce lien direct (valide 1 h) :</p>
              <a
                href={devResetUrl}
                className="mt-2 block break-all font-medium text-[var(--color-ink)] underline underline-offset-2"
              >
                {devResetUrl}
              </a>
            </Callout>
          ) : null}
          <Button type="submit" size="lg" loading={loading} className="auth-submit w-full text-base font-semibold">
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </Button>
        </form>

        <p className="relative mt-6">
          <Link
            to="/login"
            className="text-sm font-medium text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
          >
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
