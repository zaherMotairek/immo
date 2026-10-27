import type { TableSortDir } from '@/lib/tableSort';

export type Tenant = {
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

export type TenantSortKey = 'tenant' | 'contact' | 'place' | 'lease';

export type TenantSort = {
  key: TenantSortKey;
  dir: TableSortDir;
  onSort: (key: TenantSortKey) => void;
};
