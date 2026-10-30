import { useCallback, useEffect, useState } from 'react';
import { AppPageTitle } from '@/components/AppPageTitle';
import { HelpHint } from '@/components/ui';
import { Button, Card, EmptyState } from '@/components/ui/index';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { api, ApiError } from '@/lib/api';
import { toast } from '@/components/ui/Toast';

type ReminderRow = {
  id: string;
  status: 'QUEUED' | 'SENT' | 'FAILED' | 'SKIPPED';
  channel: 'EMAIL' | 'WHATSAPP';
  ruleOffsetDays: number;
  bodyPreview: string | null;
  waMeUrl: string | null;
  errorMessage: string | null;
  scheduledFor: string;
  tenantName: string;
  buildingName: string;
  unitLabel: string;
  periodYear: number;
  periodMonth: number;
  amountDue: number;
  paymentStatus: string;
};

const STATUS_LABEL: Record<ReminderRow['status'], string> = {
  QUEUED: 'En file',
  SENT: 'Envoyée',
  FAILED: 'Échec',
  SKIPPED: 'Ignorée',
};

export function RemindersPage() {
  useRegisterRootSectionFallback();
  const [rows, setRows] = useState<ReminderRow[]>([]);
  const [filter, setFilter] = useState<'' | ReminderRow['status']>('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter ? `?status=${filter}` : '';
      const data = await api<ReminderRow[]>(`/reminders${q}`);
      setRows(data);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Chargement impossible', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function enqueue() {
    try {
      const res = await api<{ created: number }>('/reminders/enqueue', { method: 'POST' });
      toast(`${res.created} relance(s) ajoutée(s) à la file`, { variant: 'success' });
      await load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Échec', { variant: 'error' });
    }
  }

  async function sendNow(id: string) {
    setBusyId(id);
    try {
      await api(`/reminders/${id}/send-now`, { method: 'POST' });
      toast('Relance traitée', { variant: 'success' });
      await load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Échec', { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  async function skip(id: string) {
    setBusyId(id);
    try {
      await api(`/reminders/${id}/skip`, { method: 'POST' });
      toast('Relance ignorée', { variant: 'success' });
      await load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Échec', { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AppPageTitle
        iconTo="/relances"
        title="Relances"
        subtitle="File d’attente des rappels loyer (e-mail / WhatsApp). Activation dans Mon compte → Automation."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <HelpHint title="Les relances automatiques ne partent jamais deux fois pour la même règle. Quiet hours 20h–7h (Abidjan)." />
            <Button type="button" variant="secondary" onClick={() => void enqueue()}>
              Actualiser la file
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(['', 'QUEUED', 'SENT', 'FAILED', 'SKIPPED'] as const).map((s) => (
          <Button
            key={s || 'all'}
            type="button"
            size="sm"
            variant={filter === s ? 'primary' : 'secondary'}
            onClick={() => setFilter(s)}
          >
            {s ? STATUS_LABEL[s] : 'Toutes'}
          </Button>
        ))}
      </div>

      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-[var(--color-muted)]">Chargement…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Aucune relance"
            description="Activez les relances automatiques dans Mon compte, ou actualisez la file."
          />
        ) : (
          <ul className="divide-y divide-[var(--odoo-border)]">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--color-ink)]">
                      {STATUS_LABEL[r.status]}
                    </span>
                    <span className="text-sm font-medium text-[var(--color-ink)]">{r.tenantName}</span>
                    <span className="text-xs text-[var(--color-muted)]">
                      {r.channel} · J{r.ruleOffsetDays >= 0 ? '+' : ''}
                      {r.ruleOffsetDays}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-muted)]">
                    {r.buildingName} — {r.unitLabel} · {r.periodMonth}/{r.periodYear} ·{' '}
                    {r.amountDue.toLocaleString('fr-FR')} FCFA
                  </p>
                  {r.bodyPreview ? (
                    <p className="line-clamp-2 whitespace-pre-wrap text-xs text-[var(--color-ink)] opacity-80">
                      {r.bodyPreview}
                    </p>
                  ) : null}
                  {r.errorMessage ? (
                    <p className="text-xs text-[var(--color-danger)]">{r.errorMessage}</p>
                  ) : null}
                  {r.waMeUrl ? (
                    <a
                      className="text-xs font-medium text-[var(--color-brand)] underline"
                      href={r.waMeUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ouvrir WhatsApp
                    </a>
                  ) : null}
                </div>
                {r.status === 'QUEUED' || r.status === 'FAILED' ? (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => void sendNow(r.id)}
                    >
                      Envoyer
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busyId === r.id}
                      onClick={() => void skip(r.id)}
                    >
                      Ignorer
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
