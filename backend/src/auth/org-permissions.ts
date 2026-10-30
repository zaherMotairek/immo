import type { OrgMemberRole } from '@prisma/client';

/** Permissions granulaires F1 (source de vérité guards + entitlements). */
export type OrgPerm =
  | 'buildings:read'
  | 'buildings:write'
  | 'tenants:read'
  | 'tenants:write'
  | 'leases:read'
  | 'leases:write'
  | 'payments:read'
  | 'payments:write'
  | 'reminders:write'
  | 'charges:read'
  | 'charges:write'
  | 'collectors:read'
  | 'collectors:write'
  | 'exports:read'
  | 'exports:write'
  | 'closures:write'
  | 'automation:write'
  | 'users:invite';

const ALL_PERMS: OrgPerm[] = [
  'buildings:read',
  'buildings:write',
  'tenants:read',
  'tenants:write',
  'leases:read',
  'leases:write',
  'payments:read',
  'payments:write',
  'reminders:write',
  'charges:read',
  'charges:write',
  'collectors:read',
  'collectors:write',
  'exports:read',
  'exports:write',
  'closures:write',
  'automation:write',
  'users:invite',
];

const ROLE_PERMS: Record<OrgMemberRole, readonly OrgPerm[]> = {
  OWNER: ALL_PERMS,
  ACCOUNTANT: [
    'buildings:read',
    'tenants:read',
    'leases:read',
    'payments:read',
    'payments:write',
    'reminders:write',
    'charges:read',
    'charges:write',
    'collectors:read',
    'exports:read',
    'exports:write',
    'closures:write',
  ],
  COLLECTOR: [
    'buildings:read',
    'tenants:read',
    'leases:read',
    'payments:read',
    'payments:write',
    'reminders:write',
  ],
  READONLY: [
    'buildings:read',
    'tenants:read',
    'leases:read',
    'payments:read',
    'charges:read',
    'collectors:read',
    'exports:read',
  ],
};

export function permissionsForOrgRole(role: OrgMemberRole): OrgPerm[] {
  return [...(ROLE_PERMS[role] ?? ROLE_PERMS.READONLY)];
}

export function orgRoleHasPerm(role: OrgMemberRole, perm: OrgPerm): boolean {
  return permissionsForOrgRole(role).includes(perm);
}

export function parseOrgMemberRole(raw: unknown): OrgMemberRole {
  if (raw === 'OWNER' || raw === 'ACCOUNTANT' || raw === 'COLLECTOR' || raw === 'READONLY') {
    return raw;
  }
  return 'OWNER';
}
