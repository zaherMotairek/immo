import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { SmartLink } from '@/components/SmartLink';
import { api } from '@/lib/api';
import { fcfa, INPUT_AMOUNT_FCFA_LABEL } from '@/lib/format';
import { AppPageTitle } from '@/components/AppPageTitle';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { AmountFcfaInput, Button, Card, HelpHint, Input, Label, Select } from '@/components/ui';
import { chargeCategoryLabel, chargeCategoryOptions } from '@/lib/chargeCategories';
import { listBlockRowClass } from '@/lib/listTableStyles';
import { unitKindLabel } from '@/lib/unitKind';

type ChargeRow = {
  id: string;
  category: string;
  label: string;
  amount: unknown;
  periodYear: number;
  periodMonth: number | null;
  paid: boolean;
  notes?: string | null;
  building: { id: string; name: string };
  unit: { id: string; label: string; kind?: string } | null;
};

type Summary = {
  year: number;
  month?: number | null;
  scope?: 'year' | 'month';
  totalCharges: number;
  unpaidCharges: number;
  highlights: {
    impotsEtTaxes: number;
    chargesCoproEtHonoraires: number;
    securite: number;
    personnel: number;
  };
  byCategory: Record<string, number>;
};

type BuildingOpt = { id: string; name: string; units: { id: string; label: string; kind: string }[] };

function readInitialPeriod(): { y: number; viewMonth: number | 'all' } {
  const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const now = new Date();
  let y = now.getFullYear();
  let viewMonth: number | 'all' = now.getMonth() + 1;
  if (sp) {
    const yp = sp.get('year');
    if (yp) {
      const n = Number(yp);
      if (Number.isFinite(n)) y = n;
    }
    const mp = sp.get('month');
    if (mp === 'all') viewMonth = 'all';
    else if (mp != null && mp !== '') {
      const n = Number(mp);
      if (Number.isFinite(n) && n >= 1 && n <= 12) viewMonth = n;
    }
  }
  return { y, viewMonth };
}

const MOIS_LONGS = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2000, i, 1)),
);

export function ChargesPage() {
  useRegisterRootSectionFallback();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const chargesReturnLocation = `${routerLocation.pathname}${routerLocation.search}`;
  const focusChargeId = searchParams.get('focus');
  const [y, setY] = useState(() => readInitialPeriod().y);
  const [viewMonth, setViewMonth] = useState<number | 'all'>(() => readInitialPeriod().viewMonth);
  const [rows, setRows] = useState<ChargeRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [buildings, setBuildings] = useState<BuildingOpt[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [category, setCategory] = useState<string>('FEES');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [periodMonth, setPeriodMonth] = useState('');
  const [notes, setNotes] = useState('');
  const [paidOnCreate, setPaidOnCreate] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [togglingPaidId, setTogglingPaidId] = useState<string | null>(null);

  const periodQuery = useCallback(() => {
    const qs = new URLSearchParams();
    qs.set('year', String(y));
    qs.set('month', viewMonth === 'all' ? 'all' : String(viewMonth));
    return qs.toString();
  }, [y, viewMonth]);

  const load = useCallback(() => {
    const q = periodQuery();
    api<ChargeRow[]>(`/charges?${q}`).then(setRows).catch(() => setRows([]));
    api<Summary>(`/charges/summary?${q}`).then(setSummary).catch(() => setSummary(null));
    api<BuildingOpt[]>('/buildings').then(setBuildings).catch(() => setBuildings([]));
  }, [periodQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const q = new URLSearchParams(prev);
        q.set('year', String(y));
        q.set('month', viewMonth === 'all' ? 'all' : String(viewMonth));
        return q;
      },
      { replace: true },
    );
  }, [y, viewMonth, setSearchParams]);

  useEffect(() => {
    const yp = searchParams.get('year');
    const mp = searchParams.get('month');
    if (yp) {
      const n = Number(yp);
      if (Number.isFinite(n)) setY(n);
    }
    if (mp === 'all') setViewMonth('all');
    else if (mp != null && mp !== '') {
      const n = Number(mp);
      if (Number.isFinite(n) && n >= 1 && n <= 12) setViewMonth(n);
    }
  }, [searchParams]);

  useEffect(() => {
    if (viewMonth !== 'all') setPeriodMonth(String(viewMonth));
    else setPeriodMonth('');
  }, [viewMonth]);

  useEffect(() => {
    if (!focusChargeId || rows.length === 0) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(`charge-${focusChargeId}`);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('ring-2', 'ring-brand-500', 'ring-offset-1', 'rounded-xl');
      window.setTimeout(() => el.classList.remove('ring-2', 'ring-brand-500', 'ring-offset-1', 'rounded-xl'), 2400);
    }, 120);
    return () => clearTimeout(t);
  }, [focusChargeId, rows]);

  const units = buildings.find((b) => b.id === buildingId)?.units ?? [];

  function resetNewChargeForm() {
    setBuildingId('');
    setUnitId('');
    setCategory('FEES');
    setLabel('');
    setAmount('');
    setNotes('');
    setPaidOnCreate(false);
    setErr(null);
    setPeriodMonth(viewMonth === 'all' ? '' : String(viewMonth));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api('/charges', {
        method: 'POST',
        json: {
          buildingId,
          unitId: unitId || undefined,
          category,
          label,
          amount: Number(amount),
          periodYear: y,
          periodMonth: periodMonth ? Number(periodMonth) : undefined,
          notes: notes.trim() || undefined,
          paid: paidOnCreate,
        },
      });
      setLabel('');
      setAmount('');
      setNotes('');
      setPaidOnCreate(false);
      load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  async function setPaid(id: string, paid: boolean) {
    setTogglingPaidId(id);
    try {
      await api(`/charges/${id}`, { method: 'PATCH', json: { paid } });
      await load();
    } catch (e2) {
      alert(e2 instanceof Error ? e2.message : 'Mise à jour impossible.');
    } finally {
      setTogglingPaidId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette charge ?')) return;
    try {
      await api(`/charges/${id}`, { method: 'DELETE' });
      load();
    } catch (e2) {
      alert(e2 instanceof Error ? e2.message : 'Suppression impossible.');
    }
  }

  const periodeLibelle =
    viewMonth === 'all'
      ? `Année ${y}`
      : `${MOIS_LONGS[viewMonth - 1].charAt(0).toUpperCase()}${MOIS_LONGS[viewMonth - 1].slice(1)} ${y}`;

  return (
    <div className="space-y-6">
      {focusChargeId ? (
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
          <button
            type="button"
            className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
            onClick={() => {
              const q = new URLSearchParams();
              q.set('year', String(y));
              q.set('month', viewMonth === 'all' ? 'all' : String(viewMonth));
              navigate(`/charges?${q.toString()}`, { replace: true });
            }}
          >
            Fermer la surbrillance (lien direct)
          </button>
        </p>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <AppPageTitle
          className="max-w-3xl"
          iconTo="/charges"
          title="Charges & impôts"
          hintTitle="Vue normale : un mois précis (salaires, factures mensuelles). Basculer sur « Toute l’année » pour voir toutes les lignes de l’exercice, y compris les charges saisies « année entière » sans mois. Montants en FCFA."
        />
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="charges-filter-year">Année</Label>
            <Input
              id="charges-filter-year"
              className="mt-1 w-28"
              type="number"
              value={y}
              onChange={(e) => setY(Number(e.target.value))}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <Label htmlFor="charges-filter-month" className="mb-0">
                Période affichée
              </Label>
              <HelpHint
                className="align-middle"
                title="Mois calendaire par défaut. « Toute l’année » : vue sur 12 mois et charges sans mois précis."
              />
            </div>
            <Select
              id="charges-filter-month"
              className="min-w-[12.5rem]"
              value={viewMonth === 'all' ? 'all' : String(viewMonth)}
              onChange={(e) => {
                const v = e.target.value;
                setViewMonth(v === 'all' ? 'all' : Number(v));
              }}
            >
              {MOIS_LONGS.map((name, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {name.charAt(0).toUpperCase() + name.slice(1)} {y}
                </option>
              ))}
              <option value="all">Toute l’année ({y})</option>
            </Select>
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Synthèse et liste : <strong className="text-slate-800 dark:text-slate-200">{periodeLibelle}</strong>
        {viewMonth === 'all'
          ? ' — inclut les charges libellées « année entière » (sans mois au formulaire).'
          : ' — uniquement les charges imputées à ce mois.'}
      </p>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Total charges</p>
            <p className="mt-1 text-xl font-semibold tabular-nums dark:text-slate-100">{fcfa(summary.totalCharges)}</p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{periodeLibelle}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Non réglées</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-amber-800 dark:text-amber-300">{fcfa(summary.unpaidCharges)}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Impôts & taxes</p>
            <p className="mt-1 text-xl font-semibold tabular-nums dark:text-slate-100">{fcfa(summary.highlights.impotsEtTaxes)}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Copro / honoraires</p>
            <p className="mt-1 text-xl font-semibold tabular-nums dark:text-slate-100">{fcfa(summary.highlights.chargesCoproEtHonoraires)}</p>
          </Card>
          <Card className="!p-4 ring-1 ring-slate-900/[0.04] dark:ring-white/[0.06]">
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Sécurité</p>
            <p className="mt-1 text-xl font-semibold tabular-nums dark:text-slate-100">
              {fcfa(summary.highlights.securite ?? 0)}
            </p>
          </Card>
          <Card className="!p-4 ring-1 ring-slate-900/[0.04] dark:ring-white/[0.06]">
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Personnel</p>
            <p className="mt-1 text-xl font-semibold tabular-nums dark:text-slate-100">
              {fcfa(summary.highlights.personnel ?? 0)}
            </p>
          </Card>
        </div>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Nouvelle charge</h2>
          <HelpHint
            className="align-middle"
            title="Cochez « Déjà réglée » si vous enregistrez la charge au moment du paiement. Sinon, ajoutez-la puis, dans la liste ci-dessous, utilisez « Marquer comme payé »."
          />
        </div>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Bien concerné</Label>
            <Select value={buildingId} onChange={(e) => { setBuildingId(e.target.value); setUnitId(''); }} required>
              <option value="">Choisir…</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Unité (optionnel)</Label>
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">Tout le bien</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {unitKindLabel(u.kind)} — {u.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Catégorie</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {chargeCategoryOptions().map(({ value, label: lbl }) => (
                <option key={value} value={value}>
                  {lbl}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Label htmlFor="charge-imputation-month" className="mb-0">
                Imputation (mois)
              </Label>
              <HelpHint
                className="align-middle"
                title="S’aligne sur le mois affiché en haut de page. « Année entière » pour une taxe ou charge unique sur tout l’exercice — visible surtout en vue « Toute l’année »."
              />
            </div>
            <Select id="charge-imputation-month" value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)}>
              <option value="">Année entière</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {MOIS_LONGS[m - 1].charAt(0).toUpperCase()}
                  {MOIS_LONGS[m - 1].slice(1)} ({m})
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Libellé</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} required placeholder="Ex. Facture vigile Janvier — Société X" />
          </div>
          <div>
            <Label>{INPUT_AMOUNT_FCFA_LABEL}</Label>
            <AmountFcfaInput min={0} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-3 dark:border-slate-600 dark:bg-slate-800/40">
            <input
              id="charge-paid-on-create"
              type="checkbox"
              checked={paidOnCreate}
              onChange={(e) => setPaidOnCreate(e.target.checked)}
              className="mt-1 size-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <Label htmlFor="charge-paid-on-create" className="mb-0 cursor-pointer font-semibold">
                Déjà réglée (payée)
              </Label>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                À cocher si vous avez déjà payé cette dépense (salaire, facture…). Sinon la ligne apparaîtra comme « À payer »
                jusqu’à ce que vous la marquiez dans la liste.
              </p>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Notes (optionnel)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Réf. contrat, N° de facture, nom du salarié ou du prestataire, période couverte…"
              className="w-full resize-y rounded-xl border border-slate-200/95 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition placeholder:font-normal placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/18 dark:border-slate-600 dark:bg-slate-950/50 dark:text-slate-50 dark:placeholder:text-slate-400 dark:focus:ring-brand-500/22"
            />
          </div>
          {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button type="submit">Ajouter</Button>
            <Button type="button" variant="secondary" onClick={resetNewChargeForm}>
              Annuler
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Détail — {periodeLibelle}</h2>
          <HelpHint
            className="align-middle"
            title="Colonne de droite : marquer une charge comme payée après virement ou espèces, ou repasser en « À payer » si besoin. Le bandeau du haut « Non réglées » se met à jour automatiquement."
          />
        </div>
        <ul className="list-none">
          {rows.map((c, rowIndex) => (
            <li key={c.id} id={`charge-${c.id}`} className={listBlockRowClass(rowIndex)}>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {c.label}{' '}
                  <span className="font-normal text-slate-500 dark:text-slate-400">· {chargeCategoryLabel(c.category)}</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {c.unit ? (
                    <>
                      <SmartLink
                        to={`/biens/${c.building.id}?unitId=${encodeURIComponent(c.unit.id)}&hintUnitLabel=${encodeURIComponent(c.unit.label)}&returnLocation=${encodeURIComponent(chargesReturnLocation)}`}
                        className="font-medium text-brand-800 underline-offset-2 hover:underline dark:text-brand-400"
                      >
                        {c.building.name}
                      </SmartLink>
                      {' — '}
                      {unitKindLabel(c.unit.kind)} — {c.unit.label}
                    </>
                  ) : (
                    <SmartLink
                      to={`/biens/${c.building.id}?returnLocation=${encodeURIComponent(chargesReturnLocation)}`}
                      className="font-medium text-brand-800 underline-offset-2 hover:underline dark:text-brand-400"
                    >
                      {c.building.name}
                    </SmartLink>
                  )}
                  {c.periodMonth ? ` · mois ${c.periodMonth}` : ''}
                </p>
                {c.notes?.trim() ? (
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">{c.notes.trim()}</p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="font-semibold tabular-nums dark:text-slate-100">{fcfa(Number(c.amount))}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    c.paid
                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                      : 'bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-200'
                  }`}
                >
                  {c.paid ? 'Payé' : 'À payer'}
                </span>
                <div className="flex flex-wrap justify-end gap-2">
                  {c.paid ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="py-1.5 text-xs"
                      disabled={togglingPaidId === c.id}
                      onClick={() => void setPaid(c.id, false)}
                    >
                      Marquer non payé
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="py-1.5 text-xs font-semibold"
                      disabled={togglingPaidId === c.id}
                      onClick={() => void setPaid(c.id, true)}
                    >
                      Marquer comme payé
                    </Button>
                  )}
                  <Button variant="danger" className="py-1.5 text-xs" onClick={() => remove(c.id)} title="Supprimer">
                    ×
                  </Button>
                </div>
              </div>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Aucune charge pour {periodeLibelle.toLowerCase()}.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
