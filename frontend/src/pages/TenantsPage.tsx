import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SmartLink } from '@/components/SmartLink';
import { api, openTenantIdDocumentPreview, type TenantIdDocumentMeta } from '@/lib/api';
import { TenantIdDocumentSection, TenantIdDocumentThumb } from '@/components/TenantIdDocumentSection';
import { BuildingUnitStack } from '@/components/BuildingUnitBadges';
import { FicheLocationLink } from '@/components/FicheLocationLink';
import { PdfPrintButton } from '@/components/PdfPrintButton';
import { useReturnRowFocus } from '@/hooks/useReturnRowFocus';
import { AppPageTitle } from '@/components/AppPageTitle';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { Button, Card, HelpHint, Input, Label, StatTile } from '@/components/ui';
import {
  listTableCellClass,
  listTableDataRowClass,
  listTableEditingFirstCellClass,
  listTableFirstCellClass,
  listTableRowEditingClass,
} from '@/lib/listTableStyles';
import { useEscapeCancel } from '@/lib/useEscapeCancel';
import { isSafeInternalReturnPath, navigateAfterCreate } from '@/lib/navigation';
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
    id: string;
    unit: {
      id: string;
      label: string;
      kind: string;
      building: { id: string; name: string; commune: string; city: string };
    };
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

function tenantRowFlash(active: boolean) {
  return active
    ? 'ring-2 ring-inset ring-brand-500/90 bg-brand-50/90 shadow-[0_0_0_1px_rgba(59,130,246,0.35)] dark:bg-brand-950/45 dark:ring-brand-400/80'
    : '';
}

export function TenantsPage() {
  useRegisterRootSectionFallback();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const returnLocationParam = params.get('returnLocation')?.trim() ?? '';
  const returnAfterTenantCreateRef = useRef<string | null>(null);
  const [rows, setRows] = useState<Tenant[]>([]);
  const [listFetched, setListFetched] = useState(false);
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
  const [addTenantOpen, setAddTenantOpen] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const addTenantFormRef = useRef<HTMLDivElement | null>(null);

  const filteredRows = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((t) => {
      const name = `${t.firstName} ${t.lastName}`.toLowerCase();
      const email = (t.email ?? '').toLowerCase();
      const phone = (t.phone ?? '').replace(/\s/g, '').toLowerCase();
      const l = t.leases[0];
      const occ = l
        ? `${l.unit.building.name} ${l.unit.building.commune} ${l.unit.building.city} ${l.unit.label} ${unitKindLabel(l.unit.kind)}`.toLowerCase()
        : '';
      return (
        name.includes(q) ||
        email.includes(q) ||
        (phone && q.replace(/\s/g, '').length > 0 && phone.includes(q.replace(/\s/g, ''))) ||
        occ.includes(q)
      );
    });
  }, [rows, listSearch]);

  function openAddTenantForm() {
    setAddTenantOpen(true);
    window.requestAnimationFrame(() => {
      addTenantFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function resetNewTenantForm() {
    setFullName('');
    setEmail('');
    setPhone('');
    setErr(null);
  }

  function cancelNewTenant() {
    resetNewTenantForm();
    setAddTenantOpen(false);
    returnAfterTenantCreateRef.current = null;
    if (params.get('returnLocation')) {
      setParams(
        (prev) => {
          const q = new URLSearchParams(prev);
          q.delete('returnLocation');
          return q;
        },
        { replace: true },
      );
    }
    if (window.location.hash === '#nouveau-locataire') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  function load() {
    setListFetched(false);
    api<Tenant[]>('/tenants')
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setListFetched(true));
  }

  const flashTenantId = useReturnRowFocus({ rowIdPrefix: 'tenant-row-', ready: listFetched });

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (returnLocationParam && isSafeInternalReturnPath(returnLocationParam)) {
      returnAfterTenantCreateRef.current = returnLocationParam;
    } else {
      returnAfterTenantCreateRef.current = null;
    }
  }, [returnLocationParam]);

  useEffect(() => {
    if (window.location.hash === '#nouveau-locataire') {
      setAddTenantOpen(true);
    }
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

  useEscapeCancel(editingId !== null || addTenantOpen, () => {
    if (editingId !== null) cancelEdit();
    else cancelNewTenant();
  });

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
      const back = returnAfterTenantCreateRef.current;
      returnAfterTenantCreateRef.current = null;
      setFullName('');
      setEmail('');
      setPhone('');
      setAddTenantOpen(false);
      if (back) {
        navigateAfterCreate(navigate, back);
      } else {
        load();
      }
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
      {editParam ? (
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
          <button
            type="button"
            className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
            onClick={() => cancelEdit()}
          >
            Fermer la fiche ouverte (lien direct)
          </button>
        </p>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <AppPageTitle
          className="max-w-3xl"
          iconTo="/locataires"
          title="Locataires"
          hintTitle="Création et modification des coordonnées. Les baux lient un locataire à une unité depuis la page Baux."
          titleExtra={
            <div className="flex flex-wrap items-center gap-2">
              <StatTile className="shrink-0" label="Total" value={String(rows.length)} />
              <PdfPrintButton
                path="/reports/table-locataires.pdf"
                title="Liste de tous les locataires en PDF (aperçu comme le tableau)"
              />
            </div>
          }
        />
        <Button type="button" variant="secondary" className="gap-1.5 py-2 text-sm font-semibold" onClick={() => openAddTenantForm()}>
          <span className="text-base leading-none" aria-hidden>
            +
          </span>
          Ajouter un locataire
        </Button>
      </div>

      <div ref={addTenantFormRef} id="nouveau-locataire" className="scroll-mt-24">
        <Card className="!p-0 overflow-hidden">
          <button
            type="button"
            onClick={() => setAddTenantOpen((o) => !o)}
            aria-expanded={addTenantOpen}
            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50/95 dark:hover:bg-slate-800/60 sm:px-5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/12 text-lg font-bold leading-none text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                +
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nouveau locataire</h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {addTenantOpen ? 'Masquer le formulaire' : 'Afficher le formulaire d’enregistrement'}
                </p>
              </div>
            </div>
            <svg
              className={`size-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500 ${addTenantOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {addTenantOpen ? (
            <div className="border-t border-slate-200/90 px-4 pb-5 pt-2 dark:border-slate-700 sm:px-5">
              <div className="mb-4 flex flex-wrap items-center gap-2 pt-2">
                <HelpHint
                  className="align-middle"
                  title="Le nom peut être saisi en une ligne (ex. prénom puis nom). Téléphone et e-mail servent aux relances depuis la page Paiements."
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">Nom, coordonnées optionnelles.</span>
              </div>
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
                <div className="sm:col-span-2 flex flex-wrap gap-2">
                  <Button type="submit">Enregistrer</Button>
                  <Button type="button" variant="secondary" className="py-2 text-sm" onClick={cancelNewTenant}>
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          ) : null}
        </Card>
      </div>

      <Card className="overflow-hidden !p-0 shadow-sm ring-1 ring-slate-900/[0.04] dark:ring-slate-600/35">
        <div className="flex flex-col gap-3 border-b border-slate-200/90 bg-slate-50/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Liste des locataires</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {filteredRows.length === rows.length
                ? `${rows.length} fiche${rows.length !== 1 ? 's' : ''}`
                : `${filteredRows.length} sur ${rows.length} affichée${filteredRows.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {rows.length > 0 ? (
            <div className="relative w-full min-w-0 sm:max-w-xs">
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
                placeholder="Rechercher (nom, bien, ville…)"
                className="w-full rounded-lg border-slate-200 py-2 pl-9 pr-8 text-sm dark:border-slate-600"
                aria-label="Filtrer la liste des locataires"
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
        </div>

        {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-white text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                <th className="whitespace-nowrap px-4 py-2.5 sm:px-5">Locataire</th>
                <th className="whitespace-nowrap px-4 py-2.5 sm:px-5">Contact</th>
                <th className="min-w-[12rem] px-4 py-2.5 sm:px-5">Bien & unité</th>
                <th className="whitespace-nowrap px-4 py-2.5 sm:px-5" title="Fiche du bail (location)">
                  Fiche location
                </th>
                <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-right sm:px-5"> </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((t, rowIndex) => {
                const l = t.leases[0];
                const isEditing = editingId === t.id;
                if (isEditing) {
                  return (
                    <tr
                      key={t.id}
                      id={`tenant-row-${t.id}`}
                      className={`scroll-mt-28 ${listTableRowEditingClass} ${tenantRowFlash(flashTenantId === t.id)}`}
                    >
                      <td colSpan={5} className={listTableEditingFirstCellClass}>
                        <div className="space-y-3 rounded-xl border border-brand-200/90 bg-white/90 p-4 shadow-sm dark:border-brand-700/40 dark:bg-slate-900/80">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Modifier le locataire</p>
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
                          <TenantIdDocumentSection tenantId={t.id} idDocument={idDocumentMeta(t)} onChanged={load} />
                          <div className="flex flex-wrap items-center gap-2">
                            <SmartLink
                              to={`/activite-loyers?scope=tenant&tenantId=${encodeURIComponent(t.id)}&year=${new Date().getFullYear()}`}
                              returnFocusId={t.id}
                              className="text-xs font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                            >
                              Activité loyers sur l’année →
                            </SmartLink>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" className="py-2 text-xs" onClick={() => saveEdit(t.id)}>
                              Enregistrer
                            </Button>
                            <Button type="button" variant="secondary" className="py-2 text-xs" onClick={cancelEdit}>
                              Annuler
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr
                    key={t.id}
                    id={`tenant-row-${t.id}`}
                    className={`scroll-mt-28 ${listTableDataRowClass(rowIndex)} ${tenantRowFlash(flashTenantId === t.id)}`}
                  >
                    <td className={listTableFirstCellClass}>
                      <div className="flex items-start gap-3">
                        {t.idDocFileKey ? <TenantIdDocumentThumb tenantId={t.id} mimeType={t.idDocMime} /> : null}
                        <div className="min-w-0">
                          <SmartLink
                            to={`/locataires?edit=${encodeURIComponent(t.id)}`}
                            returnFocusId={t.id}
                            className="font-semibold leading-snug text-slate-900 underline-offset-2 hover:underline dark:text-slate-100"
                          >
                            {t.firstName} {t.lastName}
                          </SmartLink>
                          {t.idDocFileKey ? (
                            <button
                              type="button"
                              className="mt-1 text-left text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
                              onClick={() => openTenantIdDocumentPreview(t.id)}
                            >
                              Pièce d’identité
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className={`${listTableCellClass} text-slate-700 dark:text-slate-300`}>
                      <div className="max-w-[14rem] space-y-1">
                        <p className="tabular-nums">
                          {t.phone?.trim() ? (
                            <a
                              href={`tel:${t.phone.replace(/\s/g, '')}`}
                              className="text-brand-800 hover:underline dark:text-brand-400"
                            >
                              {t.phone}
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </p>
                        <p className="break-all text-xs leading-snug">
                          {t.email?.trim() ? (
                            <a href={`mailto:${t.email}`} className="text-brand-800 hover:underline dark:text-brand-400">
                              {t.email}
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className={`${listTableCellClass} text-slate-700 dark:text-slate-300`}>
                      {l ? (
                        <div className="max-w-md">
                          <BuildingUnitStack
                            buildingName={
                              <SmartLink
                                to={`/biens/${l.unit.building.id}?unitId=${encodeURIComponent(l.unit.id)}&hintUnitLabel=${encodeURIComponent(l.unit.label)}&returnLocation=${encodeURIComponent('/locataires')}`}
                                returnFocusId={t.id}
                                className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-400"
                              >
                                {l.unit.building.name}
                              </SmartLink>
                            }
                            buildingSubline={
                              <>
                                {l.unit.building.commune}, {l.unit.building.city}
                              </>
                            }
                            unitKindLabel={unitKindLabel(l.unit.kind)}
                            unitLabel={l.unit.label}
                          />
                        </div>
                      ) : (
                        <span className="text-slate-400">Sans bail actif</span>
                      )}
                    </td>
                    <td className={`whitespace-nowrap ${listTableCellClass}`}>
                      {l ? <FicheLocationLink leaseId={l.id} returnFocusRowId={t.id} /> : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className={`whitespace-nowrap text-right ${listTableCellClass}`}>
                      <div className="inline-flex flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                        <Button variant="secondary" className="py-1.5 text-xs" onClick={() => beginEdit(t)}>
                          Modifier
                        </Button>
                        <Button variant="danger" className="py-1.5 text-xs" onClick={() => remove(t.id)}>
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        ) : null}

        {rows.length === 0 && (
          <div className="border-t border-slate-200/80 px-4 py-12 text-center dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">Aucun locataire.</p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
              onClick={() => openAddTenantForm()}
            >
              Ajouter un premier locataire
            </button>
          </div>
        )}
        {rows.length > 0 && filteredRows.length === 0 && (
          <div className="border-t border-slate-200/80 px-4 py-10 text-center dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucun résultat pour cette recherche.</p>
            <Button type="button" variant="secondary" className="mt-3 py-2 text-xs" onClick={() => setListSearch('')}>
              Effacer la recherche
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
