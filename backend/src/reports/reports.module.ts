import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PaymentsModule } from '../payments/payments.module';
import { ChargesModule } from '../charges/charges.module';

@Module({
  imports: [PaymentsModule, ChargesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
