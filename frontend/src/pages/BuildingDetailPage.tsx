import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import {
  BUILDING_STRUCTURE_OPTIONS,
  type BuildingStructureValue,
} from '@/lib/buildingStructure';
import { UNIT_KIND_OPTIONS } from '@/lib/unitKind';

type Unit = {
  id: string;
  label: string;
  kind?: string;
  floor: number | null;
  surfaceM2: unknown;
  rooms: number | null;
  defaultRent: unknown;
  description?: string | null;
  leases?: Array<{ tenant: { firstName: string; lastName: string } }>;
};

type Building = {
  id: string;
  name: string;
  city: string;
  commune: string | null;
  address: string | null;
  postalCode: string | null;
  country: string;
  structureKind: BuildingStructureValue;
  units: Unit[];
};

export function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [b, setB] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [floor, setFloor] = useState('');
  const [surfaceM2, setSurfaceM2] = useState('');
  const [rooms, setRooms] = useState('');
  const [defaultRent, setDefaultRent] = useState('');
  const [kind, setKind] = useState('APARTMENT');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [structureKindDraft, setStructureKindDraft] = useState<BuildingStructureValue>('MONO_LOT');
  const [structureErr, setStructureErr] = useState<string | null>(null);
  const [structureSaving, setStructureSaving] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    api<Building>(`/buildings/${id}`)
      .then((data) => {
        setB(data);
        setStructureKindDraft(data.structureKind ?? 'MONO_LOT');
        setLoadError(null);
      })
      .catch((e) => {
        setB(null);
        setLoadError(e instanceof Error ? e.message : 'Impossible de charger ce bien.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setErr(null);
    try {
      await api(`/buildings/${id}/units`, {
        method: 'POST',
        json: {
          label,
          floor: floor ? Number(floor) : undefined,
          surfaceM2: surfaceM2 ? Number(surfaceM2) : undefined,
          rooms: rooms ? Number(rooms) : undefined,
          defaultRent: defaultRent ? Number(defaultRent) : undefined,
          kind,
          description: description.trim() || undefined,
        },
      });
      setLabel('');
      setFloor('');
      setSurfaceM2('');
      setRooms('');
      setDefaultRent('');
      setKind('APARTMENT');
      setDescription('');
      load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  async function removeUnit(unitId: string) {
    if (!confirm('Supprimer cette unité ? Les baux et loyers liés seront aussi supprimés.')) return;
    try {
      await api(`/units/${unitId}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Suppression impossible.');
    }
  }

  async function updateUnitKind(unitId: string, newKind: string) {
    try {
      await api(`/units/${unitId}`, { method: 'PATCH', json: { kind: newKind } });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Modification impossible.');
    }
  }

  async function saveStructureKind(e?: React.FormEvent) {
    e?.preventDefault();
    if (!id) return;
    setStructureErr(null);
    setStructureSaving(true);
    try {
      await api(`/buildings/${id}`, {
        method: 'PATCH',
        json: { structureKind: structureKindDraft },
      });
      await load();
    } catch (e2) {
      setStructureErr(e2 instanceof Error ? e2.message : 'Enregistrement impossible.');
    } finally {
      setStructureSaving(false);
    }
  }

  async function removeBuilding() {
    if (
      !confirm(
        'Supprimer ce bien et toutes ses unités, baux et loyers associés ? Cette action est définitive.',
      )
    ) {
      return;
    }
    if (!id) return;
    try {
      await api(`/buildings/${id}`, { method: 'DELETE' });
      navigate('/biens');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Suppression impossible.');
    }
  }

  if (loading) {
    return <p className="text-slate-600">Chargement du bien…</p>;
  }

  if (loadError || !b) {
    return (
      <Card>
        <p className="text-red-700">{loadError ?? 'Bien introuvable.'}</p>
        <p className="mt-2 text-sm text-slate-600">
          Vérifiez que l’API tourne, que vous êtes connecté, et que la base est à jour ({' '}
          <code className="rounded bg-slate-200 px-1">npx prisma migrate deploy</code> ).
        </p>
        <Link to="/biens" className="mt-4 inline-block text-sm font-medium text-brand-700">
          ← Retour à la liste
        </Link>
      </Card>
    );
  }

  const locLine = [b.commune ?? '—', b.city ?? '—'].join(', ');
  const extra = [b.address, b.postalCode].filter(Boolean).join(' · ');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/biens" className="text-sm font-medium text-brand-700">
            ← Biens
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{b.name}</h1>
          <p className="text-sm font-medium text-slate-800">{locLine}</p>
          {extra && <p className="text-sm text-slate-600">{extra}</p>}
          <p className="text-xs text-slate-500">{b.country}</p>
        </div>
        <Button variant="danger" className="shrink-0 py-2 text-sm" onClick={removeBuilding}>
          Supprimer le bien
        </Button>
      </div>

      <Card>
        <h2 className="mb-1 font-semibold text-slate-900">Organisation du bien</h2>
        <p className="mb-3 text-sm text-slate-600">
          <strong>Immeuble / multi-lots</strong> : plusieurs unités et donc plusieurs baux sur ce même bien.
          <strong> Un seul lot</strong> : une seule unité (villa entière, hangar loué en bloc, etc.).
        </p>
        <form onSubmit={saveStructureKind} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[min(100%,20rem)] flex-1">
            <Label htmlFor="building-structure-kind">Type</Label>
            <Select
              id="building-structure-kind"
              value={structureKindDraft}
              onChange={(e) => setStructureKindDraft(e.target.value as BuildingStructureValue)}
            >
              {BUILDING_STRUCTURE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" className="py-2" disabled={structureSaving || structureKindDraft === b.structureKind}>
            {structureSaving ? 'Enregistrement…' : 'Enregistrer le type'}
          </Button>
        </form>
        {structureErr && <p className="mt-2 text-sm text-red-600">{structureErr}</p>}
        <p className="mt-2 text-xs text-slate-500">
          {BUILDING_STRUCTURE_OPTIONS.find((o) => o.value === structureKindDraft)?.description}
        </p>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold text-slate-900">Ajouter une unité</h2>
        {b.structureKind === 'MONO_LOT' && b.units.length >= 1 ? (
          <p className="text-sm text-slate-600">
            Ce bien est en <strong>un seul lot</strong> : une unité suffit (ex. « Villa entière »). Pour ajouter
            d’autres lots, passez d’abord le type à <strong>Immeuble ou bâtiment multi-lots</strong> ci-dessus.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-600">
              C&apos;est ici que vous indiquez la nature du local : <strong>appartement</strong>,{' '}
              <strong>bureau</strong>, <strong>entrepôt</strong>, commerce, etc. Sur un immeuble, un même bien
              peut mélanger plusieurs types (ex. appartements + parkings).
            </p>
            <form onSubmit={addUnit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <Label htmlFor="new-unit-kind">Nature de l&apos;unité (obligatoire)</Label>
            <Select id="new-unit-kind" value={kind} onChange={(e) => setKind(e.target.value)} required>
              {UNIT_KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <Label htmlFor="new-unit-label">Libellé / référence</Label>
            <Input
              id="new-unit-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              placeholder="A12, Bureau 2, Entrepôt B…"
            />
          </div>
          <div>
            <Label>Étage (si pertinent)</Label>
            <Input value={floor} onChange={(e) => setFloor(e.target.value)} type="number" />
          </div>
          <div>
            <Label>Surface m²</Label>
            <Input value={surfaceM2} onChange={(e) => setSurfaceM2(e.target.value)} type="number" step="0.01" />
          </div>
          <div>
            <Label>Nombre de pièces</Label>
            <Input value={rooms} onChange={(e) => setRooms(e.target.value)} type="number" />
          </div>
          <div>
            <Label>Loyer indicatif (FCFA)</Label>
            <Input value={defaultRent} onChange={(e) => setDefaultRent(e.target.value)} type="number" step="1" />
          </div>
          <div className="sm:col-span-full">
            <Label>Description simple (optionnel)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex. balcon, parking…" />
          </div>
          {err && <p className="text-sm text-red-600 sm:col-span-full">{err}</p>}
          <div className="sm:col-span-full">
            <Button type="submit">Ajouter l&apos;unité</Button>
          </div>
        </form>
          </>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Unités</h2>
        <ul className="divide-y divide-slate-200/80">
          {b.units.map((u) => {
            const tenant = u.leases?.[0]?.tenant;
            const rent = u.defaultRent != null ? Number(u.defaultRent) : null;
            return (
              <li key={u.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-medium text-slate-900">{u.label}</p>
                  <div className="flex max-w-md flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor={`unit-kind-${u.id}`}>
                      Nature de l&apos;unité
                    </label>
                    <Select
                      id={`unit-kind-${u.id}`}
                      value={u.kind ?? 'APARTMENT'}
                      onChange={(e) => void updateUnitKind(u.id, e.target.value)}
                      className="text-xs sm:max-w-xs"
                    >
                      {UNIT_KIND_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <p className="text-xs text-slate-600">
                    {u.surfaceM2 != null ? `${Number(u.surfaceM2)} m²` : '—'} · {u.rooms != null ? `${u.rooms} p.` : '—'}
                    {rent != null && ` · ${fcfa(rent)}`}
                  </p>
                  {u.description && <p className="text-xs text-slate-600">{u.description}</p>}
                  {tenant && (
                    <p className="text-xs font-medium text-emerald-800">
                      Occupé : {tenant.firstName} {tenant.lastName}
                    </p>
                  )}
                </div>
                <Button variant="danger" className="self-start py-2 text-xs" onClick={() => removeUnit(u.id)}>
                  Supprimer l&apos;unité
                </Button>
              </li>
            );
          })}
          {b.units.length === 0 && <li className="py-6 text-center text-sm text-slate-500">Aucune unité.</li>}
        </ul>
      </Card>
    </div>
  );
}
