import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { JwtAuthUser } from './jwt-user.types';

/** Bloque les mutations HTTP en session impersonation lecture seule (D3). */
@Injectable()
export class ReadOnlyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ method?: string; user?: JwtAuthUser }>();
    const method = (req.method || 'GET').toUpperCase();
    if (req.user?.readOnly && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      throw new ForbiddenException(
        'Session « vue client » en lecture seule — modifications interdites.',
      );
    }
    return next.handle();
  }
}
