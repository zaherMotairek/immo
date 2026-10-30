import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgPermGuard } from '../auth/org-perm.guard';
import { RequireOrgPerm } from '../auth/require-org-perm.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { AutomationService } from './automation.service';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { ReminderChannel } from '@prisma/client';

@Controller('automation')
@UseGuards(JwtAuthGuard, OrgPermGuard)
export class AutomationController {
  constructor(private readonly automation: AutomationService) {}

  @Get('settings')
  get(@CurrentUser() user: JwtAuthUser) {
    return this.automation.getSettings(user.organizationId);
  }

  @Patch('settings')
  @RequireOrgPerm('automation:write')
  patch(@CurrentUser() user: JwtAuthUser, @Body() dto: UpdateAutomationDto) {
    return this.automation.updateSettings(
      user.organizationId,
      {
        autoGenerateSchedules: dto.autoGenerateSchedules,
        autoRemindersEnabled: dto.autoRemindersEnabled,
        autoReceiptEnabled: dto.autoReceiptEnabled,
        reminderRules: dto.reminderRules,
        reminderChannels: dto.reminderChannels as ReminderChannel[] | undefined,
        receiptChannels: dto.receiptChannels as ReminderChannel[] | undefined,
        quietHoursStart: dto.quietHoursStart,
        quietHoursEnd: dto.quietHoursEnd,
        templates:
          dto.templates?.reminder != null || dto.templates?.receipt != null
            ? {
                ...(dto.templates.reminder != null ? { reminder: dto.templates.reminder } : {}),
                ...(dto.templates.receipt != null ? { receipt: dto.templates.receipt } : {}),
              }
            : undefined,
      },
      user,
    );
  }
}
