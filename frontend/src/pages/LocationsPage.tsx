import { useCallback, useEffect, useMemo, useState } from 'react';
import { SmartLink } from '@/components/SmartLink';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { unitKindLabel } from '@/lib/unitKind';
import { AppPageTitle } from '@/components/AppPageTitle';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { Button, Card, HelpHint, Input } from '@/components/ui';

type OverviewRow = {
  leaseId: string;
  active: boolean;
  tenantId: string;
  buildingId: string;
  unitId: string;
  localizationLine: string;
  buildingName: string;
  unitLabel: string;
  unitKind: string;
  tenantFullName: string;
  monthlyRent: number;
  rentDueDay: number;
  currentMonthStatusFr: string;
};

function hrefBiensUnit(
  buildingId: string,
  unitId: string,
  unitLabel: string,
  returnLocation: string,
) {
  const q = new URLSearchParams({
    unitId,
    hintUnitLabel: unitLabel,
    returnLocation,
  });
  return `/biens/${buildingId}?${q.toString()}`;
}

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
  useRegisterRootSectionFallback();
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [listSearch, setListSearch] = useState('');

  const filteredRows = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay =
        `${r.tenantFullName} ${r.buildingName} ${r.unitLabel} ${r.localizationLine} ${unitKindLabel(r.unitKind)} ${r.currentMonthStatusFr}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, listSearch]);

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

      {rows.length > 0 ? (
        <div className="relative max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400" aria-hidden>
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
          </span>
          <Input
            type="search"
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="Rechercher (locataire, bien, unité, ville…)"
            className="w-full rounded-xl border-slate-200 py-2.5 pl-9 pr-8 text-sm shadow-sm dark:border-slate-600"
            aria-label="Filtrer les locations"
            autoComplete="off"
          />
          {listSearch.trim() ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              onClick={() => setListSearch('')}
              aria-label="Effacer la recherche"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>
      ) : null}

      {filteredRows.length > 0 ? (
      <ul className="grid list-none gap-4 sm:grid-cols-2">
        {filteredRows.map((r) => (
          <li key={r.leaseId}>
            <div
              className={`flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-slate-100/40 shadow-sm transition hover:border-brand-400/55 hover:shadow-md dark:border-slate-700 dark:from-slate-900/80 dark:to-slate-900/40 dark:hover:border-brand-500/45 ${
                !r.active ? 'opacity-75' : ''
              }`}
            >
              <div className="flex flex-1 flex-col p-4">
                <div className="flex gap-3">
                  <LeaseCardIcon active={r.active} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {r.localizationLine}
                        </p>
                        <SmartLink
                          to={hrefBiensUnit(r.buildingId, r.unitId, r.unitLabel, `/locations/${r.leaseId}`)}
                          className="group mt-1 block text-base font-semibold leading-snug text-slate-900 no-underline hover:text-brand-700 dark:text-slate-100 dark:hover:text-brand-400 sm:text-lg"
                        >
                          {r.buildingName} — {r.unitLabel}
                        </SmartLink>
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
                  <SmartLink
                    to={`/locataires?edit=${encodeURIComponent(r.tenantId)}`}
                    className="mt-1 block text-lg font-semibold text-slate-900 no-underline hover:text-brand-700 dark:text-slate-100 dark:hover:text-brand-400"
                  >
                    {r.tenantFullName}
                  </SmartLink>
                  <SmartLink
                    to={`/locations/${r.leaseId}`}
                    className="mt-3 block rounded-lg bg-slate-50/90 px-3 py-2 text-sm no-underline transition hover:bg-slate-100/90 dark:bg-slate-800/50 dark:hover:bg-slate-800/80"
                  >
                    <p>
                      <span className="font-medium text-slate-500 dark:text-slate-400">Loyer mensuel :</span>{' '}
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100">{fcfa(r.monthlyRent)}</span>
                    </p>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-500 dark:text-slate-400">Jour d’échéance :</span> le {r.rentDueDay}{' '}
                      de chaque mois
                    </p>
                  </SmartLink>
                </div>
              </div>
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
      ) : null}

      {rows.length > 0 && filteredRows.length === 0 && listSearch.trim() ? (
        <Card>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Aucune location ne correspond à « {listSearch.trim()} ».
          </p>
          <Button type="button" variant="secondary" className="mt-3 py-2 text-xs" onClick={() => setListSearch('')}>
            Effacer la recherche
          </Button>
        </Card>
      ) : null}

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
