import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthShell } from '@/components/AuthShell';
import { api } from '@/lib/api';
import { Button, Input, Label } from '@/components/ui';

const inputClass =
  'auth-field mt-2 min-h-12 rounded-xl border-zinc-300/80 bg-white/90 text-base shadow-none dark:border-zinc-500 dark:bg-zinc-800/90';

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
          <h2 className="auth-shell__wordmark text-[1.85rem] font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Nouveau mot de passe
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Au moins 8 caractères. Le lien reçu expire au bout d’une heure.
          </p>
        </div>

        {ok ? (
          <div className="relative mt-8 space-y-4">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300" role="status">
              Mot de passe mis à jour. Vous pouvez vous connecter.
            </p>
            <Link to="/login" className="auth-submit inline-flex min-h-12 w-full items-center justify-center text-base font-semibold">
              Aller à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="relative mt-8 space-y-5" autoComplete="on">
            {!token ? (
              <p
                className="rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/35 dark:text-amber-100"
                role="alert"
              >
                Aucun jeton dans l’URL. Utilisez le lien reçu par e-mail, ou refaites une demande.
              </p>
            ) : null}
            <div>
              <Label htmlFor="reset-new">Nouveau mot de passe</Label>
              <Input
                id="reset-new"
                type="password"
                name="newPassword"
                autoComplete="new-password"
                className={inputClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div>
              <Label htmlFor="reset-confirm">Confirmer</Label>
              <Input
                id="reset-confirm"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                className={inputClass}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
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
            <Button
              type="submit"
              className="auth-submit min-h-12 w-full text-base font-semibold"
              disabled={loading || !token}
            >
              {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </Button>
          </form>
        )}

        <p className="relative mt-6">
          <Link
            to="/login"
            className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← Connexion
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
