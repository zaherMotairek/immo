import { useEffect, useState } from 'react';
import { AppPageTitle } from '@/components/AppPageTitle';
import { Button, Card, Input } from '@/components/ui';
import { api } from '@/lib/api';
import { OdooActionBar, OdooFieldRow, OdooFormGrid, OdooFormSection } from '@/components/OdooKit';

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
      />
      <OdooActionBar
        left={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
            <span className="font-semibold">Réseau</span>
            <span>{rows.length} collecteur(s)</span>
          </div>
        }
      />
      <OdooFormSection title="Nouveau collecteur">
        <OdooFormGrid>
          <OdooFieldRow label="Nom">
            <Input id="collector-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Kouamé Yao" />
          </OdooFieldRow>
          <OdooFieldRow label="Téléphone">
            <Input id="collector-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2250700000000" />
          </OdooFieldRow>
          <div className="md:col-span-2">
            <OdooFieldRow label="Notes (optionnel)">
              <Input id="collector-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Zone, disponibilité..." />
            </OdooFieldRow>
          </div>
        </OdooFormGrid>
        <div className="mt-4">
          <Button disabled={saving || !name.trim() || !phone.trim()} onClick={() => void createCollector()}>
            {saving ? 'Création…' : 'Ajouter collecteur'}
          </Button>
        </div>
      </OdooFormSection>
      {err ? <Card className="text-sm text-red-700 dark:text-red-300">{err}</Card> : null}
      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-2 text-left">Collecteur</th>
              <th className="px-4 py-2 text-left">Téléphone</th>
              <th className="px-4 py-2 text-left">Missions en cours</th>
              <th className="px-4 py-2 text-left">Statut</th>
              <th className="px-4 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2">
                  <p className="font-medium">{r.name}</p>
                  {r.notes ? <p className="text-xs text-slate-500">{r.notes}</p> : null}
                </td>
                <td className="px-4 py-2 tabular-nums">{r.phone}</td>
                <td className="px-4 py-2">{r.openTasksCount ?? 0}</td>
                <td className="px-4 py-2">{r.active ? 'Actif' : 'Inactif'}</td>
                <td className="px-4 py-2 text-right">
                  <Button variant="secondary" className="py-1.5 text-xs" onClick={() => void toggleActive(r)}>
                    {r.active ? 'Désactiver' : 'Réactiver'}
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Aucun collecteur pour l’instant.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
