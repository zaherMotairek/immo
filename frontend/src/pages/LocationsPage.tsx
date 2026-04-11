import { useCallback, useEffect, useState } from 'react';
import { SmartLink } from '@/components/SmartLink';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { unitKindLabel } from '@/lib/unitKind';
import { AppPageTitle } from '@/components/AppPageTitle';
import { ReturnNavigation } from '@/components/ReturnNavigation';
import { Button, Card, HelpHint } from '@/components/ui';

type OverviewRow = {
  leaseId: string;
  active: boolean;
  localizationLine: string;
  buildingName: string;
  unitLabel: string;
  unitKind: string;
  tenantFullName: string;
  monthlyRent: number;
  rentDueDay: number;
  currentMonthStatusFr: string;
};

function statusClass(fr: string) {
  if (fr === 'Payé') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200';
  if (fr === 'En retard') return 'bg-amber-100 text-amber-900 dark:bg-amber-950/65 dark:text-amber-200';
  if (fr === 'Annulé') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  return 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200';
}

function LeaseCardIcon({ active }: { active: boolean }) {
  return (
    <div
      className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
        active
          ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
      }`}
    >
      <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function LocationsPage() {
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(() => {
    const q = showAll ? '?all=1' : '';
    api<OverviewRow[]>(`/leases/overview${q}`).then(setRows).catch(() => setRows([]));
  }, [showAll]);

  useEffect(() => {
    load();
  }, [load]);

  async function requestDeleteLocation(r: OverviewRow) {
    const msg = `Supprimer la location « ${r.buildingName} — ${r.unitLabel} » (${r.tenantFullName}) ? Le bail, l’historique des loyers et le contrat joint seront supprimés. L’unité et le locataire ne sont pas supprimés. Action irréversible.`;
    if (!window.confirm(msg)) return;
    try {
      await api(`/leases/${r.leaseId}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Suppression impossible.');
    }
  }

  return (
    <div className="space-y-6">
      <ReturnNavigation fallbackHref="/" fallbackLabel="Tableau de bord" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <AppPageTitle
          className="max-w-3xl"
          iconTo="/locations"
          title="Locations"
          hintTitle="Pour chaque bail : localisation, locataire, loyer, statut du mois. Fiche = détail. Supprimer = supprime le bail et les paiements (pas le bien ni le locataire)."
        />
        <Button variant={showAll ? 'primary' : 'secondary'} className="py-2 text-xs" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Actives seulement' : 'Voir aussi inactives'}
        </Button>
      </div>

      <ul className="grid list-none gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.leaseId}>
            <div
              className={`flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-slate-100/40 shadow-sm transition hover:border-brand-400/55 hover:shadow-md dark:border-slate-700 dark:from-slate-900/80 dark:to-slate-900/40 dark:hover:border-brand-500/45 ${
                !r.active ? 'opacity-75' : ''
              }`}
            >
              <SmartLink
                to={`/locations/${r.leaseId}`}
                className="group flex flex-1 flex-col p-4 no-underline outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
              >
                <div className="flex gap-3">
                  <LeaseCardIcon active={r.active} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {r.localizationLine}
                        </p>
                        <h3 className="mt-1 text-base font-semibold leading-snug text-slate-900 group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-400 sm:text-lg">
                          {r.buildingName} — {r.unitLabel}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{unitKindLabel(r.unitKind)}</p>
                      </div>
                      <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium ${statusClass(r.currentMonthStatusFr)}`}>
                        {r.currentMonthStatusFr}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 border-t border-slate-200/60 pt-3 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Locataire</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{r.tenantFullName}</p>
                  <div className="mt-3 rounded-lg bg-slate-50/90 px-3 py-2 text-sm dark:bg-slate-800/50">
                    <p>
                      <span className="font-medium text-slate-500 dark:text-slate-400">Loyer mensuel :</span>{' '}
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100">{fcfa(r.monthlyRent)}</span>
                    </p>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-500 dark:text-slate-400">Jour d’échéance :</span> le {r.rentDueDay}{' '}
                      de chaque mois
                    </p>
                  </div>
                </div>
              </SmartLink>
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-200/60 bg-slate-100/40 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/50">
                <SmartLink
                  to={`/locations/${r.leaseId}`}
                  className="text-xs font-medium text-brand-600 transition hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  Ouvrir la fiche
                  <span className="inline-block transition hover:translate-x-0.5" aria-hidden>
                    →
                  </span>
                </SmartLink>
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/50"
                  onClick={() => void requestDeleteLocation(r)}
                >
                  Supprimer…
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {rows.length === 0 ? (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-700 dark:text-slate-300">Aucune location pour cette vue.</p>
            <HelpHint className="align-middle" title="Créez un bail (bien + unité + locataire) depuis la page Baux." />
          </div>
          <SmartLink to="/baux" className="mt-3 inline-block text-sm font-medium text-brand-700 dark:text-brand-400">
            Aller aux baux
          </SmartLink>
        </Card>
      ) : null}
    </div>
  );
}
