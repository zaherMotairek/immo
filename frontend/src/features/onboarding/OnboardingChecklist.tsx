import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button, Callout } from '@/components/ui/index';
import { toast } from '@/components/ui/Toast';

type OnboardingStatus = {
  steps: Array<{ id: string; label: string; done: boolean; href: string }>;
  complete: boolean;
  dismissed: boolean;
  canSeedSampleData: boolean;
  isDemo: boolean;
};

/** Checklist premier login (E3) — masquée si complète, démo, ou dismiss. */
export function OnboardingChecklist() {
  const [data, setData] = useState<OnboardingStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<OnboardingStatus>('/me/onboarding')
      .then(setData)
      .catch(() => setData(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data || data.isDemo || data.complete || data.dismissed) return null;

  async function dismiss() {
    await api('/me/onboarding/dismiss', { method: 'POST' });
    setData((d) => (d ? { ...d, dismissed: true } : d));
  }

  async function seed() {
    setBusy(true);
    try {
      const r = await api<{ message: string }>('/me/onboarding/seed-sample', { method: 'POST' });
      toast(r.message, { variant: 'success' });
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Impossible de charger l’exemple', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const doneCount = data.steps.filter((s) => s.done).length;

  return (
    <Callout variant="info" title={`Démarrage (${doneCount}/${data.steps.length})`}>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
        {data.steps.map((s) => (
          <li key={s.id} className={s.done ? 'text-[var(--color-muted)] line-through' : ''}>
            {s.done ? (
              s.label
            ) : (
              <Link to={s.href} className="font-semibold underline-offset-2 hover:underline">
                {s.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        {data.canSeedSampleData ? (
          <Button type="button" variant="secondary" className="text-xs" disabled={busy} onClick={() => void seed()}>
            {busy ? 'Chargement…' : 'Charger des données d’exemple'}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" className="text-xs" onClick={() => void dismiss()}>
          Masquer
        </Button>
      </div>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        Les données d’exemple ne s’activent jamais toutes seules sur un compte réel. Jeu complet (année en cours) et
        reset sélectif :{' '}
        <Link to="/profil?tab=donnees" className="font-semibold underline-offset-2 hover:underline">
          Mon compte → Données
        </Link>
        .
      </p>
    </Callout>
  );
}
