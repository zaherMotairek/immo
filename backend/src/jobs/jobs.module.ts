import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsModule } from '../payments/payments.module';
import { LateStatusJob } from './late-status.job';

@Module({
  imports: [ScheduleModule.forRoot(), PaymentsModule],
  providers: [LateStatusJob],
  exports: [LateStatusJob],
})
export class JobsModule {}
