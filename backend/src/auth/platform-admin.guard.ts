import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { JwtAuthUser } from './jwt-user.types';

/** Accès réservé aux comptes `PLATFORM_ADMIN` (création de clients / organisations). */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: JwtAuthUser }>();
    const user = req.user;
    if (!user || user.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Accès réservé à l’administrateur plateforme.');
    }
    return true;
  }
}
