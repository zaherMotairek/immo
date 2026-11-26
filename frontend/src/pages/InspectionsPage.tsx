import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppPageTitle } from '@/components/AppPageTitle';
import {
  Button,
  Callout,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Skeleton,
  StatusBadge,
} from '@/components/ui/index';
import { useOrgEntitlements } from '@/hooks/useOrgEntitlements';
import { api, downloadInspectionPdf, uploadInspectionPhoto, type LeaseInspectionRow } from '@/lib/api';
import type { OverviewRow } from '@/pages/Locations/types';

const CONDITION_OPTIONS = [
  { value: 'UNCHECKED', label: '—' },
  { value: 'GOOD', label: 'Bon' },
  { value: 'WORN', label: 'Usé' },
  { value: 'DAMAGED', label: 'Dégradé' },
] as const;

const KIND_LABEL: Record<string, string> = { MOVE_IN: 'Entrée', MOVE_OUT: 'Sortie' };

export function InspectionsPage() {
  const { can } = useOrgEntitlements();
  const canWrite = can('leases:write');
  const [leases, setLeases] = useState<OverviewRow[]>([]);
  const [leaseId, setLeaseId] = useState('');
  const [rows, setRows] = useState<LeaseInspectionRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signature, setSignature] = useState('');

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const loadLeases = useCallback(() => {
    void api<OverviewRow[]>('/leases/overview')
      .then((l) => {
        setLeases(l);
        if (!leaseId && l[0]) setLeaseId(l[0].leaseId);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Erreur'));
  }, [leaseId]);

  const loadInspections = useCallback(() => {
    if (!leaseId) return;
    setLoading(true);
    void api<LeaseInspectionRow[]>(`/leases/${leaseId}/inspections`)
      .then((list) => {
        setRows(list);
        if (list.length && !selectedId) setSelectedId(list[0].id);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [leaseId, selectedId]);

  useEffect(() => {
    loadLeases();
  }, [loadLeases]);

  useEffect(() => {
    loadInspections();
  }, [loadInspections]);

  useEffect(() => {
    setSignature(selected?.tenantSignatureName ?? '');
  }, [selected?.id, selected?.tenantSignatureName]);

  async function createInspection(kind: 'MOVE_IN' | 'MOVE_OUT') {
    if (!leaseId || !canWrite) return;
    setSaving(true);
    setErr(null);
    try {
      const created = await api<LeaseInspectionRow>(`/leases/${leaseId}/inspections`, {
        method: 'POST',
        json: { kind },
      });
      setRows((prev) => [created, ...prev]);
      setSelectedId(created.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Création impossible');
    } finally {
      setSaving(false);
    }
  }

  async function saveItem(itemId: string, condition: string, note: string) {
    if (!selected || !canWrite) return;
    setSaving(true);
    try {
      const updated = await api<LeaseInspectionRow>(`/inspections/${selected.id}`, {
        method: 'PATCH',
        json: { items: [{ id: itemId, condition, note: note || undefined }] },
      });
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  async function signInspection() {
    if (!selected || !canWrite) return;
    setSaving(true);
    try {
      const updated = await api<LeaseInspectionRow>(`/inspections/${selected.id}`, {
        method: 'PATCH',
        json: { sign: true, tenantSignatureName: signature.trim() },
      });
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Signature impossible');
    } finally {
      setSaving(false);
    }
  }

  async function onPhoto(itemId: string, file: File) {
    if (!selected || !canWrite) return;
    try {
      await uploadInspectionPhoto(selected.id, file, itemId);
      loadInspections();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Photo impossible');
    }
  }

  const leaseLabel = leases.find((l) => l.leaseId === leaseId);

  return (
    <div className="space-y-5 pb-12">
      <AppPageTitle
        iconTo="/etats-des-lieux"
        title="États des lieux"
        subtitle="Checklist entrée / sortie, photos horodatées, PDF et comparaison avec la caution."
      />

      {err ? <Callout tone="danger">{err}</Callout> : null}

      <Card className="space-y-4 p-4">
        <Field label="Bail">
          <Select
            value={leaseId}
            onValueChange={setLeaseId}
            options={leases.map((l) => ({
              id: l.leaseId,
              label: `${l.tenantFullName} — ${l.unitLabel} (${l.buildingName})`,
            }))}
            searchable
          />
        </Field>
        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={saving || !leaseId} onClick={() => createInspection('MOVE_IN')}>
              Nouvel état d’entrée
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={saving || !leaseId}
              onClick={() => createInspection('MOVE_OUT')}
            >
              Nouvel état de sortie
            </Button>
          </div>
        ) : null}
      </Card>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : !rows.length ? (
        <EmptyState
          title="Aucun état des lieux"
          description={
            leaseLabel
              ? `Créez un état d’entrée ou de sortie pour ${leaseLabel.tenantFullName}.`
              : 'Ajoutez d’abord un bail actif.'
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_1fr]">
          <Card className="p-2">
            <ul className="divide-y divide-[var(--odoo-border)]">
              {rows.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className={`w-full px-3 py-2 text-left text-sm ${
                      selectedId === r.id ? 'bg-brand-50 font-semibold text-brand-800' : ''
                    }`}
                    onClick={() => setSelectedId(r.id)}
                  >
                    {KIND_LABEL[r.kind] ?? r.kind}
                    <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                      {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {selected ? (
            <Card className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">{KIND_LABEL[selected.kind]}</h2>
                  <StatusBadge tone={selected.status === 'SIGNED' ? 'success' : 'neutral'}>
                    {selected.status === 'SIGNED' ? 'Signé' : 'Brouillon'}
                  </StatusBadge>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => downloadInspectionPdf(selected.id)}>
                  Export PDF
                </Button>
              </div>

              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void signInspection();
                }}
              >
                {selected.items?.map((it) => (
                  <div key={it.id} className="rounded-lg border border-[var(--odoo-border)] p-3">
                    <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">{it.room}</p>
                    <p className="text-sm font-medium">{it.element}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Field label="État">
                        <Select
                          value={it.condition}
                          disabled={!canWrite || selected.status === 'SIGNED'}
                          onValueChange={(v) => void saveItem(it.id, v, it.note ?? '')}
                          options={CONDITION_OPTIONS.map((o) => ({ id: o.value, label: o.label }))}
                        />
                      </Field>
                      <Field label="Note">
                        <Input
                          defaultValue={it.note ?? ''}
                          disabled={!canWrite || selected.status === 'SIGNED'}
                          onBlur={(e) => {
                            if (e.target.value !== (it.note ?? '')) void saveItem(it.id, it.condition, e.target.value);
                          }}
                        />
                      </Field>
                    </div>
                    {canWrite && selected.status !== 'SIGNED' ? (
                      <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-brand-700">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="text-xs"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void onPhoto(it.id, f);
                            e.target.value = '';
                          }}
                        />
                        Ajouter une photo
                      </label>
                    ) : null}
                  </div>
                ))}

                {selected.kind === 'MOVE_OUT' && canWrite ? (
                  <Field label="Décision caution">
                    <Select
                      value={selected.depositRefundDecision ?? 'PENDING'}
                      disabled={selected.status === 'SIGNED'}
                      onValueChange={async (v) => {
                        const updated = await api<LeaseInspectionRow>(`/inspections/${selected.id}`, {
                          method: 'PATCH',
                          json: { depositRefundDecision: v },
                        });
                        setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                      }}
                      options={[
                        { id: 'PENDING', label: 'À décider' },
                        { id: 'FULL', label: 'Remboursement total' },
                        { id: 'PARTIAL', label: 'Partiel' },
                        { id: 'WITHHOLD', label: 'Retenue' },
                      ]}
                    />
                  </Field>
                ) : null}

                {canWrite && selected.status !== 'SIGNED' ? (
                  <>
                    <Field label="Nom du locataire (signature à l’écran)">
                      <Input value={signature} onChange={(e) => setSignature(e.target.value)} required />
                    </Field>
                    <Button type="submit" disabled={saving || !signature.trim()}>
                      Valider et signer
                    </Button>
                  </>
                ) : null}
              </form>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}