import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('logs')
  list(
    @CurrentUser() user: JwtAuthUser,
    @Query('action') action?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('entityType') entityType?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const n = Number(limitRaw);
    const limit = Number.isInteger(n) ? n : undefined;
    return this.audit.list(user.organizationId, { action, actorUserId, entityType, limit });
  }
}
