import { useEffect, useState } from 'react';
import { AppPageTitle } from '@/components/AppPageTitle';
import { Callout, Card, DataTable, Field, Input, Select, Skeleton } from '@/components/ui/index';
import { getAuditLogs, type AuditLogEntry } from '@/lib/api';
import { formatDateFr } from '@/lib/format';

const ACTION_OPTIONS = [
  { id: 'PAYMENT_MARKED_PAID', label: 'Paiement marqué payé' },
  { id: 'PAYMENT_RECEIPT_GENERATED', label: 'Reçu généré' },
  { id: 'PAYMENT_UPDATED', label: 'Paiement modifié' },
  { id: 'PAYMENT_PARTIAL_COLLECTED', label: 'Versement partiel' },
  { id: 'LEASE_UPDATED', label: 'Bail modifié' },
  { id: 'TENANT_UPDATED', label: 'Locataire modifié' },
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
      <AppPageTitle
        iconTo="/journal-securite"
        title="Journal de sécurité"
        hintTitle="Traçabilité: qui a fait quoi et quand."
        subtitle="Historique des actions sensibles sur votre espace."
      />

      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Action" htmlFor="audit-action">
            <Select
              id="audit-action"
              options={ACTION_OPTIONS}
              value={action}
              onValueChange={setAction}
              emptyLabel="Toutes les actions"
            />
          </Field>
          <Field label="Type entité" htmlFor="audit-entity">
            <Input
              id="audit-entity"
              placeholder="payment / lease / tenant..."
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            />
          </Field>
        </div>
        {loading ? <Skeleton className="h-4 w-32" /> : null}
        {err ? <Callout variant="danger">{err}</Callout> : null}
      </Card>

      <DataTable
        caption="Journal d’audit"
        getRowId={(r) => r.id}
        rows={rows}
        empty={loading ? 'Chargement…' : 'Aucun événement pour ce filtre.'}
        columns={[
          {
            id: 'date',
            header: 'Date',
            cell: (r) => formatDateFr(r.createdAt),
          },
          {
            id: 'user',
            header: 'Utilisateur',
            cell: (r) => r.actorEmail ?? r.actorName ?? 'Système',
          },
          {
            id: 'action',
            header: 'Action',
            cell: (r) => r.action,
          },
          {
            id: 'target',
            header: 'Cible',
            cell: (r) => targetLabel(r),
          },
          {
            id: 'detail',
            header: 'Détail',
            cell: (r) => r.summary ?? '—',
          },
        ]}
      />
    </section>
  );
}
