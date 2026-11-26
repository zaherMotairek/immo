import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsModule } from '../payments/payments.module';
import { LeasesModule } from '../leases/leases.module';
import { AutomationModule } from '../automation/automation.module';
import { RemindersModule } from '../reminders/reminders.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { AdminModule } from '../admin/admin.module';
import { DemoModule } from '../demo/demo.module';
import { LateStatusJob } from './late-status.job';
import { RemindersJob, ScheduleExtendJob } from './schedule-extend.job';
import { TrialExpiryJob } from './trial-expiry.job';
import { SubscriptionExpiryNoticeJob } from './subscription-expiry-notice.job';
import { DemoPurgeJob } from './demo-purge.job';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PaymentsModule,
    LeasesModule,
    AutomationModule,
    RemindersModule,
    EntitlementsModule,
    AdminModule,
    DemoModule,
  ],
  providers: [
    LateStatusJob,
    ScheduleExtendJob,
    RemindersJob,
    TrialExpiryJob,
    SubscriptionExpiryNoticeJob,
    DemoPurgeJob,
  ],
  exports: [
    LateStatusJob,
    ScheduleExtendJob,
    RemindersJob,
    TrialExpiryJob,
    SubscriptionExpiryNoticeJob,
    DemoPurgeJob,
  ],
})
export class JobsModule {}
