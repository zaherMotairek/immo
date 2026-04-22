import { useState } from 'react';
import { AppPageTitle } from '@/components/AppPageTitle';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { api } from '@/lib/api';
import { Button, Card, HelpHint, Input, Label } from '@/components/ui';

export function AdminClientsPage() {
  useRegisterRootSectionFallback();
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setSaving(true);
    try {
      const res = await api<{
        organizationId: string;
        organizationName: string | null;
        email: string;
      }>('/admin/clients', {
        method: 'POST',
        json: {
          organizationName: organizationName.trim(),
          email: email.trim(),
          password,
          ownerName: ownerName.trim() || undefined,
        },
      });
      setOk(
        `Compte créé pour « ${res.organizationName ?? res.organizationId} » — e-mail de connexion : ${res.email}. Communiquez le mot de passe provisoire au client ; il pourra le changer dans Profil.`,
      );
      setOrganizationName('');
      setEmail('');
      setPassword('');
      setOwnerName('');
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Création impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AppPageTitle
        className="max-w-3xl"
        iconTo="/admin"
        title="Créer un client"
        hintTitle="Réservé à l’administrateur plateforme : nouvelle organisation + premier compte. Le client se connecte avec l’e-mail et le mot de passe provisoire, puis change son mot de passe."
      />

      <Card className="max-w-lg">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Label htmlFor="admin-org-name">Nom du bailleur / société (reçus PDF)</Label>
              <HelpHint title="Ce nom apparaît comme émetteur sur les quittances du client. Il pourra le modifier dans Profil." />
            </div>
            <Input
              id="admin-org-name"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Ex. SCI Les Palmiers"
              required
              minLength={1}
              autoComplete="organization"
            />
          </div>
          <div>
            <Label htmlFor="admin-email">E-mail de connexion du client</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="admin-owner">Nom du contact (optionnel)</Label>
            <Input
              id="admin-owner"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Ex. Marie Kouassi"
              autoComplete="name"
            />
          </div>
          <div>
            <Label htmlFor="admin-pwd">Mot de passe provisoire</Label>
            <Input
              id="admin-pwd"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Au moins 8 caractères. Le client le remplacera depuis Profil ou « mot de passe oublié ».
            </p>
          </div>
          {err ? (
            <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
              {err}
            </p>
          ) : null}
          {ok ? (
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300" role="status">
              {ok}
            </p>
          ) : null}
          <Button type="submit" disabled={saving}>
            {saving ? 'Création…' : 'Créer organisation + compte'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
