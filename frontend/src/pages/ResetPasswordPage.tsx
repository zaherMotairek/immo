import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthShell } from '@/components/AuthShell';
import { api } from '@/lib/api';
import { Button, Callout, Field, Input } from '@/components/ui/index';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!token) {
      setErr('Lien incomplet : ouvrez l’adresse reçue par e-mail en entier.');
      return;
    }
    if (newPassword.length < 8) {
      setErr('Le mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirm) {
      setErr('La confirmation ne correspond pas.');
      return;
    }
    setLoading(true);
    try {
      await api<{ ok: boolean }>('/auth/reset-password-token', {
        method: 'POST',
        json: { token, newPassword },
      });
      setOk(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Réinitialisation impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell panelLead="Choisissez un nouveau mot de passe pour sécuriser votre accès.">
      <div className="auth-panel">
        <div className="auth-panel__accent" aria-hidden />
        <div className="relative">
          <h2 className="auth-shell__wordmark text-[1.85rem] font-bold tracking-tight text-[var(--color-ink)]">
            Nouveau mot de passe
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Au moins 8 caractères. Le lien reçu expire au bout d’une heure.
          </p>
        </div>

        {ok ? (
          <div className="relative mt-8 space-y-4">
            <Callout variant="success">
              <span role="status">Mot de passe mis à jour. Vous pouvez vous connecter.</span>
            </Callout>
            <Link
              to="/login"
              className="auth-submit inline-flex min-h-12 w-full items-center justify-center text-base font-semibold"
            >
              Aller à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="relative mt-8 space-y-5" autoComplete="on">
            {!token ? (
              <Callout variant="warning" title="Lien incomplet">
                Aucun jeton dans l’URL. Utilisez le lien reçu par e-mail, ou refaites une demande.
              </Callout>
            ) : null}
            <Field label="Nouveau mot de passe" htmlFor="reset-new" required>
              <Input
                id="reset-new"
                type="password"
                name="newPassword"
                autoComplete="new-password"
                className="auth-field mt-0 min-h-12 text-base"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
            <Field label="Confirmer" htmlFor="reset-confirm" required>
              <Input
                id="reset-confirm"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                className="auth-field mt-0 min-h-12 text-base"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </Field>
            {err ? (
              <Callout variant="danger" title="Réinitialisation impossible">
                {err}
              </Callout>
            ) : null}
            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="auth-submit w-full text-base font-semibold"
              disabled={!token}
            >
              {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </Button>
          </form>
        )}

        <p className="relative mt-6">
          <Link
            to="/login"
            className="text-sm font-medium text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
          >
            ← Connexion
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
