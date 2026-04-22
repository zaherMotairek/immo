/** Rôle aligné sur Prisma `UserRole`. */
export type JwtAuthUserRole = 'USER' | 'PLATFORM_ADMIN';

/** Utilisateur injecté par JwtStrategy (req.user). */
export type JwtAuthUser = {
  id: string;
  email: string;
  name: string | null;
  organizationId: string;
  role: JwtAuthUserRole;
};
