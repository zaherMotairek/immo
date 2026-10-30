import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { EntitlementsService } from './entitlements.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class EntitlementsController {
  constructor(private readonly entitlements: EntitlementsService) {}

  @Get('entitlements')
  get(@CurrentUser() user: JwtAuthUser) {
    return this.entitlements.getEntitlements(user.organizationId, user.id);
  }
}
