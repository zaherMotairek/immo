import { useEffect, useState } from 'react';
import { AppPageTitle, PageHeaderKpi } from '@/components/AppPageTitle';
import {
  Button,
  Callout,
  Card,
  CardList,
  DataTable,
  EmptyState,
  Field,
  Input,
  StatusBadge,
  Toolbar,
} from '@/components/ui/index';
import { api } from '@/lib/api';

type CollectorRow = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  notes: string | null;
  openTasksCount?: number;
};

export function CollectorsPage() {
  const [rows, setRows] = useState<CollectorRow[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setErr(null);
    void api<CollectorRow[]>('/collectors')
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Erreur'));
  }

  useEffect(() => {
    load();
  }, []);

  async function createCollector() {
    setSaving(true);
    setErr(null);
    try {
      await api('/collectors', {
        method: 'POST',
        json: { name, phone, notes: notes.trim() || null },
      });
      setName('');
      setPhone('');
      setNotes('');
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Création impossible');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r: CollectorRow) {
    try {
      await api(`/collectors/${r.id}`, {
        method: 'PATCH',
        json: { active: !r.active },
      });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Mise à jour impossible');
    }
  }

  return (
    <div className="space-y-5">
      <AppPageTitle
        iconTo="/collecteurs"
        title="Collecteurs de loyers"
        hintTitle="Assigner un collecteur sur un paiement depuis le panneau de droite."
        subtitle="Agents de terrain chargés de récupérer les loyers."
        actions={<PageHeaderKpi label="Total" value={String(rows.length)} />}
      />

      <Toolbar
        left={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
            <span className="font-semibold text-[var(--color-ink)]">Réseau</span>
            <span>
              {rows.length} collecteur{rows.length !== 1 ? 's' : ''}
            </span>
          </div>
        }
      />

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Nouveau collecteur</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" htmlFor="collector-name" required>
            <Input
              id="collector-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Kouamé Yao"
            />
          </Field>
          <Field label="Téléphone" htmlFor="collector-phone" required>
            <Input
              id="collector-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2250700000000"
            />
          </Field>
          <Field label="Notes (optionnel)" htmlFor="collector-notes" className="sm:col-span-2">
            <Input
              id="collector-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zone, disponibilité..."
            />
          </Field>
        </div>
        <div className="mt-4">
          <Button disabled={saving || !name.trim() || !phone.trim()} onClick={() => void createCollector()}>
            {saving ? 'Création…' : 'Ajouter collecteur'}
          </Button>
        </div>
      </Card>

      {err ? <Callout variant="danger">{err}</Callout> : null}

      <Card padding="none" className="overflow-hidden">
        <CardList ariaLabel="Collecteurs" className="rounded-none border-0 md:hidden">
          {rows.map((r) => (
            <li key={r.id} className="list-none space-y-2 p-3.5">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--color-ink)]">{r.name}</p>
                <p className="mt-0.5 tabular-nums text-sm text-[var(--color-muted)]">{r.phone}</p>
                {r.notes ? <p className="mt-1 text-xs text-[var(--color-muted)]">{r.notes}</p> : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                  <span>
                    {r.openTasksCount ?? 0} mission{(r.openTasksCount ?? 0) !== 1 ? 's' : ''}
                  </span>
                  <StatusBadge
                    status={r.active ? 'PAID' : 'CANCELLED'}
                    label={r.active ? 'Actif' : 'Inactif'}
                    size="sm"
                  />
                </div>
                <Button variant="secondary" className="min-h-10 py-2 text-xs" onClick={() => void toggleActive(r)}>
                  {r.active ? 'Désactiver' : 'Réactiver'}
                </Button>
              </div>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="list-none px-4 py-6">
              <EmptyState title="Aucun collecteur pour l’instant." />
            </li>
          ) : null}
        </CardList>

        <div className="hidden md:block">
          <DataTable
            caption="Collecteurs"
            className="rounded-none border-0"
            getRowId={(r) => r.id}
            rows={rows}
            empty="Aucun collecteur pour l’instant."
            columns={[
              {
                id: 'name',
                header: 'Collecteur',
                cell: (r) => (
                  <div>
                    <p className="font-medium">{r.name}</p>
                    {r.notes ? <p className="text-xs text-[var(--color-muted)]">{r.notes}</p> : null}
                  </div>
                ),
              },
              {
                id: 'phone',
                header: 'Téléphone',
                cell: (r) => <span className="tabular-nums">{r.phone}</span>,
              },
              {
                id: 'missions',
                header: 'Missions en cours',
                cell: (r) => r.openTasksCount ?? 0,
              },
              {
                id: 'status',
                header: 'Statut',
                cell: (r) => (
                  <StatusBadge
                    status={r.active ? 'PAID' : 'CANCELLED'}
                    label={r.active ? 'Actif' : 'Inactif'}
                    size="sm"
                  />
                ),
              },
              {
                id: 'action',
                header: 'Action',
                align: 'right',
                cell: (r) => (
                  <Button variant="secondary" className="py-1.5 text-xs" onClick={() => void toggleActive(r)}>
                    {r.active ? 'Désactiver' : 'Réactiver'}
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
