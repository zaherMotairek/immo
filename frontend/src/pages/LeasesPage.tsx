import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { fcfa, INPUT_AMOUNT_FCFA_LABEL } from '@/lib/format';
import { ReturnNavigation } from '@/components/ReturnNavigation';
import { LinkButton } from '@/components/LinkButton';
import { LeaseContractSection } from '@/components/LeaseContractSection';
import { AmountFcfaInput, Button, Card, HelpHint, Input, Label, Select } from '@/components/ui';
import { UNIT_KIND_OPTIONS, unitKindLabel, type UnitKindCode } from '@/lib/unitKind';

type BuildingOpt = {
  id: string;
  name: string;
  structureKind?: string;
  floorCount?: number | null;
  apartmentCount?: number | null;
  units: { id: string; label: string; kind: string; apartmentSlot?: number | null }[];
};

type LeaseRow = {
  id: string;
  active: boolean;
  startDate: string;
  endDate: string | null;
  monthlyRent: unknown;
  rentDueDay: number;
  depositAmount?: unknown;
  depositPaidAt?: string | null;
  tenant: { firstName: string; lastName: string };
  unit: {
    label: string;
    kind: string;
    building: { name: string; commune: string; city: string; structureKind?: string };
  };
  contractFileOriginalName?: string | null;
  contractFileMime?: string | null;
  contractFileSize?: number | null;
  contractFileKey?: string | null;
  contractUploadedAt?: string | null;
};

type StatusTab = 'active' | 'inactive' | 'all';

/** Filtre d’affichage par type de local (nature d’unité). */
type WellViewFilter = 'all' | UnitKindCode;

function buildingGroupKey(l: LeaseRow) {
  const { name, city, commune } = l.unit.building;
  return `${name}\0${city}\0${commune ?? ''}`;
}

const filterPillBase =
  'shrink-0 rounded-lg border px-3 py-2 text-left text-[13px] font-medium leading-snug whitespace-nowrap transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
const filterPillOn =
  'border-brand-600/90 bg-brand-50 text-brand-950 shadow-sm dark:border-brand-500/70 dark:bg-brand-950/35 dark:text-brand-100';
const filterPillOff =
  'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900/75 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800';

export function LeasesPage() {
  const [params, setParams] = useSearchParams();
  const leaseIdFocus = params.get('leaseId')?.trim() ?? '';
  const hintTenant = params.get('hintTenant')?.trim() ?? '';
  const hintPlace = params.get('hintPlace')?.trim() ?? '';

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
  const [wellViewFilter, setWellViewFilter] = useState<WellViewFilter>('all');
  const [buildingIdForLease, setBuildingIdForLease] = useState('');
  const [depositMonthsPreset, setDepositMonthsPreset] = useState<'0' | '1' | '2' | '3'>('0');
  const [err, setErr] = useState<string | null>(null);
  const [addLeaseOpen, setAddLeaseOpen] = useState(false);
  const addLeaseFormRef = useRef<HTMLDivElement | null>(null);

  function openAddLeaseForm() {
    setAddLeaseOpen(true);
    window.requestAnimationFrame(() => {
      addLeaseFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const load = useCallback(() => {
    api<LeaseRow[]>('/leases').then(setLeases).catch(() => setLeases([]));
    api<BuildingOpt[]>('/buildings').then(setBuildings).catch(() => setBuildings([]));
    api<{ id: string; firstName: string; lastName: string }[]>('/tenants').then(setTenants).catch(() => setTenants([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (window.location.hash === '#nouveau-bail') {
      setAddLeaseOpen(true);
    }
  }, []);

  const leaseStats = useMemo(() => {
    const active = leases.filter((l) => l.active).length;
    return { active, inactive: leases.length - active, total: leases.length };
  }, [leases]);

  const leasesByStatus = useMemo(() => {
    if (statusTab === 'active') return leases.filter((l) => l.active);
    if (statusTab === 'inactive') return leases.filter((l) => !l.active);
    return leases;
  }, [leases, statusTab]);

  const wellViewCounts = useMemo(() => {
    const counts: Record<string, number> = { all: leasesByStatus.length };
    for (const { value } of UNIT_KIND_OPTIONS) {
      counts[value] = leasesByStatus.filter((l) => l.unit.kind === value).length;
    }
    return counts;
  }, [leasesByStatus]);

  const filteredLeases = useMemo(() => {
    if (wellViewFilter === 'all') return leasesByStatus;
    return leasesByStatus.filter((l) => l.unit.kind === wellViewFilter);
  }, [leasesByStatus, wellViewFilter]);

  /** Résumé lisible de la vue (évite de « perdre » le contexte des filtres). */
  const filterSummary = useMemo(() => {
    const statusFr =
      statusTab === 'active' ? 'Baux actifs' : statusTab === 'inactive' ? 'Baux inactifs' : 'Tous les baux';
    const wellFr =
      wellViewFilter === 'all' ? ' · Tous les types de bien' : ` · ${unitKindLabel(wellViewFilter)} uniquement`;
    return `${statusFr}${wellFr}. Année « Générer loyers » : ${genYear} (barre de filtres ci-dessus).`;
  }, [statusTab, wellViewFilter, genYear]);

  const leaseFocusSummary = useMemo(() => {
    if (!leaseIdFocus) return null;
    const lease = leases.find((l) => l.id === leaseIdFocus);
    if (lease) {
      return {
        tenant: `${lease.tenant.firstName} ${lease.tenant.lastName}`.trim(),
        place: `${lease.unit.building.name} — ${lease.unit.label}`,
      };
    }
    if (hintTenant || hintPlace) {
      return { tenant: hintTenant || '—', place: hintPlace || '—' };
    }
    return { tenant: '', place: '' };
  }, [leaseIdFocus, leases, hintTenant, hintPlace]);

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

  const appliedLeaseLinkRef = useRef<string | null>(null);

  function clearLeaseDeepLink() {
    setParams(
      (prev) => {
        const q = new URLSearchParams(prev);
        q.delete('leaseId');
        q.delete('hintTenant');
        q.delete('hintPlace');
        return q;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    if (!leaseIdFocus) {
      appliedLeaseLinkRef.current = null;
      return;
    }
    const lease = leases.find((l) => l.id === leaseIdFocus);
    if (!lease) return;
    if (appliedLeaseLinkRef.current === leaseIdFocus) return;
    appliedLeaseLinkRef.current = leaseIdFocus;
    setStatusTab('all');
    setWellViewFilter('all');
  }, [leaseIdFocus, leases]);

  useLayoutEffect(() => {
    if (!leaseIdFocus || groupedLeases.length === 0) return;
    const idx = groupedLeases.findIndex(([, rows]) => rows.some((r) => r.id === leaseIdFocus));
    if (idx < 0) return;
    const detailsEl = document.querySelector(`details[data-lease-group-idx="${idx}"]`) as HTMLDetailsElement | null;
    if (detailsEl) detailsEl.open = true;
    const t = window.setTimeout(() => {
      const row = document.getElementById(`lease-row-${leaseIdFocus}`);
      if (!row) return;
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      row.classList.add('ring-2', 'ring-brand-500', 'ring-offset-2', 'rounded-xl', 'dark:ring-offset-slate-900');
      window.setTimeout(
        () =>
          row.classList.remove(
            'ring-2',
            'ring-brand-500',
            'ring-offset-2',
            'rounded-xl',
            'dark:ring-offset-slate-900',
          ),
        2400,
      );
    }, 150);
    return () => clearTimeout(t);
  }, [leaseIdFocus, groupedLeases]);

  const selectedBuilding = buildings.find((x) => x.id === buildingIdForLease);

  const unitsInSelectedBuilding = useMemo(() => {
    const b = selectedBuilding;
    if (!b?.units.length) return [];
    const rank = (k: string) => (k === 'APARTMENT' ? 0 : 1);
    return [...b.units].sort((a, c) => {
      const rk = rank(a.kind) - rank(c.kind);
      if (rk !== 0) return rk;
      const sa = a.apartmentSlot ?? 99999;
      const sc = c.apartmentSlot ?? 99999;
      if (sa !== sc) return sa - sc;
      return a.label.localeCompare(c.label, 'fr', { numeric: true });
    });
  }, [selectedBuilding]);

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
          ...(depositMonthsPreset !== '0' ? { depositMonths: Number(depositMonthsPreset) } : {}),
        },
      });
      setBuildingIdForLease('');
      setUnitId('');
      setTenantId('');
      setStartDate('');
      setMonthlyRent('');
      setDepositMonthsPreset('0');
      setAddLeaseOpen(false);
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

  const immeubleIndicatifHint =
    selectedBuilding?.structureKind === 'IMMEUBLE' &&
    selectedBuilding &&
    (selectedBuilding.floorCount != null || selectedBuilding.apartmentCount != null)
      ? `Indicatif immeuble : ${
          selectedBuilding.floorCount != null
            ? `${selectedBuilding.floorCount} étage${selectedBuilding.floorCount !== 1 ? 's' : ''}`
            : 'étages non renseignés'
        } · ${
          selectedBuilding.apartmentCount != null
            ? `${selectedBuilding.apartmentCount} appartement${selectedBuilding.apartmentCount !== 1 ? 's' : ''} déclarés`
            : 'appartements non renseignés'
        } · ${selectedBuilding.units.length} unité${selectedBuilding.units.length !== 1 ? 's' : ''} enregistrée${
          selectedBuilding.units.length !== 1 ? 's' : ''
        }.`
      : '';

  return (
    <div className="space-y-8 pb-10">
      <ReturnNavigation fallbackHref="/" fallbackLabel="Tableau de bord" />

      <header className="border-b border-slate-200/90 pb-6 dark:border-slate-700/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-[1.65rem]">
                Baux & locations
              </h1>
              <HelpHint
                className="shrink-0 align-middle"
                title="Créez un bail en liant une unité à un locataire, puis générez les échéances pour une année donnée. Les filtres ci-dessous ne font que masquer des lignes à l’écran."
              />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {leaseIdFocus ? (
                <>
                  <strong className="font-semibold text-slate-800 dark:text-slate-200">Vue guidée :</strong> un bail précis est
                  mis en avant ci-dessous (groupe ouvert, ligne surlignée). Les autres baux restent visibles dans la liste.
                </>
              ) : (
                <>
                  Parcourez vos baux par bien, filtrez par statut ou type de local, puis ouvrez une fiche pour agir (loyers,
                  contrat, caution).
                </>
              )}
            </p>
            {leaseIdFocus ? (
              <div
                className="mt-4 max-w-2xl rounded-xl border border-brand-200/90 bg-gradient-to-br from-brand-50/95 to-white px-4 py-3.5 shadow-sm dark:border-brand-500/35 dark:from-brand-950/50 dark:to-slate-900/80"
                role="status"
              >
                <p className="text-sm font-semibold text-brand-950 dark:text-brand-100">
                  Baux & génération loyers — ce bail est sélectionné
                </p>
                {leaseFocusSummary && (leaseFocusSummary.tenant || leaseFocusSummary.place) ? (
                  <p className="mt-2 text-sm leading-snug text-slate-800 dark:text-slate-200">
                    <span className="font-semibold text-slate-900 dark:text-slate-50">{leaseFocusSummary.tenant}</span>
                    {leaseFocusSummary.place ? (
                      <>
                        {' '}
                        · <span className="font-normal">{leaseFocusSummary.place}</span>
                      </>
                    ) : null}
                  </p>
                ) : leaseIdFocus && leases.length > 0 ? (
                  <p className="mt-2 text-sm text-amber-800 dark:text-amber-200/90">
                    Aucun bail avec cet identifiant dans la liste chargée — il a peut-être été supprimé. Vérifiez l’URL ou
                    ouvrez la fiche location.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Chargement du contexte…</p>
                )}
                <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <Link
                    to={`/locations/${leaseIdFocus}`}
                    className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
                  >
                    ← Fiche location de ce bail
                  </Link>
                  <button
                    type="button"
                    className="font-semibold text-slate-700 underline-offset-2 hover:underline dark:text-slate-300"
                    onClick={clearLeaseDeepLink}
                  >
                    Afficher la page sans sélection
                  </button>
                </p>
              </div>
            ) : null}
          </div>
          <Button type="button" className="h-auto shrink-0 gap-2 py-2.5 text-sm font-semibold shadow-sm sm:mt-1" onClick={() => openAddLeaseForm()}>
            <span className="text-lg leading-none" aria-hidden>
              +
            </span>
            Nouveau bail
          </Button>
        </div>
      </header>

      <div ref={addLeaseFormRef} id="nouveau-bail" className="scroll-mt-24">
        <Card className="!p-0 overflow-hidden shadow-sm ring-1 ring-slate-900/[0.04] dark:ring-slate-600/35">
          <button
            type="button"
            onClick={() => setAddLeaseOpen((o) => !o)}
            aria-expanded={addLeaseOpen}
            className="flex w-full items-center justify-between gap-4 border-b border-transparent px-4 py-4 text-left transition hover:bg-slate-50/95 dark:hover:bg-slate-800/50 sm:px-5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/12 text-lg font-bold leading-none text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                +
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Étape administrative</p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Enregistrer un nouveau bail</h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {addLeaseOpen ? 'Replier le formulaire' : 'Déplier pour saisir bien, locataire et loyer'}
                </p>
              </div>
            </div>
            <svg
              className={`size-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500 ${addLeaseOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {addLeaseOpen ? (
            <div className="border-t border-slate-200/90 bg-slate-50/40 px-4 pb-5 pt-4 dark:border-slate-700 dark:bg-slate-900/25 sm:px-5">
              <div className="mb-4 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-xs leading-snug text-slate-600 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Ordre recommandé : </span>
                bien → unité louée → locataire → montant et dates. Les unités proviennent de la fiche « Biens » (à créer
                au préalable si besoin).
                <HelpHint
                  className="ml-1 inline align-middle"
                  title="Choisissez d’abord le bien (immeuble, villa…), puis l’unité exacte. Seules les unités déjà créées sur la fiche du bien sont proposées."
                />
              </div>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Label htmlFor="lease-building" className="mb-0">
                Bien / immeuble
              </Label>
              {immeubleIndicatifHint ? (
                <HelpHint className="align-middle" title={immeubleIndicatifHint} />
              ) : null}
            </div>
            <Select
              id="lease-building"
              value={buildingIdForLease}
              onChange={(e) => {
                setBuildingIdForLease(e.target.value);
                setUnitId('');
              }}
              required
            >
              <option value="">Choisir le bien…</option>
              {[...buildings]
                .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="lease-unit">Appartement ou local (unité)</Label>
            <Select
              id="lease-unit"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              required
              disabled={!buildingIdForLease}
            >
              <option value="">
                {buildingIdForLease ? 'Choisir l&apos;unité…' : 'Choisissez d&apos;abord un bien'}
              </option>
              {unitsInSelectedBuilding.map((u) => (
                <option key={u.id} value={u.id}>
                  {unitKindLabel(u.kind)} — {u.label}
                  {u.apartmentSlot != null ? ` (n° ${u.apartmentSlot})` : ''}
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
            <Label>{INPUT_AMOUNT_FCFA_LABEL} — loyer mensuel</Label>
            <AmountFcfaInput min={0} step={1} value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} required />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Label htmlFor="lease-deposit-months" className="mb-0">
                Caution (dépôt) — nombre de loyers
              </Label>
              <HelpHint
                className="align-middle"
                title="Indique 1, 2 ou 3 mois de loyer comme caution : le montant est calculé automatiquement (loyer × mois). Laisser « Aucune » si pas de caution contractuelle."
              />
            </div>
            <Select
              id="lease-deposit-months"
              value={depositMonthsPreset}
              onChange={(e) => setDepositMonthsPreset(e.target.value as '0' | '1' | '2' | '3')}
            >
              <option value="0">Aucune caution calculée</option>
              <option value="1">1 mois de loyer</option>
              <option value="2">2 mois de loyer</option>
              <option value="3">3 mois de loyer</option>
            </Select>
          </div>
          <div>
            <Label>Jour d’échéance (1–31)</Label>
            <Input type="number" min={1} max={31} value={rentDueDay} onChange={(e) => setRentDueDay(e.target.value)} />
          </div>
          {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button type="submit">Créer le bail</Button>
            <Button type="button" variant="ghost" className="py-2 text-sm" onClick={() => setAddLeaseOpen(false)}>
              Fermer
            </Button>
          </div>
        </form>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="space-y-6">
        <Card
          id="filtres-baux"
          className="scroll-mt-24 overflow-hidden !p-0 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-slate-900/[0.06] dark:shadow-none dark:ring-slate-600/40"
        >
          <div className="border-b border-slate-200/90 bg-gradient-to-b from-slate-50 to-white px-4 py-3 sm:px-5 dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/95">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Filtres</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-50">
              Affiner la liste avant d’ouvrir un bien
            </p>
          </div>
          <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
            <fieldset className="border-0 p-0">
              <legend className="sr-only">Filtrer par statut du bail</legend>
              <p className="mb-2 border-l-2 border-brand-600 py-0.5 pl-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:border-brand-500 dark:text-slate-400">
                Statut du bail
              </p>
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
                      className={`${filterPillBase} inline-flex items-center gap-2 ${on ? filterPillOn : filterPillOff}`}
                    >
                      <span>{t.label}</span>
                      <span className={`tabular-nums text-xs ${on ? 'text-brand-800/80 dark:text-brand-200/90' : 'text-slate-400 dark:text-slate-500'}`}>
                        {t.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="border-0 p-0">
              <legend className="sr-only">Filtrer par nature du local</legend>
              <div className="mb-2 flex flex-wrap items-center gap-2 border-l-2 border-slate-300 py-0.5 pl-3 dark:border-slate-600">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-400">
                  Nature du local
                </p>
                <HelpHint
                  className="shrink-0 [&_button]:opacity-75"
                  title="Chaque bail est relié à une unité déclarée sur la fiche Bien. Filtrez par type (appartement, maison, bureau…)."
                />
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                {[
                  { id: 'all' as const, label: 'Tous types', countKey: 'all' as const },
                  ...UNIT_KIND_OPTIONS.map((o) => ({
                    id: o.value as WellViewFilter,
                    label: o.label,
                    countKey: o.value,
                  })),
                ].map((t) => {
                  const on = wellViewFilter === t.id;
                  const count = wellViewCounts[t.countKey] ?? 0;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setWellViewFilter(t.id)}
                      className={`${filterPillBase} inline-flex items-center gap-2 ${on ? filterPillOn : filterPillOff}`}
                    >
                      <span>{t.label}</span>
                      <span className={`tabular-nums text-xs ${on ? 'text-brand-800/80 dark:text-brand-200/90' : 'text-slate-400 dark:text-slate-500'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 border-l-2 border-slate-300 py-0.5 pl-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:border-slate-600 dark:text-slate-400">
                  Génération des loyers
                </p>
                <Label htmlFor="leases-gen-year" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Année utilisée par le bouton « Générer loyers » sur chaque bail
                </Label>
                <Input
                  id="leases-gen-year"
                  className="mt-1.5 max-w-[8rem] border-slate-200 shadow-sm dark:border-slate-600"
                  value={genYear}
                  onChange={(e) => setGenYear(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <a
                href="#liste-des-baux"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Aller à la liste
                <span aria-hidden className="text-slate-400">↓</span>
              </a>
            </div>
          </div>
        </Card>

        <section id="liste-des-baux" className="min-w-0 scroll-mt-24">
          <Card className="overflow-hidden !p-0 shadow-sm ring-1 ring-slate-900/[0.04] dark:ring-slate-600/35">
            <div className="border-b border-slate-200/90 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900/85 sm:px-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Vos baux, regroupés par bien</h2>
                    <HelpHint
                      className="shrink-0 align-middle"
                      title="Ouvrez un bien pour voir ses baux. Actions : fiche location, génération des loyers (année définie dans les filtres ci-dessus), pièce jointe du contrat."
                    />
                  </div>
                  <p className="mt-2 rounded-lg border border-slate-200/80 bg-slate-50/90 px-3 py-2 text-sm leading-relaxed text-slate-700 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                    {filterSummary}
                  </p>
                </div>
                <div className="shrink-0 rounded-xl border border-slate-200/90 bg-slate-50 px-4 py-3 text-center dark:border-slate-600 dark:bg-slate-800/80">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Lignes visibles</p>
                  <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{filteredLeases.length}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    bail{filteredLeases.length !== 1 ? 'x' : ''} dans cette vue
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50/50 p-4 dark:bg-slate-950/20 sm:p-5">
          {groupedLeases.map(([gKey, rows], groupIdx) => {
            const head = rows[0]!;
            const { name: bName, commune, city } = head.unit.building;
            return (
              <details
                key={gKey}
                data-lease-group-idx={groupIdx}
                className="group rounded-xl border border-slate-200/90 bg-white shadow-sm open:ring-2 open:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-900/40 dark:open:bg-slate-900/90"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm marker:hidden [&::-webkit-details-marker]:hidden sm:px-4">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-slate-50 text-slate-500 transition group-open:rotate-180 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    aria-hidden
                  >
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900 dark:text-slate-100">{bName}</span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                      {commune}, {city}
                      {rows.length > 1 ? (
                        <span className="ml-2 inline-block rounded-md bg-brand-100/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-900 dark:bg-brand-500/25 dark:text-brand-100">
                          {rows.length} unités sur ce bien
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">
                      Cliquer pour afficher ou masquer les baux de ce bien
                    </span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1.5 text-center dark:bg-slate-800/90">
                    <span className="block text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">{rows.length}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {rows.length === 1 ? 'bail' : 'baux'}
                    </span>
                  </span>
                </summary>
                <ul
                  className={`border-t border-slate-100/90 bg-slate-50/95 dark:border-slate-700 dark:bg-slate-950/40 ${
                    rows.length > 1
                      ? 'divide-none space-y-4 p-3 sm:p-4'
                      : 'divide-y divide-slate-100 dark:divide-slate-700/80'
                  }`}
                >
                  {rows.map((l, rowIdx) => {
                    const multiLot = rows.length > 1;
                    const stripeClass =
                      rowIdx % 3 === 0
                        ? 'border-l-brand-500'
                        : rowIdx % 3 === 1
                          ? 'border-l-violet-500'
                          : 'border-l-teal-500';
                    return (
                    <li
                      key={l.id}
                      id={`lease-row-${l.id}`}
                      className={
                        multiLot
                          ? `flex flex-col gap-3 overflow-hidden rounded-xl border border-slate-200/95 border-l-4 bg-white/95 shadow-md shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.04] dark:border-slate-600 dark:bg-slate-900/85 dark:shadow-black/25 dark:ring-slate-700/30 ${stripeClass} lg:flex-row lg:items-start lg:justify-between`
                          : 'flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:justify-between'
                      }
                    >
                      <div className={`min-w-0 flex-1 space-y-3 ${multiLot ? 'px-4 pb-4 pt-0 sm:px-5 sm:pb-5' : ''}`}>
                        {multiLot ? (
                          <div className="-mx-4 mb-1 flex flex-wrap items-center gap-2 border-b border-slate-200/90 bg-gradient-to-r from-slate-100/95 via-brand-50/40 to-slate-50/90 px-4 py-2.5 sm:-mx-5 sm:px-5 dark:border-slate-600 dark:from-slate-800/90 dark:via-brand-950/35 dark:to-slate-900/90">
                            <span
                              className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm ${rowIdx % 3 === 0 ? 'bg-brand-600 dark:bg-brand-500' : rowIdx % 3 === 1 ? 'bg-violet-600 dark:bg-violet-500' : 'bg-teal-600 dark:bg-teal-500'}`}
                              title={`Unité ${rowIdx + 1} sur ${rows.length}`}
                            >
                              {rowIdx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Unité
                              </p>
                              <p className="text-base font-bold leading-tight text-slate-900 dark:text-slate-50">
                                {unitKindLabel(l.unit.kind)} — {l.unit.label}
                              </p>
                            </div>
                          </div>
                        ) : null}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Locataire</p>
                          <p className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {l.tenant.firstName} {l.tenant.lastName}
                          </p>
                        </div>
                        <div
                          className={`rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800/50 ${multiLot ? 'border-slate-200/80 dark:border-slate-600/80' : ''}`}
                        >
                          {!multiLot ? (
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {unitKindLabel(l.unit.kind)} — {l.unit.label}
                          </p>
                          ) : (
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                              Détail financier
                            </p>
                          )}
                          <p className={`text-sm ${multiLot ? 'mt-1.5' : 'mt-2'}`}>
                            <span className="font-medium text-slate-500">Loyer :</span>{' '}
                            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                              {fcfa(Number(l.monthlyRent))}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400"> / mois · échéance le {l.rentDueDay}</span>
                          </p>
                          {l.depositAmount != null && Number(l.depositAmount) > 0 ? (
                            <p className="mt-1.5 text-sm">
                              <span className="font-medium text-slate-500">Caution :</span>{' '}
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {fcfa(Number(l.depositAmount))}
                              </span>
                              {l.depositPaidAt ? (
                                <span className="text-emerald-700 dark:text-emerald-400">
                                  {' '}
                                  · encaissée le {l.depositPaidAt.slice(0, 10)}
                                </span>
                              ) : (
                                <span className="text-amber-800 dark:text-amber-300"> · non marquée encaissée</span>
                              )}
                            </p>
                          ) : null}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Bail : du {l.startDate.slice(0, 10)}
                          {l.endDate ? ` au ${l.endDate.slice(0, 10)}` : ' (sans fin indiquée)'} ·{' '}
                          <span
                            className={`font-semibold ${l.active ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}
                          >
                            {l.active ? 'Actif' : 'Inactif'}
                          </span>
                        </p>
                        <details className="rounded-lg border border-slate-200 bg-slate-50/60 dark:border-slate-600 dark:bg-slate-800/40">
                          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 marker:hidden select-none dark:text-slate-400 [&::-webkit-details-marker]:hidden">
                            <span className="inline-flex flex-wrap items-center gap-2">
                              Contrat de bail
                              {l.contractFileKey ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-normal text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200">
                                  Fichier
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-normal text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                                  Aucun
                                </span>
                              )}
                              <span
                                className="inline-flex"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                role="presentation"
                              >
                                <HelpHint
                                  className="!size-5 [&_svg]:!size-3"
                                  title="Cliquez sur la ligne pour déplier. Joignez un PDF ou une photo du contrat (15 Mo max) ; un nouveau fichier remplace l’ancien."
                                />
                              </span>
                            </span>
                          </summary>
                          <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-600">
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
                      <div
                        className={`flex flex-wrap gap-2 ${multiLot ? 'px-4 pb-4 sm:px-5 sm:pb-5 lg:items-start lg:pt-5 lg:pb-5' : ''}`}
                      >
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
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>

            {leases.length === 0 && (
              <div className="border-t border-slate-200/80 bg-white px-4 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40 sm:px-6">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucun bail enregistré pour le moment.</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Commencez par créer un bail ci-dessus, ou vérifiez vos biens et unités.</p>
                <Button type="button" className="mt-5 py-2 text-sm" onClick={() => openAddLeaseForm()}>
                  Créer un premier bail
                </Button>
              </div>
            )}
            {leases.length > 0 && filteredLeases.length === 0 && (
              <div className="border-t border-slate-200/80 bg-white px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40 sm:px-6">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucun bail ne correspond à vos filtres.</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Élargissez la nature du local ou le statut dans les filtres ci-dessus, ou{' '}
                  <a href="#filtres-baux" className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400">
                    remonter aux filtres
                  </a>
                  .
                </p>
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
