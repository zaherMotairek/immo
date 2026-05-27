import { useEffect, useState } from 'react';
import { AppPageTitle } from '@/components/AppPageTitle';
import { Card, Input, Label, Select } from '@/components/ui';
import { getAuditLogs, type AuditLogEntry } from '@/lib/api';
import { formatDateFr } from '@/lib/format';

const ACTION_OPTIONS = [
  { value: '', label: 'Toutes les actions' },
  { value: 'PAYMENT_MARKED_PAID', label: 'Paiement marqué payé' },
  { value: 'PAYMENT_RECEIPT_GENERATED', label: 'Reçu généré' },
  { value: 'PAYMENT_UPDATED', label: 'Paiement modifié' },
  { value: 'PAYMENT_PARTIAL_COLLECTED', label: 'Versement partiel' },
  { value: 'LEASE_UPDATED', label: 'Bail modifié' },
  { value: 'TENANT_UPDATED', label: 'Locataire modifié' },
];

export function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    getAuditLogs({ action: action || undefined, entityType: entityType || undefined, limit: 200 })
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [action, entityType]);

  function targetLabel(r: AuditLogEntry): string {
    const tenant = (r.metadata?.tenantFullName as string | undefined)?.trim();
    if (tenant) return `${r.entityType} · ${tenant}`;
    return `${r.entityType}${r.entityId ? ` · ${r.entityId.slice(0, 8)}` : ''}`;
  }

  return (
    <section className="space-y-4">
      <AppPageTitle iconTo="/journal-securite" title="Journal de sécurité" hintTitle="Traçabilité: qui a fait quoi et quand." />
      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="audit-action">Action</Label>
            <Select id="audit-action" value={action} onChange={(e) => setAction(e.target.value)}>
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="audit-entity">Type entité</Label>
            <Input
              id="audit-entity"
              placeholder="payment / lease / tenant..."
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            />
          </div>
        </div>
        {loading ? <p className="text-sm text-slate-500">Chargement…</p> : null}
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Cible</th>
                <th>Détail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateFr(r.createdAt)}</td>
                  <td>{r.actorEmail ?? r.actorName ?? 'Système'}</td>
                  <td>{r.action}</td>
                  <td>{targetLabel(r)}</td>
                  <td>{r.summary ?? '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500">
                    Aucun événement pour ce filtre.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
