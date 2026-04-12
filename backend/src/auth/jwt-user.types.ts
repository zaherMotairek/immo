/** Utilisateur injecté par JwtStrategy (req.user). */
export type JwtAuthUser = {
  id: string;
  email: string;
  name: string | null;
  organizationId: string;
};
