import { useEffect, useState } from 'react';
import { Button, Input, Textarea } from '@/components/ui/index';
import { api, ApiError } from '@/lib/api';
import { toast } from '@/components/ui/Toast';

type Settings = {
  autoGenerateSchedules: boolean;
  autoRemindersEnabled: boolean;
  autoReceiptEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  reminderRules: Array<{ offsetDays: number; tone?: string }>;
  reminderChannels: Array<'EMAIL' | 'WHATSAPP'>;
  receiptChannels: Array<'EMAIL' | 'WHATSAPP'>;
  templates: { reminder: string; receipt: string };
};

export function ProfileAutomationTab() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setS(await api<Settings>('/automation/settings'));
      } catch (e) {
        toast(e instanceof ApiError ? e.message : 'Impossible de charger l’automation', {
          variant: 'error',
        });
      }
    })();
  }, []);

  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      const next = await api<Settings>('/automation/settings', { method: 'PATCH', json: s });
      setS(next);
      toast('Paramètres automation enregistrés', { variant: 'success' });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Enregistrement impossible', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (!s) {
    return <p className="text-sm text-[var(--color-muted)]">Chargement…</p>;
  }

  return (
    <div className="space-y-6">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={s.autoGenerateSchedules}
          onChange={(e) => setS({ ...s, autoGenerateSchedules: e.target.checked })}
        />
        <span>
          <span className="font-medium text-[var(--color-ink)]">Échéances automatiques</span>
          <span className="mt-0.5 block text-sm text-[var(--color-muted)]">
            Horizon 12 mois pour les baux sans date de fin, et prolongation annuelle (job).
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={s.autoRemindersEnabled}
          onChange={(e) => setS({ ...s, autoRemindersEnabled: e.target.checked })}
        />
        <span>
          <span className="font-medium text-[var(--color-ink)]">Relances automatiques</span>
          <span className="mt-0.5 block text-sm text-[var(--color-muted)]">
            File J-3 / J0 / J+5 / J+15 — e-mail et WhatsApp (lien wa.me). Voir l’écran Relances.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={s.autoReceiptEnabled}
          onChange={(e) => setS({ ...s, autoReceiptEnabled: e.target.checked })}
        />
        <span>
          <span className="font-medium text-[var(--color-ink)]">Quittance automatique</span>
          <span className="mt-0.5 block text-sm text-[var(--color-muted)]">
            À chaque encaissement (payé), envoie le lien de quittance au locataire (e-mail / WhatsApp).
          </span>
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--color-muted)]">Quiet hours — début</span>
          <Input
            type="number"
            min={0}
            max={23}
            value={s.quietHoursStart}
            onChange={(e) => setS({ ...s, quietHoursStart: Number(e.target.value) })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--color-muted)]">Quiet hours — fin</span>
          <Input
            type="number"
            min={0}
            max={23}
            value={s.quietHoursEnd}
            onChange={(e) => setS({ ...s, quietHoursEnd: Number(e.target.value) })}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-[var(--color-muted)]">Modèle relance</span>
        <Textarea
          rows={5}
          value={s.templates.reminder}
          onChange={(e) => setS({ ...s, templates: { ...s.templates, reminder: e.target.value } })}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-[var(--color-muted)]">Modèle quittance</span>
        <Textarea
          rows={5}
          value={s.templates.receipt}
          onChange={(e) => setS({ ...s, templates: { ...s.templates, receipt: e.target.value } })}
        />
      </label>

      <Button type="button" disabled={saving} onClick={() => void save()}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </div>
  );
}
