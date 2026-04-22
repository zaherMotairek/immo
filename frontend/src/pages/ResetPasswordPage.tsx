import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthBrandMark } from '@/components/AuthBrandMark';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api } from '@/lib/api';
import { AUTH_CARD_CLASS, AUTH_PAGE_SHELL_CLASS, authSafePaddingStyle, authThemeTogglePositionStyle } from '@/lib/authLayout';
import { Button, Card, Input, Label } from '@/components/ui';

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
    <div className={AUTH_PAGE_SHELL_CLASS} style={authSafePaddingStyle}>
      <div className="absolute sm:right-6 sm:top-6" style={authThemeTogglePositionStyle}>
        <ThemeToggle tone="onLight" />
      </div>
      <div className="mx-auto w-full max-w-md">
        <AuthBrandMark />
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[1.65rem]">
            Nouveau mot de passe
          </h1>
          <p className="mx-auto mt-2 max-w-[22rem] text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Au moins 8 caractères. Le lien reçu par e-mail expire au bout d’une heure.
          </p>
        </div>
        {ok ? (
          <Card className={AUTH_CARD_CLASS}>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300" role="status">
              Mot de passe mis à jour. Vous pouvez vous connecter avec votre nouvel identifiant.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Aller à la connexion
            </Link>
          </Card>
        ) : (
          <Card className={AUTH_CARD_CLASS}>
            <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
              {!token ? (
                <p className="text-sm text-amber-800 dark:text-amber-300" role="alert">
                  Aucun jeton dans l’URL. Utilisez le lien « Réinitialiser » reçu par e-mail, ou refaites une demande depuis la page
                  « Mot de passe oublié ».
                </p>
              ) : null}
              <div>
                <Label htmlFor="reset-new">Nouveau mot de passe</Label>
                <Input
                  id="reset-new"
                  type="password"
                  name="newPassword"
                  autoComplete="new-password"
                  className="mt-1 min-h-11 text-base"
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
                  className="mt-1 min-h-11 text-base"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              {err ? <p className="text-sm text-red-600 dark:text-red-400">{err}</p> : null}
              <Button type="submit" className="min-h-11 w-full text-base font-semibold" disabled={loading || !token}>
                {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
              </Button>
            </form>
          </Card>
        )}
        <p className="mt-6 text-center text-sm">
          <Link
            to="/login"
            className="font-semibold text-brand-700 underline-offset-[3px] transition hover:text-brand-800 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
          >
            ← Connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
