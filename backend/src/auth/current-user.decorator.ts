import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtAuthUser } from './jwt-user.types';

/** req.user après JwtAuthGuard — contient organizationId pour le cloisonnement des données. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtAuthUser => {
  const req = ctx.switchToHttp().getRequest<{ user: JwtAuthUser }>();
  return req.user;
});
