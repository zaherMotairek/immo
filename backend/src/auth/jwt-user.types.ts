/** Rôle aligné sur Prisma `UserRole`. */
export type JwtAuthUserRole = 'USER' | 'PLATFORM_ADMIN';

/** Rôle métier org — Prisma `OrgMemberRole`. */
export type JwtOrgMemberRole = 'OWNER' | 'ACCOUNTANT' | 'COLLECTOR' | 'READONLY';

/** Utilisateur injecté par JwtStrategy (req.user). */
export type JwtAuthUser = {
  id: string;
  email: string;
  name: string | null;
  organizationId: string;
  role: JwtAuthUserRole;
  /** F1 : droits intra-organisation. */
  orgRole: JwtOrgMemberRole;
  /** D3 : session « vue client » lecture seule. */
  readOnly?: boolean;
  impersonatorId?: string;
};
