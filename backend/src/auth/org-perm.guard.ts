import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtAuthUser } from './jwt-user.types';
import { ORG_PERMS_KEY } from './require-org-perm.decorator';
import { orgRoleHasPerm, parseOrgMemberRole, type OrgPerm } from './org-permissions';

@Injectable()
export class OrgPermGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<OrgPerm[] | undefined>(ORG_PERMS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const req = context.switchToHttp().getRequest<{ user?: JwtAuthUser }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('Authentification requise.');

    /** Admin plateforme : accès métier complet sur sa propre org. */
    if (user.role === 'PLATFORM_ADMIN') return true;

    const orgRole = parseOrgMemberRole(user.orgRole);
    const ok = required.some((p) => orgRoleHasPerm(orgRole, p));
    if (!ok) {
      throw new ForbiddenException(
        'Droits insuffisants pour cette action (rôle organisation).',
      );
    }
    return true;
  }
}
