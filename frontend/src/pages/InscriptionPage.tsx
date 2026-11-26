import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button, Callout, Field, Input } from '@/components/ui/index';
import { toast } from '@/components/ui/Toast';

/** Self-signup D5 (derrière flag SELF_SIGNUP_ENABLED). */
export function InscriptionPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [orgName, setOrgName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api<{ enabled: boolean }>('/auth/signup-status')
      .then((r) => setEnabled(r.enabled))
      .catch(() => setEnabled(false));
  }, []);

  if (enabled === false) {
    return <Navigate to="/login" replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await api<{ message: string; devVerifyUrl?: string }>('/auth/register', {
        method: 'POST',
        json: {
          organizationName: orgName.trim(),
          ownerName: ownerName.trim(),
          email: email.trim(),
          password,
          acceptTerms,
        },
      });
      setDone(true);
      toast(res.message, { variant: 'success' });
      if (res.devVerifyUrl) {
        toast(`Dev — ${res.devVerifyUrl}`, { variant: 'info', duration: 20000 });
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Inscription impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">Créer mon compte</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Essai 14 jours. Mot de passe fort requis. Confirmez votre e-mail avant de vous connecter.
        </p>
      </div>
      {done ? (
        <Callout variant="success" title="Vérifiez votre boîte mail">
          <p>Un lien d’activation a été envoyé. Ensuite : page de connexion.</p>
          <Link to="/login" className="mt-2 inline-block font-semibold underline">
            Aller à la connexion
          </Link>
        </Callout>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <Field label="Nom de votre société / cabinet" htmlFor="reg-org" required>
            <Input id="reg-org" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
          </Field>
          <Field label="Votre nom" htmlFor="reg-name" required>
            <Input id="reg-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
          </Field>
          <Field label="E-mail" htmlFor="reg-email" required>
            <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field
            label="Mot de passe"
            htmlFor="reg-pwd"
            required
            hint="10+ caractères, majuscule, minuscule, chiffre."
          >
            <Input
              id="reg-pwd"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              required
            />
            <span>
              J’accepte les{' '}
              <Link to="/cgu" className="underline" target="_blank" rel="noreferrer">
                CGU
              </Link>{' '}
              et la{' '}
              <Link to="/confidentialite" className="underline" target="_blank" rel="noreferrer">
                politique de confidentialité
              </Link>
              .
            </span>
          </label>
          {err ? <Callout variant="danger">{err}</Callout> : null}
          <Button type="submit" disabled={busy || enabled === null}>
            {busy ? 'Création…' : 'Créer mon compte'}
          </Button>
        </form>
      )}
      <p className="text-sm text-[var(--color-muted)]">
        <Link to="/login" className="font-semibold underline">
          Connexion
        </Link>
        {' · '}
        <Link to="/demo" className="font-semibold underline">
          Mode démo
        </Link>
      </p>
    </div>
  );
}
