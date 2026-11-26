import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgPermGuard } from '../auth/org-perm.guard';
import { RequireOrgPerm } from '../auth/require-org-perm.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { OnboardingService } from './onboarding.service';
import { ResetOrgDataDto } from './dto/reset-org-data.dto';

@Controller('me/onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get()
  status(@CurrentUser() user: JwtAuthUser) {
    return this.onboarding.getStatus(user.organizationId, user);
  }

  @Post('dismiss')
  dismiss(@CurrentUser() user: JwtAuthUser) {
    return this.onboarding.dismiss(user.organizationId);
  }

  /** Opt-in : jamais automatique sur org prod. */
  @Post('seed-sample')
  seed(@CurrentUser() user: JwtAuthUser) {
    return this.onboarding.seedSampleData(user.organizationId);
  }

  /** 3 biens, 4 baux, loyers janv. → mois en cours (données fictives). */
  @Post('seed-rich-demo')
  @UseGuards(OrgPermGuard)
  @RequireOrgPerm('buildings:write')
  seedRich(@CurrentUser() user: JwtAuthUser) {
    return this.onboarding.loadRichDemoYear(user);
  }

  /** Suppression sélective (OWNER). */
  @Post('reset-data')
  @UseGuards(OrgPermGuard)
  @RequireOrgPerm('buildings:write')
  resetData(@CurrentUser() user: JwtAuthUser, @Body() dto: ResetOrgDataDto) {
    return this.onboarding.resetOrgData(user, dto);
  }
}
