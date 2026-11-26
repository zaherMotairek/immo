import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgPermGuard } from '../auth/org-perm.guard';
import { RequireOrgPerm } from '../auth/require-org-perm.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { EntitlementsService } from './entitlements.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { ResetOrgDataDto } from '../onboarding/dto/reset-org-data.dto';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class EntitlementsController {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly onboarding: OnboardingService,
  ) {}

  @Get('entitlements')
  get(@CurrentUser() user: JwtAuthUser) {
    return this.entitlements.getEntitlements(user.organizationId, user.id);
  }

  /** Alias stable (même handler que `/me/onboarding/*`) — données démo / reset. */
  @Post('org-data/seed-rich-demo')
  @UseGuards(OrgPermGuard)
  @RequireOrgPerm('buildings:write')
  seedRichDemo(@CurrentUser() user: JwtAuthUser) {
    return this.onboarding.loadRichDemoYear(user);
  }

  @Post('org-data/reset')
  @UseGuards(OrgPermGuard)
  @RequireOrgPerm('buildings:write')
  resetOrgData(@CurrentUser() user: JwtAuthUser, @Body() dto: ResetOrgDataDto) {
    return this.onboarding.resetOrgData(user, dto);
  }
}
