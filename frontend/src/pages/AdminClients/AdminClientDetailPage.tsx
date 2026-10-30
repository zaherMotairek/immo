import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppPageTitle } from '@/components/AppPageTitle';
import { Button, Callout, Field, Input, Skeleton, Tabs } from '@/components/ui/index';
import { inputBaseClass } from '@/components/ui/Input';
import { useAuth, type AuthUser } from '@/auth/AuthContext';
import { api, getStoredUser, getToken, setStoredUser, setToken } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { toast } from '@/components/ui/Toast';
import type { AdminOrgDetail } from './types';
import { statusBadgeClass } from './types';

const ADMIN_TOKEN_KEY = 'immopilot_admin_token';
const ADMIN_USER_KEY = 'immopilot_admin_user';

/** Fiche client admin — onglets Abonnement / Utilisateurs / Activité / Notes. */
export function AdminClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { applyUser } = useAuth();
  const [data, setData] = useState<AdminOrgDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState('abo');
  const [planCode, setPlanCode] = useState('PRO');
  const [extendMonths, setExtendMonths] = useState('1');
  const [notes, setNotes] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('WAVE');
  const [payPrepaid, setPayPrepaid] = useState('1');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setErr(null);
    try {
      const d = await api<AdminOrgDetail>(`/admin/organizations/${id}`);
      setData(d);
      setPlanCode(d.planCode);
      setNotes(d.internalNotes ?? '');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Introuvable');
      setData(null);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSubscription(patch: Record<string, unknown>) {
    if (!id) return;
    setBusy(true);
    try {
      await api(`/admin/organizations/${id}/subscription`, { method: 'PATCH', json: patch });
      toast('Enregistré.', { variant: 'success' });
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      toast('Montant invalide', { variant: 'error' });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const prepaid = Number(payPrepaid) as 1 | 3 | 12;
    setBusy(true);
    try {
      const res = await api<{ creditedMonths?: number | null }>(
        `/admin/organizations/${id}/subscription-payments`,
        {
          method: 'POST',
          json: {
            amountFcfa: Math.round(amount),
            method: payMethod,
            paidAt: today,
            prepaidMonths: prepaid,
            extendAccess: true,
          },
        },
      );
      toast(
        res.creditedMonths
          ? `Paiement enregistré — +${res.creditedMonths} mois crédités.`
          : 'Paiement enregistré — accès prolongé.',
        { variant: 'success' },
      );
      setPayAmount('');
      await load();
    } catch (e2) {
      toast(e2 instanceof Error ? e2.message : 'Échec', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    try {
      const res = await api<{ email: string; devResetUrl?: string }>(
        `/admin/organizations/${id}/users/invite`,
        { method: 'POST', json: { email: inviteEmail.trim(), name: inviteName.trim() || undefined } },
      );
      toast(`Invitation envoyée à ${res.email}`, { variant: 'success' });
      if (res.devResetUrl) toast(`Dev — ${res.devResetUrl}`, { variant: 'info', duration: 12000 });
      setInviteEmail('');
      setInviteName('');
      await load();
    } catch (e2) {
      toast(e2 instanceof Error ? e2.message : 'Échec', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function resetLink(userId: string) {
    if (!id) return;
    try {
      const res = await api<{ email: string; devResetUrl?: string }>(
        `/admin/organizations/${id}/users/${userId}/reset-password-link`,
        { method: 'POST' },
      );
      toast(`Lien envoyé à ${res.email}`, { variant: 'success' });
      if (res.devResetUrl) toast(`Dev — ${res.devResetUrl}`, { variant: 'info', duration: 12000 });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec', { variant: 'error' });
    }
  }

  async function toggleDeactivated(userId: string, deactivated: boolean) {
    if (!id) return;
    try {
      await api(`/admin/organizations/${id}/users/${userId}/deactivated`, {
        method: 'PATCH',
        json: { deactivated },
      });
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec', { variant: 'error' });
    }
  }

  async function viewAsClient() {
    if (!id) return;
    const ok = window.confirm(
      'Ouvrir une session lecture seule (30 min) sur le compte client ? Votre session admin sera mise de côté.',
    );
    if (!ok) return;
    try {
      const adminTok = getToken();
      const adminUser = getStoredUser();
      if (adminTok) sessionStorage.setItem(ADMIN_TOKEN_KEY, adminTok);
      if (adminUser) sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminUser));
      const res = await api<{
        accessToken: string;
        user: AuthUser & { readOnly?: boolean; impersonatorId?: string };
      }>(`/admin/organizations/${id}/impersonate`, { method: 'POST' });
      setToken(res.accessToken);
      applyUser({
        ...res.user,
        readOnly: true,
        impersonatorId: res.user.impersonatorId,
      });
      navigate('/', { replace: true });
      toast('Mode vue client (lecture seule).', { variant: 'info' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Impersonation impossible', { variant: 'error' });
    }
  }

  if (err) {
    return (
      <Callout variant="danger" title="Client introuvable">
        <p>{err}</p>
        <Link to="/admin" className="mt-2 inline-block text-sm font-semibold underline">
          Retour admin
        </Link>
      </Callout>
    );
  }

  if (!data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AppPageTitle
        iconTo="/admin"
        title={data.name || 'Client'}
        subtitle={`${data.planName} · ${data.statusLabel}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void viewAsClient()}>
              Voir comme le client
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/admin')}>
              Liste
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusBadgeClass(data.status)}`}>
          {data.statusLabel}
        </span>
        <span className="text-sm text-[var(--color-muted)]">
          Fin : {data.subscriptionEndsAt ?? data.trialEndsAt ?? '—'} · Unités {data.unitsUsed}
          {data.unitLimit != null ? `/${data.unitLimit}` : ''}
        </span>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--odoo-border)]">
        <Tabs
          tabs={[
            { id: 'abo', label: 'Abonnement' },
            { id: 'users', label: 'Utilisateurs' },
            { id: 'activity', label: 'Activité' },
            { id: 'notes', label: 'Notes' },
          ]}
          activeId={tab}
          onChange={setTab}
          ariaLabel="Fiche client"
        />
        <div className="space-y-4 p-4 sm:p-5">
          {tab === 'abo' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Plan" htmlFor="plan">
                  <select id="plan" className={inputBaseClass} value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
                    <option value="FREE">Gratuit</option>
                    <option value="TRIAL">Essai</option>
                    <option value="PRO">Pro</option>
                  </select>
                </Field>
                <div className="flex flex-wrap items-end gap-2">
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveSubscription({ planCode })}
                  >
                    Changer le plan
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      void saveSubscription({
                        platformAccessSuspended: !data.platformAccessSuspended,
                      })
                    }
                  >
                    {data.platformAccessSuspended ? 'Réactiver' : 'Suspendre'}
                  </Button>
                </div>
                <Field label="Prolonger (mois)" htmlFor="ext">
                  <Input id="ext" type="number" min={1} value={extendMonths} onChange={(e) => setExtendMonths(e.target.value)} />
                </Field>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveSubscription({ extendMonths: Number(extendMonths) || 1 })}
                >
                  Prolonger
                </Button>
              </div>
              <p className="text-sm text-[var(--color-muted)]">
                Tarif catalogue : {fcfa(data.monthlyPriceFcfa)} / mois
              </p>
              <form onSubmit={(e) => void recordPayment(e)} className="grid gap-3 border-t border-[var(--odoo-border)] pt-4 sm:grid-cols-4">
                <Field label="Montant FCFA" htmlFor="pay-a">
                  <Input id="pay-a" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
                </Field>
                <Field label="Moyen" htmlFor="pay-m">
                  <select id="pay-m" className={inputBaseClass} value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    <option value="WAVE">Wave</option>
                    <option value="ORANGE">Orange</option>
                    <option value="MTN">MTN</option>
                    <option value="MOOV">Moov</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Banque</option>
                  </select>
                </Field>
                <Field label="Forfait" htmlFor="pay-p" hint="12 mois = +1 mois offert">
                  <select id="pay-p" className={inputBaseClass} value={payPrepaid} onChange={(e) => setPayPrepaid(e.target.value)}>
                    <option value="1">1 mois</option>
                    <option value="3">3 mois</option>
                    <option value="12">12 mois (+1 offert)</option>
                  </select>
                </Field>
                <div className="flex items-end">
                  <Button type="submit" disabled={busy}>
                    Enregistrer paiement
                  </Button>
                </div>
              </form>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-[var(--color-muted)]">
                      <th className="py-1">Date</th>
                      <th className="py-1">Montant</th>
                      <th className="py-1">Moyen</th>
                      <th className="py-1">Période</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p) => (
                      <tr key={p.id} className="border-t border-[var(--odoo-border)]">
                        <td className="py-1.5">{p.paidAt}</td>
                        <td className="py-1.5 tabular-nums">{fcfa(p.amountFcfa)}</td>
                        <td className="py-1.5">{p.method}</td>
                        <td className="py-1.5">
                          {p.periodStart} → {p.periodEnd}
                        </td>
                      </tr>
                    ))}
                    {data.payments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-3 text-[var(--color-muted)]">
                          Aucun paiement abo.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {tab === 'users' ? (
            <>
              <form onSubmit={(e) => void invite(e)} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Field label="E-mail" htmlFor="inv-e" className="flex-1">
                  <Input id="inv-e" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
                </Field>
                <Field label="Nom" htmlFor="inv-n">
                  <Input id="inv-n" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
                </Field>
                <Button type="submit" disabled={busy}>
                  Inviter (lien e-mail)
                </Button>
              </form>
              <ul className="divide-y divide-[var(--odoo-border)]">
                {data.users.map((u) => (
                  <li key={u.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{u.email}</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {u.name || '—'} · {u.role}
                        {u.deactivated ? ' · désactivé' : ''}
                      </p>
                    </div>
                    {u.role === 'USER' ? (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" className="text-xs" onClick={() => void resetLink(u.id)}>
                          Lien reset MDP
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs"
                          onClick={() => void toggleDeactivated(u.id, !u.deactivated)}
                        >
                          {u.deactivated ? 'Réactiver' : 'Désactiver'}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {tab === 'activity' ? (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ['Biens', data.activity.buildingCount],
                ['Unités', data.activity.unitCount],
                ['Locataires', data.activity.tenantCount],
                ['Baux', data.activity.leaseCount],
                ['Paiements loyer', data.activity.paymentCount],
                ['Relances envoyées', data.activity.remindersSent],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] p-3">
                  <dt className="text-xs text-[var(--color-muted)]">{k}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
              <div className="col-span-2 rounded-[var(--radius-card)] border border-[var(--odoo-border)] p-3 sm:col-span-3">
                <dt className="text-xs text-[var(--color-muted)]">Dernière connexion</dt>
                <dd className="font-medium">
                  {data.activity.lastLoginAt ? data.activity.lastLoginAt.replace('T', ' ').slice(0, 19) : 'Jamais'}
                </dd>
              </div>
            </dl>
          ) : null}

          {tab === 'notes' ? (
            <div className="space-y-3">
              <Field label="Notes internes" htmlFor="notes">
                <textarea
                  id="notes"
                  className="min-h-[8rem] w-full rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-white px-3 py-2 text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
              <Button type="button" disabled={busy} onClick={() => void saveSubscription({ internalNotes: notes })}>
                Enregistrer les notes
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function exitImpersonation(): boolean {
  const tok = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  const raw = sessionStorage.getItem(ADMIN_USER_KEY);
  if (!tok || !raw) return false;
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
  setToken(tok);
  try {
    setStoredUser(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  window.location.assign('/admin');
  return true;
}
