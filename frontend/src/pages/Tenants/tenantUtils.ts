import type { TenantIdDocumentMeta } from '@/lib/api';
import type { TableSortDir } from '@/lib/tableSort';
import { unitKindLabel } from '@/lib/unitKind';
import type { Tenant, TenantSortKey } from './types';

export function idDocumentMeta(t: Tenant): TenantIdDocumentMeta | null {
  if (!t.idDocFileKey) return null;
  return {
    fileKey: t.idDocFileKey,
    fileName: t.idDocOriginalName,
    mimeType: t.idDocMime,
    size: t.idDocSize,
    uploadedAt: t.idDocUploadedAt,
  };
}

export function splitFullName(input: string): { firstName: string; lastName: string } {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '-', lastName: '-' };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: '-' };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') };
}

/** Surbrillance temporaire d'une ligne (retour depuis une fiche). */
export function tenantRowFlash(active: boolean) {
  return active
    ? 'ring-2 ring-inset ring-brand-500/90 bg-brand-50/90 shadow-[0_0_0_1px_rgba(59,130,246,0.35)] dark:bg-brand-950/45 dark:ring-brand-400/80'
    : '';
}

function tenantContactLine(t: Tenant) {
  return `${t.email ?? ''} ${t.phone ?? ''}`.trim();
}

export function compareTenantRows(a: Tenant, b: Tenant, key: TenantSortKey, dir: TableSortDir): number {
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

/** Recherche texte : nom, e-mail, téléphone, bien / commune / ville / unité. */
export function filterTenantsBySearch(rows: Tenant[], search: string): Tenant[] {
  const q = search.trim().toLowerCase();
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
}

/** Répartition Kanban : locataires avec / sans bail. */
export function groupTenantsByLease(rows: Tenant[]): { withLease: Tenant[]; withoutLease: Tenant[] } {
  const withLease: Tenant[] = [];
  const withoutLease: Tenant[] = [];
  for (const t of rows) {
    if (t.leases.length > 0) withLease.push(t);
    else withoutLease.push(t);
  }
  return { withLease, withoutLease };
}
