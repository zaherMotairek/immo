import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SmartLink } from '@/components/SmartLink';
import { api, openTenantIdDocumentPreview, type TenantIdDocumentMeta } from '@/lib/api';
import { TenantIdDocumentSection } from '@/components/TenantIdDocumentSection';
import { BuildingUnitStack } from '@/components/BuildingUnitBadges';
import { FicheLocationLink } from '@/components/FicheLocationLink';
import { PdfPrintButton } from '@/components/PdfPrintButton';
import { useReturnRowFocus } from '@/hooks/useReturnRowFocus';
import { AppPageTitle, PageHeaderKpi } from '@/components/AppPageTitle';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { Button, Card, HelpHint, Input, Label } from '@/components/ui';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import {
  listTableCellClass,
  listTableDataRowClass,
  listTableEditingFirstCellClass,
  listTableFirstCellClass,
  listTableRowEditingClass,
  listTableRowOpenableClass,
  onListRowClick,
} from '@/lib/listTableStyles';
import { useEscapeCancel } from '@/lib/useEscapeCancel';
import { isSafeInternalReturnPath, navigateAfterCreate } from '@/lib/navigation';
import { unitKindLabel } from '@/lib/unitKind';
import { SortableTh } from '@/components/SortableTh';
import { toggleTableSortColumn } from '@/lib/tableSort';
import type { TableSortDir } from '@/lib/tableSort';
import {
  OdooActionBar,
  OdooKanbanBoard,
  OdooKanbanCard,
  OdooKanbanColumn,
  OdooListToolbar,
  type OdooViewMode,
} from '@/components/OdooKit';

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
    fileKey: t.idDocFileKey,
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

type TenantSortKey = 'tenant' | 'contact' | 'place' | 'lease';

function tenantContactLine(t: Tenant) {
  return `${t.email ?? ''} ${t.phone ?? ''}`.trim();
}

function compareTenantRows(a: Tenant, b: Tenant, key: TenantSortKey, dir: TableSortDir): number {
  const sign = dir === 'asc' ? 1 : -1;
  let c = 0;
  switch (key) {
    case 'tenant':
      c = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr', { sensitivity: 'base' });
      break;
    case 'contact':
      c = tenantContactLine(a).localeCompare(tenantContactLine(b), 'fr', { sensitivity: 'base' });
      break;
    case 'place': {
      const la = a.leases[0];
      const lb = b.leases[0];
      const pa = la ? `${la.unit.building.name} ${la.unit.label}`.trim() : '';
      const pb = lb ? `${lb.unit.building.name} ${lb.unit.label}`.trim() : '';
      c = pa.localeCompare(pb, 'fr', { sensitivity: 'base' });
      break;
    }
    case 'lease':
      c = (a.leases[0]?.id ?? '').localeCompare(b.leases[0]?.id ?? '');
      break;
    default:
      c = 0;
  }
  if (c === 0) c = a.id.localeCompare(b.id);
  return c * sign;
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
  const [viewMode, setViewMode] = useState<OdooViewMode>('list');
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

  const [tenantSortKey, setTenantSortKey] = useState<TenantSortKey>('tenant');
  const [tenantSortDir, setTenantSortDir] = useState<TableSortDir>('asc');

  function toggleTenantSort(key: TenantSortKey) {
    const n = toggleTableSortColumn(tenantSortKey, tenantSortDir, key);
    setTenantSortKey(n.key);
    setTenantSortDir(n.dir);
  }

  const sortedFilteredRows = useMemo(() => {
    const copy = [...filteredRows];
    copy.sort((a, b) => compareTenantRows(a, b, tenantSortKey, tenantSortDir));
    return copy;
  }, [filteredRows, tenantSortKey, tenantSortDir]);

  const kanbanTenants = useMemo(() => {
    const withLease: Tenant[] = [];
    const withoutLease: Tenant[] = [];
    for (const t of filteredRows) {
      if (t.leases.length > 0) withLease.push(t);
      else withoutLease.push(t);
    }
    return { withLease, withoutLease };
  }, [filteredRows]);

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
    const ok = await confirmDialog({
      title: 'Supprimer le locataire',
      message: 'Supprimer ce locataire ? (impossible s’il a encore un bail.)',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api(`/tenants/${id}`, { method: 'DELETE' });
      load();
    } catch (e2) {
      toast(e2 instanceof Error ? e2.message : 'Suppression impossible.', { variant: 'error' });
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
      <AppPageTitle
        iconTo="/locataires"
        title="Locataires"
        hintTitle="Création et modification des coordonnées. Les baux lient un locataire à une unité depuis la page Baux."
        actions={
          <>
            <PageHeaderKpi label="Total" value={String(rows.length)} />
            <Button type="button" variant="secondary" className="gap-1.5 py-2 text-sm font-semibold" onClick={() => openAddTenantForm()}>
              <span className="text-base leading-none" aria-hidden>
                +
              </span>
              Ajouter un locataire
            </Button>
          </>
        }
      />

      <OdooActionBar
        left={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
            <span className="font-semibold">Liste</span>
            <span>
              {filteredRows.length} / {rows.length} locataire(s) affiché(s)
            </span>
          </div>
        }
        right={
          rows.length > 0 ? (
            <OdooListToolbar
              search={listSearch}
              onSearchChange={setListSearch}
              searchPlaceholder="Rechercher (nom, bien, ville…)"
              searchAriaLabel="Filtrer la liste des locataires"
              showViewToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              exports={
                <PdfPrintButton
                  path="/reports/table-locataires.pdf"
                  title="Liste de tous les locataires en PDF"
                  variant="labeled"
                />
              }
            />
          ) : null
        }
      />

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
        <div className="border-b border-slate-200/90 bg-slate-50/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {viewMode === 'kanban' ? 'Kanban locataires' : 'Liste des locataires'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {filteredRows.length === rows.length
                ? `${rows.length} fiche${rows.length !== 1 ? 's' : ''}`
                : `${filteredRows.length} sur ${rows.length} affichée${filteredRows.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {rows.length > 0 && filteredRows.length > 0 && viewMode === 'kanban' ? (
          <div className="p-4">
            <OdooKanbanBoard>
              <OdooKanbanColumn title="Avec bail" count={kanbanTenants.withLease.length}>
                {kanbanTenants.withLease.map((t) => {
                  const l = t.leases[0];
                  return (
                    <OdooKanbanCard key={t.id} onClick={() => navigate(`/locataires?edit=${t.id}`)}>
                      <p className="font-semibold text-slate-900 dark:text-slate-50">
                        {t.firstName} {t.lastName}
                      </p>
                      {l ? (
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          {l.unit.building.name} · {l.unit.label}
                        </p>
                      ) : null}
                      {t.phone?.trim() ? <p className="mt-1 text-xs text-brand-700 dark:text-brand-300">{t.phone}</p> : null}
                    </OdooKanbanCard>
                  );
                })}
              </OdooKanbanColumn>
              <OdooKanbanColumn title="Sans bail" count={kanbanTenants.withoutLease.length}>
                {kanbanTenants.withoutLease.map((t) => (
                  <OdooKanbanCard key={t.id} onClick={() => navigate(`/locataires?edit=${t.id}`)}>
                    <p className="font-semibold text-slate-900 dark:text-slate-50">
                      {t.firstName} {t.lastName}
                    </p>
                    {t.email?.trim() ? <p className="mt-1 text-xs text-[var(--color-muted)]">{t.email}</p> : null}
                  </OdooKanbanCard>
                ))}
              </OdooKanbanColumn>
            </OdooKanbanBoard>
          </div>
        ) : null}

        {rows.length > 0 && viewMode === 'list' ? (
          <>
            <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:hidden">
              {sortedFilteredRows.map((t) => {
                const l = t.leases[0];
                const isEditing = editingId === t.id;
                if (isEditing) {
                  return (
                    <li
                      key={t.id}
                      id={`tenant-row-${t.id}`}
                      className={`scroll-mt-28 space-y-3 bg-slate-50/80 p-3.5 dark:bg-slate-900/50 ${tenantRowFlash(flashTenantId === t.id)}`}
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Modifier le locataire</p>
                      <div className="grid gap-3">
                        <div>
                          <Label htmlFor={`ef-m-${t.id}`}>Prénom</Label>
                          <Input id={`ef-m-${t.id}`} value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} required />
                        </div>
                        <div>
                          <Label htmlFor={`el-m-${t.id}`}>Nom</Label>
                          <Input id={`el-m-${t.id}`} value={editLastName} onChange={(e) => setEditLastName(e.target.value)} required />
                        </div>
                        <div>
                          <Label htmlFor={`ep-m-${t.id}`}>Téléphone</Label>
                          <Input id={`ep-m-${t.id}`} value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor={`ee-m-${t.id}`}>E-mail</Label>
                          <Input
                            id={`ee-m-${t.id}`}
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            type="email"
                            autoComplete="email"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`en-m-${t.id}`}>Notes (optionnel)</Label>
                          <Input
                            id={`en-m-${t.id}`}
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Rappels internes…"
                          />
                        </div>
                      </div>
                      {editErr && <p className="text-sm text-red-600">{editErr}</p>}
                      <TenantIdDocumentSection tenantId={t.id} idDocument={idDocumentMeta(t)} onChanged={load} />
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" className="py-1.5 text-xs" onClick={() => saveEdit(t.id)}>
                          Enregistrer
                        </Button>
                        <Button type="button" variant="secondary" className="py-1.5 text-xs" onClick={cancelEdit}>
                          Annuler
                        </Button>
                      </div>
                    </li>
                  );
                }
                return (
                  <li
                    key={t.id}
                    id={`tenant-row-${t.id}`}
                    className={`scroll-mt-28 space-y-2 p-3.5 ${tenantRowFlash(flashTenantId === t.id)}`}
                  >
                    <button type="button" className="w-full text-left" onClick={() => beginEdit(t)}>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {t.firstName} {t.lastName}
                      </p>
                      {t.phone?.trim() ? (
                        <p className="mt-1 tabular-nums text-sm text-slate-600 dark:text-slate-300">{t.phone}</p>
                      ) : null}
                      {t.email?.trim() ? (
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{t.email}</p>
                      ) : null}
                      {l ? (
                        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                          {l.unit.building.name} · {l.unit.label}
                          <span className="text-slate-400">
                            {' '}
                            · {l.unit.building.commune}, {l.unit.building.city}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-1.5 text-xs text-slate-400">Sans bail actif</p>
                      )}
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      {l ? <FicheLocationLink leaseId={l.id} returnFocusRowId={t.id} /> : null}
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        onClick={() => beginEdit(t)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-600/90 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        onClick={() => remove(t.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="table-scroll hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-white text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                    <SortableTh
                      label="Locataire"
                      columnKey="tenant"
                      activeKey={tenantSortKey}
                      dir={tenantSortDir}
                      onSort={toggleTenantSort}
                    />
                    <SortableTh
                      label="Contact"
                      columnKey="contact"
                      activeKey={tenantSortKey}
                      dir={tenantSortDir}
                      onSort={toggleTenantSort}
                    />
                    <SortableTh
                      label="Bien & unité"
                      columnKey="place"
                      activeKey={tenantSortKey}
                      dir={tenantSortDir}
                      onSort={toggleTenantSort}
                      thClassName="min-w-[10rem] whitespace-nowrap px-3 py-2 sm:px-3.5"
                    />
                    <th className="w-[1%] whitespace-nowrap px-3 py-2 text-right sm:px-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFilteredRows.map((t, rowIndex) => {
                    const l = t.leases[0];
                    const isEditing = editingId === t.id;
                    if (isEditing) {
                      return (
                        <tr
                          key={t.id}
                          id={`tenant-row-d-${t.id}`}
                          className={`scroll-mt-28 ${listTableRowEditingClass} ${tenantRowFlash(flashTenantId === t.id)}`}
                        >
                          <td colSpan={4} className={listTableEditingFirstCellClass}>
                            <div className="space-y-3 rounded-lg border border-slate-200 bg-white/90 p-3 dark:border-slate-600 dark:bg-slate-900/80">
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
                                  className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline dark:text-slate-300"
                                >
                                  Activité loyers sur l’année
                                </SmartLink>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button type="button" className="py-1.5 text-xs" onClick={() => saveEdit(t.id)}>
                                  Enregistrer
                                </Button>
                                <Button type="button" variant="secondary" className="py-1.5 text-xs" onClick={cancelEdit}>
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
                        id={`tenant-row-d-${t.id}`}
                        title="Clic pour modifier"
                        onClick={(e) => onListRowClick(e, () => beginEdit(t))}
                        className={`scroll-mt-28 ${listTableDataRowClass(rowIndex)} ${listTableRowOpenableClass} ${tenantRowFlash(flashTenantId === t.id)}`}
                      >
                        <td className={listTableFirstCellClass}>
                          <div className="min-w-0">
                            <SmartLink
                              to={`/locataires?edit=${encodeURIComponent(t.id)}`}
                              returnFocusId={t.id}
                              className="font-medium text-slate-900 underline-offset-2 hover:underline dark:text-slate-100"
                            >
                              {t.firstName} {t.lastName}
                            </SmartLink>
                            {t.idDocFileKey ? (
                              <button
                                type="button"
                                className="mt-0.5 block text-left text-[11px] text-slate-500 hover:underline dark:text-slate-400"
                                onClick={() => openTenantIdDocumentPreview(t.id)}
                              >
                                Pièce d’identité
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td className={`${listTableCellClass} text-slate-600 dark:text-slate-300`}>
                          <div className="max-w-[12rem] space-y-0.5">
                            <p className="tabular-nums text-sm">
                              {t.phone?.trim() ? (
                                <a href={`tel:${t.phone.replace(/\s/g, '')}`} className="hover:underline">
                                  {t.phone}
                                </a>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </p>
                            {t.email?.trim() ? (
                              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                <a href={`mailto:${t.email}`} className="hover:underline">
                                  {t.email}
                                </a>
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className={`${listTableCellClass} text-slate-700 dark:text-slate-300`}>
                          {l ? (
                            <BuildingUnitStack
                              buildingName={
                                <SmartLink
                                  to={`/biens/${l.unit.building.id}?unitId=${encodeURIComponent(l.unit.id)}&hintUnitLabel=${encodeURIComponent(l.unit.label)}&returnLocation=${encodeURIComponent('/locataires')}`}
                                  returnFocusId={t.id}
                                  className="underline-offset-2 hover:underline"
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
                          ) : (
                            <span className="text-slate-400">Sans bail actif</span>
                          )}
                        </td>
                        <td className={`whitespace-nowrap text-right ${listTableCellClass}`}>
                          <div className="inline-flex items-center gap-2.5">
                            {l ? <FicheLocationLink leaseId={l.id} returnFocusRowId={t.id} /> : null}
                            <button
                              type="button"
                              className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-slate-100"
                              onClick={() => beginEdit(t)}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="text-xs font-medium text-red-600/90 hover:underline dark:text-red-400"
                              onClick={() => remove(t.id)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
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
