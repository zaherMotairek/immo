import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReminderOutboxStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { RemindersService } from './reminders.service';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Get()
  list(
    @CurrentUser() user: JwtAuthUser,
    @Query('status') status?: ReminderOutboxStatus,
  ) {
    return this.reminders.list(user.organizationId, status ? { status } : undefined);
  }

  @Post('enqueue')
  enqueue(@CurrentUser() user: JwtAuthUser) {
    return this.reminders.enqueueDueForOrganization(user.organizationId);
  }

  @Post(':id/send-now')
  sendNow(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.reminders.sendNow(id, user.organizationId, user);
  }

  @Post(':id/skip')
  skip(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.reminders.skip(id, user.organizationId, user);
  }
}
