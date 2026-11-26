import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReminderOutboxStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgPermGuard } from '../auth/org-perm.guard';
import { RequireOrgPerm } from '../auth/require-org-perm.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { RemindersService } from './reminders.service';

@Controller('reminders')
@UseGuards(JwtAuthGuard, OrgPermGuard)
export class RemindersController {
  constructor(
    private readonly reminders: RemindersService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: JwtAuthUser,
    @Query('status') status?: ReminderOutboxStatus,
  ) {
    return this.reminders.list(user.organizationId, status ? { status } : undefined);
  }

  @Post('enqueue')
  @RequireOrgPerm('reminders:write')
  async enqueue(@CurrentUser() user: JwtAuthUser) {
    await this.entitlements.assertFeature(user.organizationId, 'reminders');
    return this.reminders.enqueueDueForOrganization(user.organizationId);
  }

  @Post(':id/send-now')
  @RequireOrgPerm('reminders:write')
  async sendNow(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    await this.entitlements.assertFeature(user.organizationId, 'reminders');
    return this.reminders.sendNow(id, user.organizationId, user);
  }

  @Post(':id/skip')
  @RequireOrgPerm('reminders:write')
  skip(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.reminders.skip(id, user.organizationId, user);
  }
}
