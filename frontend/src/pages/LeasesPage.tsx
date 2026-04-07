import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { LinkButton } from '@/components/LinkButton';
import { LeaseContractSection } from '@/components/LeaseContractSection';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import { unitKindLabel } from '@/lib/unitKind';

type BuildingOpt = {
  id: string;
  name: string;
  units: { id: string; label: string; kind: string }[];
};

type LeaseRow = {
  id: string;
  active: boolean;
  startDate: string;
  endDate: string | null;
  monthlyRent: unknown;
  rentDueDay: number;
  tenant: { firstName: string; lastName: string };
  unit: { label: string; kind: string; building: { name: string; commune: string; city: string } };
  contractFileOriginalName?: string | null;
  contractFileMime?: string | null;
  contractFileSize?: number | null;
  contractFileKey?: string | null;
  contractUploadedAt?: string | null;
};

type StatusTab = 'active' | 'inactive' | 'all';

function buildingGroupKey(l: LeaseRow) {
  const { name, city, commune } = l.unit.building;
  return `${name}\0${city}\0${commune ?? ''}`;
}

export function LeasesPage() {
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [buildings, setBuildings] = useState<BuildingOpt[]>([]);
  const [unitId, setUnitId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [tenants, setTenants] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [startDate, setStartDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [rentDueDay, setRentDueDay] = useState('1');
  const [genYear, setGenYear] = useState(String(new Date().getFullYear()));
  const [statusTab, setStatusTab] = useState<StatusTab>('active');
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    api<LeaseRow[]>('/leases').then(setLeases).catch(() => setLeases([]));
    api<BuildingOpt[]>('/buildings').then(setBuildings).catch(() => setBuildings([]));
    api<{ id: string; firstName: string; lastName: string }[]>('/tenants').then(setTenants).catch(() => setTenants([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const leaseStats = useMemo(() => {
    const active = leases.filter((l) => l.active).length;
    return { active, inactive: leases.length - active, total: leases.length };
  }, [leases]);

  const filteredLeases = useMemo(() => {
    if (statusTab === 'active') return leases.filter((l) => l.active);
    if (statusTab === 'inactive') return leases.filter((l) => !l.active);
    return leases;
  }, [leases, statusTab]);

  const groupedLeases = useMemo(() => {
    const map = new Map<string, LeaseRow[]>();
    for (const l of filteredLeases) {
      const key = buildingGroupKey(l);
      const arr = map.get(key);
      if (arr) arr.push(l);
      else map.set(key, [l]);
    }
    const entries = [...map.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }),
    );
    for (const [, rows] of entries) {
      rows.sort((a, b) => {
        const byUnit = a.unit.label.localeCompare(b.unit.label, 'fr', { numeric: true });
        if (byUnit !== 0) return byUnit;
        const na = `${a.tenant.lastName} ${a.tenant.firstName}`;
        const nb = `${b.tenant.lastName} ${b.tenant.firstName}`;
        return na.localeCompare(nb, 'fr', { sensitivity: 'base' });
      });
    }
    return entries;
  }, [filteredLeases]);

  const unitOptions = buildings.flatMap((b) => b.units.map((u) => ({ ...u, buildingName: b.name })));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api('/leases', {
        method: 'POST',
        json: {
          unitId,
          tenantId,
          startDate,
          monthlyRent: Number(monthlyRent),
          rentDueDay: Number(rentDueDay) || 1,
        },
      });
      setUnitId('');
      setTenantId('');
      setStartDate('');
      setMonthlyRent('');
      load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  async function generatePayments(leaseId: string) {
    const year = Number(genYear);
    if (!Number.isFinite(year)) return;
    try {
      const res = await api<{ createdCount: number }>(`/leases/${leaseId}/generate-payments`, {
        method: 'POST',
        json: { year },
      });
      alert(`${res.createdCount} échéance(s) créée(s) ou déjà existantes pour ${year}.`);
      load();
    } catch (e2) {
      alert(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  async function toggleActive(lease: LeaseRow) {
    await api(`/leases/${lease.id}`, { method: 'PATCH', json: { active: !lease.active } });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Baux</h1>
        <p className="text-sm text-slate-600">Liez une unité à un locataire, puis générez les loyers annuels.</p>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">Nouveau bail</h2>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Unité</Label>
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} required>
              <option value="">Choisir…</option>
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.buildingName} — {unitKindLabel(u.kind)} — {u.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Locataire</Label>
            <Select value={tenantId} onChange={(e) => setTenantId(e.target.value)} required>
              <option value="">Choisir…</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Début du bail</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div>
            <Label>Loyer mensuel (FCFA)</Label>
            <Input type="number" step="1" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} required />
          </div>
          <div>
            <Label>Jour d’échéance (1–31)</Label>
            <Input type="number" min={1} max={31} value={rentDueDay} onChange={(e) => setRentDueDay(e.target.value)} />
          </div>
          {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
          <div className="sm:col-span-2">
            <Button type="submit">Créer le bail</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Baux enregistrés</h2>
        <p className="mb-4 text-sm text-slate-600">
          <span className="font-medium text-slate-800">{leaseStats.active}</span> actif
          {leaseStats.active !== 1 ? 's' : ''}
          {leaseStats.inactive > 0 && (
            <>
              {' · '}
              <span className="font-medium text-slate-800">{leaseStats.inactive}</span> inactif
              {leaseStats.inactive !== 1 ? 's' : ''}
            </>
          )}
          {leaseStats.total > 0 && (
            <>
              {' · '}
              <span className="text-slate-500">{leaseStats.total} au total</span>
            </>
          )}
        </p>

        <div className="mb-4 space-y-3">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Afficher</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'active' as const, label: 'Actifs', count: leaseStats.active },
                  { id: 'inactive' as const, label: 'Inactifs', count: leaseStats.inactive },
                  { id: 'all' as const, label: 'Tous', count: leaseStats.total },
                ] as const
              ).map((t) => {
                const on = statusTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setStatusTab(t.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      on
                        ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    {t.label}
                    <span className="ml-1 tabular-nums text-slate-500">({t.count})</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Année génération loyers</Label>
            <Input className="mt-1 w-28" value={genYear} onChange={(e) => setGenYear(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          {groupedLeases.map(([gKey, rows]) => {
            const head = rows[0]!;
            const { name: bName, commune, city } = head.unit.building;
            return (
              <details
                key={gKey}
                className="group rounded-xl border border-slate-200 bg-slate-50/50 open:bg-white open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm marker:hidden [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="font-semibold text-slate-900">{bName}</span>
                    <span className="text-slate-600">
                      {' '}
                      · {commune}, {city}
                    </span>
                  </span>
                  <span className="tabular-nums text-xs font-medium text-slate-500">
                    {rows.length} {rows.length === 1 ? 'bail' : 'baux'}
                  </span>
                </summary>
                <ul className="divide-y divide-slate-100 border-t border-slate-100 bg-white">
                  {rows.map((l) => (
                    <li
                      key={l.id}
                      className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:justify-between"
                    >
                      <div className="min-w-0 flex-1 space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Locataire</p>
                          <p className="mt-0.5 text-lg font-semibold text-slate-900">
                            {l.tenant.firstName} {l.tenant.lastName}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                          <p className="font-medium text-slate-900">
                            {unitKindLabel(l.unit.kind)} — {l.unit.label}
                          </p>
                          <p className="mt-2 text-sm">
                            <span className="font-medium text-slate-500">Loyer :</span>{' '}
                            <span className="text-base font-bold text-slate-900">{fcfa(Number(l.monthlyRent))}</span>
                            <span className="text-slate-600"> / mois · échéance le {l.rentDueDay}</span>
                          </p>
                        </div>
                        <p className="text-sm text-slate-600">
                          Bail : du {l.startDate.slice(0, 10)}
                          {l.endDate ? ` au ${l.endDate.slice(0, 10)}` : ' (sans fin indiquée)'} ·{' '}
                          <span className={`font-semibold ${l.active ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {l.active ? 'Actif' : 'Inactif'}
                          </span>
                        </p>
                        <details className="rounded-lg border border-slate-200 bg-slate-50/60">
                          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 marker:hidden select-none [&::-webkit-details-marker]:hidden">
                            <span className="inline-flex items-center gap-2">
                              Contrat de bail
                              {l.contractFileKey ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-normal text-emerald-800">
                                  Fichier
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-normal text-amber-900">
                                  Aucun
                                </span>
                              )}
                              <span className="text-[10px] font-normal normal-case text-slate-400">(cliquer pour déplier)</span>
                            </span>
                          </summary>
                          <div className="border-t border-slate-100 px-3 py-3">
                            <LeaseContractSection
                              leaseId={l.id}
                              compact
                              contract={
                                l.contractFileKey
                                  ? {
                                      fileName: l.contractFileOriginalName ?? null,
                                      mimeType: l.contractFileMime ?? null,
                                      size: l.contractFileSize ?? null,
                                      uploadedAt: l.contractUploadedAt ?? null,
                                    }
                                  : null
                              }
                              onChanged={load}
                            />
                          </div>
                        </details>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <LinkButton to={`/locations/${l.id}`} variant="secondary" className="py-2 text-xs">
                          Fiche location
                        </LinkButton>
                        <Button variant="secondary" className="py-2 text-xs" onClick={() => generatePayments(l.id)}>
                          Générer loyers {genYear}
                        </Button>
                        <Button variant="ghost" className="py-2 text-xs" onClick={() => toggleActive(l)}>
                          {l.active ? 'Désactiver' : 'Réactiver'}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>

        {leases.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">Aucun bail enregistré.</p>
        )}
        {leases.length > 0 && filteredLeases.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            Aucun bail dans cette vue. Essayez « Tous » ou « {statusTab === 'active' ? 'Inactifs' : 'Actifs'} ».
          </p>
        )}
      </Card>
    </div>
  );
}
