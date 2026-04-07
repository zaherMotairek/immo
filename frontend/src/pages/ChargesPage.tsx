import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { eur } from '@/lib/format';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import { unitKindLabel } from '@/lib/unitKind';

const CATEGORIES = ['TAX', 'FEES', 'INSURANCE', 'MAINTENANCE', 'UTILITIES', 'OTHER'] as const;

type ChargeRow = {
  id: string;
  category: string;
  label: string;
  amount: unknown;
  periodYear: number;
  periodMonth: number | null;
  paid: boolean;
  building: { name: string };
  unit: { label: string; kind?: string } | null;
};

type Summary = {
  year: number;
  totalCharges: number;
  unpaidCharges: number;
  highlights: { impotsEtTaxes: number; chargesCoproEtHonoraires: number };
  byCategory: Record<string, number>;
};

type BuildingOpt = { id: string; name: string; units: { id: string; label: string; kind: string }[] };

export function ChargesPage() {
  const [searchParams] = useSearchParams();
  const focusChargeId = searchParams.get('focus');
  const year = new Date().getFullYear();
  const [y, setY] = useState(year);
  const [rows, setRows] = useState<ChargeRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [buildings, setBuildings] = useState<BuildingOpt[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [category, setCategory] = useState<string>('FEES');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [periodMonth, setPeriodMonth] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    api<ChargeRow[]>(`/charges?year=${y}`).then(setRows).catch(() => setRows([]));
    api<Summary>(`/charges/summary?year=${y}`).then(setSummary).catch(() => setSummary(null));
    api<BuildingOpt[]>('/buildings').then(setBuildings).catch(() => setBuildings([]));
  }, [y]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const yp = searchParams.get('year');
    if (yp) {
      const n = Number(yp);
      if (!Number.isNaN(n)) setY(n);
    }
  }, [searchParams]);

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
        },
      });
      setLabel('');
      setAmount('');
      setPeriodMonth('');
      load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Charges & impôts</h1>
          <p className="text-sm text-slate-600">Foncière, copropriété, assurance, travaux, etc.</p>
        </div>
        <div>
          <Label>Année affichée</Label>
          <Input className="w-28" type="number" value={y} onChange={(e) => setY(Number(e.target.value))} />
        </div>
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase text-slate-500">Total charges</p>
            <p className="mt-1 text-xl font-semibold">{eur(summary.totalCharges)}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase text-slate-500">Non réglées</p>
            <p className="mt-1 text-xl font-semibold text-amber-800">{eur(summary.unpaidCharges)}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase text-slate-500">Impôts / taxes</p>
            <p className="mt-1 text-xl font-semibold">{eur(summary.highlights.impotsEtTaxes)}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase text-slate-500">Copro / honoraires</p>
            <p className="mt-1 text-xl font-semibold">{eur(summary.highlights.chargesCoproEtHonoraires)}</p>
          </Card>
        </div>
      )}

      <Card>
        <h2 className="mb-4 font-semibold">Nouvelle charge</h2>
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
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Mois (optionnel)</Label>
            <Select value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)}>
              <option value="">Année entière</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Libellé</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} required />
          </div>
          <div>
            <Label>Montant (€)</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
          <div className="sm:col-span-2">
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Détail {y}</h2>
        <ul className="divide-y divide-slate-100">
          {rows.map((c) => (
            <li
              key={c.id}
              id={`charge-${c.id}`}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {c.label} · {c.category}
                </p>
                <p className="text-xs text-slate-500">
                  {c.building.name}
                  {c.unit ? ` — ${unitKindLabel(c.unit.kind)} — ${c.unit.label}` : ''}
                  {c.periodMonth ? ` · mois ${c.periodMonth}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{eur(Number(c.amount))}</span>
                <span className="text-xs">{c.paid ? 'Payé' : 'À payer'}</span>
                <Button variant="danger" className="py-1.5 text-xs" onClick={() => remove(c.id)}>
                  ×
                </Button>
              </div>
            </li>
          ))}
          {rows.length === 0 && <li className="py-6 text-center text-sm text-slate-500">Aucune charge cette année.</li>}
        </ul>
      </Card>
    </div>
  );
}
