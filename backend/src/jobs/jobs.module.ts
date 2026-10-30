import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsModule } from '../payments/payments.module';
import { LeasesModule } from '../leases/leases.module';
import { AutomationModule } from '../automation/automation.module';
import { RemindersModule } from '../reminders/reminders.module';
import { LateStatusJob } from './late-status.job';
import { RemindersJob, ScheduleExtendJob } from './schedule-extend.job';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PaymentsModule,
    LeasesModule,
    AutomationModule,
    RemindersModule,
  ],
  providers: [LateStatusJob, ScheduleExtendJob, RemindersJob],
  exports: [LateStatusJob, ScheduleExtendJob, RemindersJob],
})
export class JobsModule {}
