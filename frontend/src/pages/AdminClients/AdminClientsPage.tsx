import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppPageTitle } from '@/components/AppPageTitle';
import { Button, Callout, Field, Input, Modal, Skeleton, StatTile } from '@/components/ui/index';
import { inputBaseClass } from '@/components/ui/Input';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { toast } from '@/components/ui/Toast';
import type { AdminDashboard, AdminOrgRow } from './types';
import { statusBadgeClass } from './types';

/** Hub admin D3 : dashboard + liste clients filtrable. */
export function AdminClientsPage() {
  useRegisterRootSectionFallback();
  const [dash, setDash] = useState<AdminDashboard | null>(null);
  const [rows, setRows] = useState<AdminOrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [planCode, setPlanCode] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [newPlan, setNewPlan] = useState('TRIAL');
  const [paidUntil, setPaidUntil] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (status) params.set('status', status);
      if (planCode) params.set('planCode', planCode);
      const qs = params.toString() ? `?${params}` : '';
      const [d, list] = await Promise.all([
        api<AdminDashboard>('/admin/dashboard'),
        api<AdminOrgRow[]>(`/admin/organizations${qs}`),
      ]);
      setDash(d);
      setRows(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [q, status, planCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredHint = useMemo(
    () => `${rows.length} client${rows.length !== 1 ? 's' : ''}`,
    [rows.length],
  );

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api<{
        organizationId: string;
        email: string;
        devResetUrl?: string;
        resetLinkSent?: boolean;
      }>('/admin/clients', {
        method: 'POST',
        json: {
          organizationName: orgName.trim(),
          email: email.trim(),
          ownerName: ownerName.trim() || undefined,
          planCode: newPlan,
          subscriptionEndsAt: paidUntil || undefined,
        },
      });
      toast(
        res.resetLinkSent
          ? `Client créé. Lien d’accès envoyé à ${res.email}.`
          : `Client créé (${res.email}).`,
        { variant: 'success' },
      );
      if (res.devResetUrl) {
        toast(`Dev — lien : ${res.devResetUrl}`, { variant: 'info', duration: 15000 });
      }
      setCreateOpen(false);
      setOrgName('');
      setEmail('');
      setOwnerName('');
      setPaidUntil('');
      await load();
    } catch (e2) {
      toast(e2 instanceof Error ? e2.message : 'Création impossible', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AppPageTitle
        iconTo="/admin"
        title="Administration"
        subtitle="Clients, abonnements et indicateurs."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Nouveau client
          </Button>
        }
      />

      {err ? <Callout variant="danger">{err}</Callout> : null}

      {loading && !dash ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : dash ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="CA mois (abo)" value={fcfa(dash.monthlyRevenueFcfa)} sub={`${dash.monthlyPaymentCount} paiement(s)`} />
          <StatTile label="Clients" value={String(dash.clientCount)} sub={`${dash.newSignupsThisMonth} nouveau(x) ce mois`} />
          <StatTile label="Expirent ≤ 7 j" value={String(dash.expiringIn7Days.length)} emphasize={dash.expiringIn7Days.length > 0} />
          <StatTile label="Essais ≤ 3 j" value={String(dash.trialsEndingIn3Days.length)} emphasize={dash.trialsEndingIn3Days.length > 0} />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Field label="Recherche" htmlFor="admin-q" className="sm:min-w-[14rem] flex-1">
          <Input id="admin-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou e-mail" />
        </Field>
        <Field label="Statut" htmlFor="admin-status">
          <select id="admin-status" className={inputBaseClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous</option>
            <option value="ACTIVE">Actif</option>
            <option value="EXPIRING_SOON">Bientôt expiré</option>
            <option value="EXPIRED">Expiré</option>
            <option value="TRIAL">Essai</option>
            <option value="SUSPENDED">Suspendu</option>
            <option value="FREE">Gratuit</option>
          </select>
        </Field>
        <Field label="Plan" htmlFor="admin-plan">
          <select id="admin-plan" className={inputBaseClass} value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
            <option value="">Tous</option>
            <option value="FREE">Gratuit</option>
            <option value="TRIAL">Essai</option>
            <option value="PRO">Pro</option>
          </select>
        </Field>
        <p className="text-sm text-[var(--color-muted)] sm:pb-2">{filteredHint}</p>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--odoo-border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--odoo-table-head-bg)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Client</th>
              <th className="px-3 py-2.5 font-semibold">Plan</th>
              <th className="px-3 py-2.5 font-semibold">Statut</th>
              <th className="px-3 py-2.5 font-semibold">Fin</th>
              <th className="px-3 py-2.5 font-semibold">Dern. connexion</th>
              <th className="px-3 py-2.5 font-semibold">Unités</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-[var(--odoo-border)] hover:bg-[var(--odoo-table-head-bg)]/50">
                <td className="px-3 py-2.5">
                  <Link to={`/admin/clients/${o.id}`} className="font-semibold text-[var(--color-ink)] underline-offset-2 hover:underline">
                    {o.name || 'Sans nom'}
                  </Link>
                </td>
                <td className="px-3 py-2.5">{o.planName}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(o.status)}`}>
                    {o.statusLabel}
                  </span>
                </td>
                <td className="px-3 py-2.5 tabular-nums">{o.subscriptionEndsAt ?? o.trialEndsAt ?? '—'}</td>
                <td className="px-3 py-2.5 text-[var(--color-muted)]">
                  {o.lastLoginAt ? o.lastLoginAt.slice(0, 10) : 'Jamais'}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {o.unitsUsed}
                  {o.unitLimit != null ? ` / ${o.unitLimit}` : ''}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[var(--color-muted)]">
                  Aucun client.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau client">
        <form onSubmit={(e) => void createClient(e)} className="space-y-4">
          <Field label="Nom organisation" htmlFor="nc-name" required>
            <Input id="nc-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
          </Field>
          <Field label="E-mail contact" htmlFor="nc-email" required>
            <Input id="nc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Nom contact" htmlFor="nc-owner">
            <Input id="nc-owner" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          </Field>
          <Field label="Plan" htmlFor="nc-plan">
            <select id="nc-plan" className={inputBaseClass} value={newPlan} onChange={(e) => setNewPlan(e.target.value)}>
              <option value="TRIAL">Essai</option>
              <option value="PRO">Pro</option>
              <option value="FREE">Gratuit</option>
            </select>
          </Field>
          <Field label="Payé jusqu’au (optionnel)" htmlFor="nc-until">
            <Input id="nc-until" type="date" value={paidUntil} onChange={(e) => setPaidUntil(e.target.value)} />
          </Field>
          <p className="text-xs text-[var(--color-muted)]">
            Un lien de définition du mot de passe est envoyé à l’e-mail (vous ne choisissez pas le mot de passe).
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Création…' : 'Créer'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
