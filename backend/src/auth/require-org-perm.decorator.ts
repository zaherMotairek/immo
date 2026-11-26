import { SetMetadata } from '@nestjs/common';
import type { OrgPerm } from './org-permissions';

export const ORG_PERMS_KEY = 'orgPerms';

/** Exige au moins une des permissions listées (OU). */
export const RequireOrgPerm = (...perms: OrgPerm[]) => SetMetadata(ORG_PERMS_KEY, perms);
