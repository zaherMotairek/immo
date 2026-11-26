import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { FinanceSummaryService } from './finance-summary.service';
import { FinanceController } from './finance.controller';

@Module({
  imports: [PaymentsModule],
  controllers: [FinanceController],
  providers: [FinanceSummaryService],
  exports: [FinanceSummaryService],
})
export class FinanceModule {}
