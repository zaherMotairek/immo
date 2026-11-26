import { useCallback, useEffect, useState } from 'react';
import { AppPageTitle } from '@/components/AppPageTitle';
import { AddZoomModal } from '@/components/AddZoomModal';
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
import { api, uploadRepairPhoto, type RepairRequestRow } from '@/lib/api';
import type { BuildingRow } from '@/pages/Buildings/buildingListUtils';
import { fcfa } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = {
  TODO: 'À faire',
  QUOTE_RECEIVED: 'Devis reçu',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminé',
};

const URGENCY_LABEL: Record<string, string> = {
  LOW: 'Basse',
  NORMAL: 'Normale',
  HIGH: 'Urgente',
};

export function RepairsPage() {
  const { can } = useOrgEntitlements();
  const canWrite = can('charges:write');
  const [rows, setRows] = useState<RepairRequestRow[]>([]);
  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [urgency, setUrgency] = useState('NORMAL');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    void Promise.all([api<RepairRequestRow[]>('/repairs'), api<BuildingRow[]>('/buildings')])
      .then(([repairs, b]) => {
        setRows(repairs);
        setBuildings(b);
        if (!buildingId && b[0]) setBuildingId(b[0].id);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [buildingId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createRepair() {
    if (!canWrite) return;
    setSaving(true);
    setErr(null);
    try {
      await api('/repairs', {
        method: 'POST',
        json: {
          buildingId,
          title: title.trim(),
          urgency,
          deadline: deadline || undefined,
        },
      });
      setTitle('');
      setDeadline('');
      setAddOpen(false);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Création impossible');
    } finally {
      setSaving(false);
    }
  }

  async function patchRepair(id: string, json: Record<string, unknown>) {
    const updated = await api<RepairRequestRow>(`/repairs/${id}`, { method: 'PATCH', json });
    setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
  }

  const overdue = rows.filter(
    (r) => r.status !== 'DONE' && r.deadline && new Date(r.deadline) < new Date(new Date().toDateString()),
  );

  return (
    <div className="space-y-5 pb-12">
      <AppPageTitle
        iconTo="/reparations"
        title="Suivi des réparations"
        subtitle="Demandes, devis, coûts et lien vers une charge MAINTENANCE."
        actions={
          canWrite ? (
            <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
              Nouvelle demande
            </Button>
          ) : null
        }
      />

      {err ? <Callout tone="danger">{err}</Callout> : null}
      {overdue.length ? (
        <Callout tone="warning">
          {overdue.length} réparation{overdue.length > 1 ? 's' : ''} en retard (échéance dépassée).
        </Callout>
      ) : null}

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : !rows.length ? (
        <EmptyState title="Aucune réparation" description="Créez une demande pour suivre les travaux sur vos biens." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">{r.title}</h3>
                <StatusBadge tone={r.status === 'DONE' ? 'success' : r.urgency === 'HIGH' ? 'danger' : 'neutral'}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </StatusBadge>
              </div>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {r.building?.name}
                {r.unit ? ` — ${r.unit.label}` : ''}
              </p>
              <p className="text-xs text-[var(--color-muted)]">Urgence : {URGENCY_LABEL[r.urgency] ?? r.urgency}</p>
              {r.deadline ? (
                <p className="text-xs text-[var(--color-muted)]">
                  Échéance : {new Date(r.deadline).toLocaleDateString('fr-FR')}
                </p>
              ) : null}
              {r.estimatedCost != null ? (
                <p className="mt-2 text-sm">Estimation : {fcfa(Number(r.estimatedCost))}</p>
              ) : null}
              {r.finalCost != null ? <p className="text-sm">Coût final : {fcfa(Number(r.finalCost))}</p> : null}
              {canWrite ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Select
                    className="max-w-[11rem] text-xs"
                    value={r.status}
                    onValueChange={(v) => void patchRepair(r.id, { status: v })}
                    options={Object.entries(STATUS_LABEL).map(([k, v]) => ({ id: k, label: v }))}
                  />
                  {!r.chargeId && r.status === 'DONE' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          const u = await api<RepairRequestRow>(`/repairs/${r.id}/maintenance-charge`, {
                            method: 'POST',
                          });
                          setRows((prev) => prev.map((x) => (x.id === r.id ? u : x)));
                        } catch (e) {
                          setErr(e instanceof Error ? e.message : 'Charge impossible');
                        }
                      }}
                    >
                      Créer charge maintenance
                    </Button>
                  ) : null}
                  <label className="flex items-center text-xs text-brand-700">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="max-w-[8rem]"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          void uploadRepairPhoto(r.id, f).then(load).catch((ex) => {
                            setErr(ex instanceof Error ? ex.message : 'Photo impossible');
                          });
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <AddZoomModal open={addOpen} title="Nouvelle réparation" onClose={() => setAddOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void createRepair();
          }}
        >
          <Field label="Titre">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
          <Field label="Bien">
            <Select
              value={buildingId}
              onValueChange={setBuildingId}
              options={buildings.map((b) => ({ id: b.id, label: b.name }))}
              searchable
            />
          </Field>
          <Field label="Urgence">
            <Select
              value={urgency}
              onValueChange={setUrgency}
              options={Object.entries(URGENCY_LABEL).map(([k, v]) => ({ id: k, label: v }))}
            />
          </Field>
          <Field label="Échéance souhaitée">
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              Enregistrer
            </Button>
          </div>
        </form>
      </AddZoomModal>
    </div>
  );
}