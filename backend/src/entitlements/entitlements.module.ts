import { Global, Module } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';
import { EntitlementsController } from './entitlements.controller';
import { OnboardingModule } from '../onboarding/onboarding.module';

@Global()
@Module({
  imports: [OnboardingModule],
  controllers: [EntitlementsController],
  providers: [EntitlementsService],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}
