import { useCallback, useEffect, useState } from 'react';
import { Button, Callout } from '@/components/ui/index';
import { api, ApiError } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import type { OrgMemberRole } from '@/hooks/useOrgEntitlements';

type Member = {
  id: string;
  email: string;
  name: string | null;
  orgRole: OrgMemberRole;
  isPlatformAdmin: boolean;
  deactivated: boolean;
};

const ROLE_LABELS: Record<OrgMemberRole, string> = {
  OWNER: 'Gérant',
  ACCOUNTANT: 'Comptable',
  COLLECTOR: 'Collecteur',
  READONLY: 'Lecture seule',
};

const ROLE_OPTIONS: OrgMemberRole[] = ['OWNER', 'ACCOUNTANT', 'COLLECTOR', 'READONLY'];

/** F1 — gestion des rôles (réservé OWNER / users:invite). */
export function ProfileMembersTab() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setErr(null);
    api<Member[]>('/me/members')
      .then(setMembers)
      .catch((e) => {
        setMembers(null);
        setErr(e instanceof ApiError ? e.message : 'Accès refusé ou indisponible');
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changeRole(userId: string, orgRole: OrgMemberRole) {
    setBusyId(userId);
    try {
      await api(`/me/members/${userId}/org-role`, { method: 'PATCH', json: { orgRole } });
      toast('Rôle mis à jour', { variant: 'success' });
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Impossible de changer le rôle', { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  if (err) {
    return <Callout variant="danger">{err}</Callout>;
  }
  if (!members) {
    return <p className="text-sm text-[var(--color-muted)]">Chargement…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">
        Attribuez un rôle à chaque compte de l’organisation. Vous ne pouvez pas modifier votre propre rôle.
      </p>
      <ul className="divide-y divide-[var(--odoo-border)] rounded-[var(--radius-card)] border border-[var(--odoo-border)]">
        {members.map((m) => (
          <li key={m.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {m.name?.trim() || m.email}
                {m.deactivated ? (
                  <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">(désactivé)</span>
                ) : null}
              </p>
              <p className="text-xs text-[var(--color-muted)]">{m.email}</p>
            </div>
            {m.isPlatformAdmin ? (
              <span className="text-xs text-[var(--color-muted)]">Admin plateforme</span>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-[var(--radius-control)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm"
                  value={m.orgRole}
                  disabled={busyId === m.id}
                  onChange={(e) => void changeRole(m.id, e.target.value as OrgMemberRole)}
                  aria-label={`Rôle de ${m.email}`}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-xs"
                  disabled={busyId === m.id}
                  onClick={() => load()}
                >
                  Rafraîchir
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
