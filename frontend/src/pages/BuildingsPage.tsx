import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { COMMUNE_SUGGESTIONS, IVORY_COAST_CITIES } from '@/lib/ciLocation';
import { LinkButton } from '@/components/LinkButton';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import { BUILDING_STRUCTURE_OPTIONS, type BuildingStructureValue } from '@/lib/buildingStructure';

type BuildingRow = {
  id: string;
  name: string;
  city: string;
  commune?: string | null;
  postalCode: string | null;
  structureKind?: BuildingStructureValue;
  _count: { units: number };
};

const KIND_QUERY_VALUES = ['APARTMENT', 'HOUSE', 'LAND', 'WAREHOUSE'] as const;
type AllowedKind = (typeof KIND_QUERY_VALUES)[number] | '';

const BIEN_TYPE_FILTERS: { kind: AllowedKind; label: string; hint: string }[] = [
  { kind: '', label: 'Tous les biens', hint: 'Tout le patrimoine' },
  { kind: 'APARTMENT', label: 'Immeubles', hint: 'Copropriété, appartements' },
  { kind: 'HOUSE', label: 'Maisons & villas', hint: 'Maisons individuelles' },
  { kind: 'LAND', label: 'Terrains', hint: 'Parcelles nues ou à bâtir' },
  { kind: 'WAREHOUSE', label: 'Entrepôts', hint: 'Locaux industriels & stockage' },
];

function normalizeKindParam(raw: string | null): AllowedKind {
  if (!raw?.trim()) return '';
  const k = raw.trim().toUpperCase();
  return (KIND_QUERY_VALUES as readonly string[]).includes(k) ? (k as AllowedKind) : '';
}

function structureKindShort(k?: BuildingStructureValue | string | null) {
  if (k === 'IMMEUBLE') return 'Multi-lots';
  return 'Un seul lot';
}

export function BuildingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const kindFilter = useMemo(() => normalizeKindParam(searchParams.get('kind')), [searchParams]);

  function setKindFilter(next: AllowedKind) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (!next) p.delete('kind');
        else p.set('kind', next);
        return p;
      },
      { replace: true },
    );
  }

  const [rows, setRows] = useState<BuildingRow[]>([]);
  const [name, setName] = useState('');
  const [cityChoice, setCityChoice] = useState<string>(IVORY_COAST_CITIES[0]);
  const [cityOther, setCityOther] = useState('');
  const [communeChoice, setCommuneChoice] = useState<string>(COMMUNE_SUGGESTIONS[0]);
  const [communeOther, setCommuneOther] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [structureKind, setStructureKind] = useState<BuildingStructureValue>('MONO_LOT');
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    const q = kindFilter ? `?unitKind=${encodeURIComponent(kindFilter)}` : '';
    api<BuildingRow[]>(`/buildings${q}`).then(setRows).catch(() => setRows([]));
  }, [kindFilter]);

  useEffect(() => {
    load();
  }, [load]);

  function resolvedCity() {
    return cityChoice === 'Autre' ? cityOther.trim() : cityChoice;
  }

  function resolvedCommune() {
    return communeChoice === 'Autre' ? communeOther.trim() : communeChoice;
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const city = resolvedCity();
    const commune = resolvedCommune();
    if (!city || !commune) {
      setErr('Indiquez une ville et une commune / zone.');
      return;
    }
    try {
      await api('/buildings', {
        method: 'POST',
        json: {
          name,
          city,
          commune,
          address: address.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
        },
      });
      setName('');
      setAddress('');
      setPostalCode('');
      setCityOther('');
      setCommuneOther('');
      load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Biens immobiliers</h1>
        <p className="text-sm text-slate-600">
          Immeuble collectif, villa, entrepôt, terrain… même principe : nom du site + localisation (Côte d&apos;Ivoire).
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Afficher</p>
        <div className="flex flex-wrap gap-2">
          {BIEN_TYPE_FILTERS.map((f) => {
            const active = kindFilter === f.kind;
            return (
              <button
                key={f.kind || 'all'}
                type="button"
                title={f.hint}
                onClick={() => setKindFilter(f.kind)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {kindFilter
            ? 'Sites ayant au moins une unité de ce type. Le nombre d’unités affiché compte uniquement celles du filtre.'
            : 'Vue complète : tous les sites, avec le nombre total d’unités par bien.'}
        </p>
      </div>

      <Card>
        <h2 className="mb-1 font-semibold">Nouveau bien</h2>
        <p className="mb-4 text-sm text-slate-600">
          Un <strong>immeuble</strong> est un seul bien avec plusieurs unités (plusieurs baux). Une <strong>villa</strong>, un
          entrepôt loué en entier ou un terrain = un seul lot : une unité, un bail.
        </p>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="new-building-structure">Organisation du bien</Label>
            <Select
              id="new-building-structure"
              value={structureKind}
              onChange={(e) => setStructureKind(e.target.value as BuildingStructureValue)}
            >
              {BUILDING_STRUCTURE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} title={o.description}>
                  {o.label}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-slate-500">
              {BUILDING_STRUCTURE_OPTIONS.find((o) => o.value === structureKind)?.description}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label>Nom ou référence du bien</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Résidence Ranga, Villa Dupont, Entrepôt Port-Bouët…"
            />
          </div>
          <div>
            <Label>Ville</Label>
            <Select value={cityChoice} onChange={(e) => setCityChoice(e.target.value)}>
              {IVORY_COAST_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            {cityChoice === 'Autre' && (
              <Input className="mt-2" value={cityOther} onChange={(e) => setCityOther(e.target.value)} placeholder="Nom de la ville" />
            )}
          </div>
          <div>
            <Label>Commune / zone</Label>
            <Select value={communeChoice} onChange={(e) => setCommuneChoice(e.target.value)}>
              {COMMUNE_SUGGESTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            {communeChoice === 'Autre' && (
              <Input className="mt-2" value={communeOther} onChange={(e) => setCommuneOther(e.target.value)} placeholder="Ex. Marcory Zone 4" />
            )}
          </div>
          <div className="sm:col-span-2">
            <Label>Adresse ou précision (optionnel)</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rue, repère, accès…" />
          </div>
          <div>
            <Label>Code postal (optionnel)</Label>
            <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          </div>
          {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
          <div className="sm:col-span-2">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Liste</h2>
        <ul className="divide-y divide-slate-100">
          {rows.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <Link to={`/biens/${b.id}`} className="font-medium text-brand-700 hover:underline">
                  {b.name}
                </Link>
                <p className="text-xs text-slate-600">
                  {[b.commune ?? '—', b.city].join(', ')}
                  {b.postalCode ? ` · ${b.postalCode}` : ''} · {b._count.units} unité{b._count.units !== 1 ? 's' : ''} ·{' '}
                  {structureKindShort(b.structureKind)}
                </p>
              </div>
              <LinkButton to={`/biens/${b.id}`} variant="secondary" className="py-2 text-xs">
                Ouvrir
              </LinkButton>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="py-6 text-center text-sm text-slate-500">
              {kindFilter ? 'Aucun bien ne correspond à ce filtre pour le moment.' : 'Aucun bien pour le moment.'}
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
