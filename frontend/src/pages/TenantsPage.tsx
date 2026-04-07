import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, openTenantIdDocumentPreview, type TenantIdDocumentMeta } from '@/lib/api';
import { TenantIdDocumentSection, TenantIdDocumentThumb } from '@/components/TenantIdDocumentSection';
import { Button, Card, Input, Label } from '@/components/ui';
import { unitKindLabel } from '@/lib/unitKind';

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  idDocFileKey: string | null;
  idDocOriginalName: string | null;
  idDocMime: string | null;
  idDocSize: number | null;
  idDocUploadedAt: string | null;
  leases: Array<{
    unit: { label: string; kind: string; building: { name: string; commune: string; city: string } };
  }>;
};

function idDocumentMeta(t: Tenant): TenantIdDocumentMeta | null {
  if (!t.idDocFileKey) return null;
  return {
    fileName: t.idDocOriginalName,
    mimeType: t.idDocMime,
    size: t.idDocSize,
    uploadedAt: t.idDocUploadedAt,
  };
}

function splitFullName(input: string): { firstName: string; lastName: string } {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '-', lastName: '-' };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: '-' };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') };
}

export function TenantsPage() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Tenant[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editErr, setEditErr] = useState<string | null>(null);

  function load() {
    api<Tenant[]>('/tenants').then(setRows).catch(() => setRows([]));
  }

  useEffect(() => {
    load();
  }, []);

  const editParam = params.get('edit');
  const urlEditOpened = useRef<string | null>(null);
  useEffect(() => {
    if (!editParam) {
      urlEditOpened.current = null;
      return;
    }
    if (rows.length === 0) return;
    if (urlEditOpened.current === editParam) return;
    const t = rows.find((r) => r.id === editParam);
    if (t) {
      beginEdit(t);
      urlEditOpened.current = editParam;
    }
  }, [editParam, rows]);

  function beginEdit(t: Tenant) {
    setEditingId(t.id);
    setEditFirstName(t.firstName);
    setEditLastName(t.lastName);
    setEditEmail(t.email ?? '');
    setEditPhone(t.phone ?? '');
    setEditNotes(t.notes ?? '');
    setEditErr(null);
    const el = document.getElementById(`tenant-row-${t.id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditErr(null);
    if (params.get('edit')) {
      const next = new URLSearchParams(params);
      next.delete('edit');
      setParams(next, { replace: true });
    }
  }

  async function saveEdit(id: string) {
    setEditErr(null);
    if (!editFirstName.trim() || !editLastName.trim()) {
      setEditErr('Prénom et nom sont obligatoires.');
      return;
    }
    try {
      await api(`/tenants/${id}`, {
        method: 'PATCH',
        json: {
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.trim() ? editEmail.trim() : null,
          phone: editPhone.trim() || null,
          notes: editNotes.trim() || null,
        },
      });
      cancelEdit();
      load();
    } catch (e2) {
      setEditErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const { firstName, lastName } = splitFullName(fullName);
    if (fullName.trim().length < 3) {
      setErr('Indiquez le nom complet du locataire.');
      return;
    }
    try {
      await api('/tenants', {
        method: 'POST',
        json: {
          firstName,
          lastName,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        },
      });
      setFullName('');
      setEmail('');
      setPhone('');
      load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce locataire ? (impossible s’il a encore un bail.)')) return;
    try {
      await api(`/tenants/${id}`, { method: 'DELETE' });
      load();
    } catch (e2) {
      alert(e2 instanceof Error ? e2.message : 'Suppression impossible.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Locataires</h1>
        <p className="text-sm text-slate-600">Création, modification des coordonnées et liaison aux baux.</p>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">Nouveau locataire</h2>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nom complet</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Ex. Amadou Koné"
              autoComplete="name"
            />
          </div>
          <div>
            <Label>Téléphone (optionnel)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225 07 …" />
          </div>
          <div>
            <Label>E-mail (optionnel)</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
          <div className="sm:col-span-2">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Liste</h2>
        <ul>
          {rows.map((t) => {
            const l = t.leases[0];
            const isEditing = editingId === t.id;
            return (
              <li
                key={t.id}
                id={`tenant-row-${t.id}`}
                className="flex flex-col gap-4 border-b border-slate-100 py-5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
              >
                {isEditing ? (
                  <div className="min-w-0 flex-1 space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
                    <p className="text-sm font-semibold text-slate-900">Modifier le locataire</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`ef-${t.id}`}>Prénom</Label>
                        <Input id={`ef-${t.id}`} value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} required />
                      </div>
                      <div>
                        <Label htmlFor={`el-${t.id}`}>Nom</Label>
                        <Input id={`el-${t.id}`} value={editLastName} onChange={(e) => setEditLastName(e.target.value)} required />
                      </div>
                      <div>
                        <Label htmlFor={`ep-${t.id}`}>Téléphone</Label>
                        <Input id={`ep-${t.id}`} value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor={`ee-${t.id}`}>E-mail</Label>
                        <Input
                          id={`ee-${t.id}`}
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          type="email"
                          autoComplete="email"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor={`en-${t.id}`}>Notes (optionnel)</Label>
                        <Input
                          id={`en-${t.id}`}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Rappels internes…"
                        />
                      </div>
                    </div>
                    {editErr && <p className="text-sm text-red-600">{editErr}</p>}
                    <TenantIdDocumentSection
                      tenantId={t.id}
                      idDocument={idDocumentMeta(t)}
                      onChanged={load}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" className="py-2 text-xs" onClick={() => saveEdit(t.id)}>
                        Enregistrer
                      </Button>
                      <Button type="button" variant="secondary" className="py-2 text-xs" onClick={cancelEdit}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex min-w-0 flex-1 gap-4">
                      {t.idDocFileKey && (
                        <TenantIdDocumentThumb tenantId={t.id} mimeType={t.idDocMime} />
                      )}
                      <div className="min-w-0 flex-1 space-y-3">
                        <div>
                          <p className="text-lg font-semibold leading-snug text-slate-900">
                            {t.firstName} {t.lastName}
                          </p>
                          <dl className="mt-2 space-y-1.5 text-sm">
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              <dt className="shrink-0 font-medium text-slate-500">Téléphone</dt>
                              <dd className="min-w-0 font-medium text-slate-900">
                                {t.phone?.trim() ? (
                                  <a href={`tel:${t.phone.replace(/\s/g, '')}`} className="text-brand-800 hover:underline">
                                    {t.phone}
                                  </a>
                                ) : (
                                  <span className="text-slate-400">Non renseigné</span>
                                )}
                              </dd>
                            </div>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              <dt className="shrink-0 font-medium text-slate-500">E-mail</dt>
                              <dd className="min-w-0 break-all font-medium text-slate-900">
                                {t.email?.trim() ? (
                                  <a href={`mailto:${t.email}`} className="text-brand-800 hover:underline">
                                    {t.email}
                                  </a>
                                ) : (
                                  <span className="text-slate-400">Non renseigné</span>
                                )}
                              </dd>
                            </div>
                          </dl>
                        </div>
                        {l && (
                          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bail actif</p>
                            <p className="mt-1 font-medium text-slate-900">{l.unit.building.name}</p>
                            <p className="mt-0.5 text-slate-700">
                              <span className="text-slate-500">Lieu :</span>{' '}
                              {l.unit.building.commune}, {l.unit.building.city}
                            </p>
                            <p className="text-slate-700">
                              <span className="text-slate-500">Unité :</span>{' '}
                              {unitKindLabel(l.unit.kind)} · {l.unit.label}
                            </p>
                          </div>
                        )}
                        {!l && <p className="text-sm text-slate-500">Aucun bail actif lié pour l’instant.</p>}
                        {t.idDocFileKey && (
                          <button
                            type="button"
                            className="text-left text-sm font-medium text-brand-700 hover:underline"
                            onClick={() => openTenantIdDocumentPreview(t.id)}
                          >
                            Voir la pièce d’identité
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 self-start">
                      <Button variant="secondary" className="py-2 text-xs" onClick={() => beginEdit(t)}>
                        Modifier
                      </Button>
                      <Button variant="danger" className="py-2 text-xs" onClick={() => remove(t.id)}>
                        Supprimer
                      </Button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
          {rows.length === 0 && <li className="py-6 text-center text-sm text-slate-500">Aucun locataire.</li>}
        </ul>
      </Card>
    </div>
  );
}
