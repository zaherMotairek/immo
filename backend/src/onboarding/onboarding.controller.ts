import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { OnboardingService } from './onboarding.service';

@Controller('me/onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get()
  status(@CurrentUser() user: JwtAuthUser) {
    return this.onboarding.getStatus(user.organizationId);
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
}
