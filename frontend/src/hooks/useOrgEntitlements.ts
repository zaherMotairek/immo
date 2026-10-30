import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type OrgMemberRole = 'OWNER' | 'ACCOUNTANT' | 'COLLECTOR' | 'READONLY';

export type OrgEntitlements = {
  orgRole: OrgMemberRole;
  permissions: string[];
  planCode: string;
  features: Record<string, boolean | undefined>;
};

const DEFAULT: OrgEntitlements = {
  orgRole: 'OWNER',
  permissions: [],
  planCode: '',
  features: {},
};

/** Charge `/me/entitlements` (plan + perms F1). OWNER par défaut tant que non chargé. */
export function useOrgEntitlements() {
  const [data, setData] = useState<OrgEntitlements | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(() => {
    api<OrgEntitlements>('/me/entitlements')
      .then((e) => {
        setData({
          orgRole: e.orgRole ?? 'OWNER',
          permissions: Array.isArray(e.permissions) ? e.permissions : [],
          planCode: e.planCode ?? '',
          features: e.features ?? {},
        });
      })
      .catch(() => setData(DEFAULT))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const can = useCallback(
    (perm: string) => {
      if (!data) return true; // évite de cacher l’UI pendant le chargement pour OWNER grandfather
      if (data.orgRole === 'OWNER') return true;
      return data.permissions.includes(perm);
    },
    [data],
  );

  return { entitlements: data, ready, can, reload };
}
