export type AdminOrgUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

export type AdminOrgRow = {
  id: string;
  name: string | null;
  createdAt: string;
  platformAccessPaidUntil: string | null;
  platformAccessSuspended: boolean;
  userCount: number;
  buildingCount: number;
  tenantCount: number;
  users: AdminOrgUser[];
};

/** Statut d’accès plateforme dérivé des champs org. */
export function orgAccessStatus(o: AdminOrgRow): 'suspended' | 'expired' | 'active' {
  if (o.platformAccessSuspended) return 'suspended';
  if (o.platformAccessPaidUntil && new Date().toISOString().slice(0, 10) > o.platformAccessPaidUntil) {
    return 'expired';
  }
  return 'active';
}
