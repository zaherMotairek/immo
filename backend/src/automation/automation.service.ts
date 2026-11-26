import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import {
  DEFAULT_AUTOMATION_SETTINGS,
  OrgAutomationSettings,
  parseAutomationSettings,
} from './org-automation.types';

@Injectable()
export class AutomationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getSettings(organizationId: string): Promise<OrgAutomationSettings> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { automationSettings: true },
    });
    return parseAutomationSettings(org?.automationSettings);
  }

  async updateSettings(
    organizationId: string,
    patch: Partial<Omit<OrgAutomationSettings, 'templates'>> & {
      templates?: Partial<OrgAutomationSettings['templates']>;
    },
    actor?: JwtAuthUser,
  ): Promise<OrgAutomationSettings> {
    const current = await this.getSettings(organizationId);
    const next: OrgAutomationSettings = {
      ...current,
      ...patch,
      templates: { ...current.templates, ...(patch.templates || {}) },
      reminderRules: patch.reminderRules ?? current.reminderRules,
      reminderChannels: patch.reminderChannels ?? current.reminderChannels,
      receiptChannels: patch.receiptChannels ?? current.receiptChannels,
    };
    if (!Array.isArray(next.reminderRules) || next.reminderRules.length > 12) {
      throw new BadRequestException('Règles de relance invalides (max 12).');
    }
    for (const r of next.reminderRules) {
      if (!Number.isInteger(r.offsetDays) || r.offsetDays < -30 || r.offsetDays > 90) {
        throw new BadRequestException('offsetDays doit être un entier entre -30 et 90.');
      }
    }
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { automationSettings: next as unknown as Prisma.InputJsonValue },
    });
    await this.audit.log({
      organizationId,
      actor,
      action: 'ORG_AUTOMATION_SETTINGS_UPDATED',
      entityType: 'organization',
      entityId: organizationId,
      summary: `Automation : schedules=${next.autoGenerateSchedules} relances=${next.autoRemindersEnabled} quittance=${next.autoReceiptEnabled}`,
      metadata: {
        autoGenerateSchedules: next.autoGenerateSchedules,
        autoRemindersEnabled: next.autoRemindersEnabled,
        autoReceiptEnabled: next.autoReceiptEnabled,
      },
    });
    return next;
  }

  defaults(): OrgAutomationSettings {
    return { ...DEFAULT_AUTOMATION_SETTINGS, templates: { ...DEFAULT_AUTOMATION_SETTINGS.templates } };
  }
}
