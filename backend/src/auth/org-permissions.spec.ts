import { orgRoleHasPerm, permissionsForOrgRole } from './org-permissions';

describe('org-permissions F1', () => {
  it('OWNER a toutes les écritures', () => {
    expect(orgRoleHasPerm('OWNER', 'buildings:write')).toBe(true);
    expect(orgRoleHasPerm('OWNER', 'users:invite')).toBe(true);
    expect(orgRoleHasPerm('OWNER', 'automation:write')).toBe(true);
  });

  it('ACCOUNTANT encaissse mais pas biens write', () => {
    expect(orgRoleHasPerm('ACCOUNTANT', 'payments:write')).toBe(true);
    expect(orgRoleHasPerm('ACCOUNTANT', 'buildings:write')).toBe(false);
    expect(orgRoleHasPerm('ACCOUNTANT', 'closures:write')).toBe(true);
  });

  it('COLLECTOR : paiements + relances seulement', () => {
    expect(orgRoleHasPerm('COLLECTOR', 'payments:write')).toBe(true);
    expect(orgRoleHasPerm('COLLECTOR', 'reminders:write')).toBe(true);
    expect(orgRoleHasPerm('COLLECTOR', 'exports:write')).toBe(false);
    expect(orgRoleHasPerm('COLLECTOR', 'leases:write')).toBe(false);
  });

  it('READONLY lecture seule', () => {
    expect(orgRoleHasPerm('READONLY', 'buildings:read')).toBe(true);
    expect(orgRoleHasPerm('READONLY', 'payments:write')).toBe(false);
    expect(permissionsForOrgRole('READONLY').every((p) => p.endsWith(':read') || p === 'exports:read')).toBe(
      true,
    );
  });
});
